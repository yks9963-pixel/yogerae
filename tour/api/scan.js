// POST /api/scan — OCR (Google Vision) + translation (Claude) proxy.
// Runs server-side only on Vercel. API keys are read from env vars here and
// never echoed back in the response. The frontend must only ever call this
// relative endpoint, never Vision/Claude directly.
const { KOREAN_MENU_TRANSLATOR_V1 } = require("./prompt");

const MAX_BASE64_LENGTH = 4500000; // keeps the JSON body under Vercel's ~4.5MB function payload limit
const VISION_TIMEOUT_MS = 4000;
const CLAUDE_TIMEOUT_MS = 5000; // worst case ~9s total, under the Hobby plan's 10s function limit
const DEFAULT_CLAUDE_MODEL = "claude-haiku-4-5-20251001";

const TARGET_LANGUAGES = {
  en: "English",
  zh: "Chinese",
  ja: "Japanese"
};

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendError(res, 405, "METHOD_NOT_ALLOWED", "Only POST is supported.");
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return sendError(res, 400, "INVALID_JSON", "Request body must be valid JSON.");
    }
  }
  if (!body || typeof body !== "object") {
    return sendError(res, 400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const { image, targetLang } = body;

  if (!image || typeof image !== "string") {
    return sendError(res, 400, "INVALID_IMAGE", "An image is required.");
  }

  const base64Data = stripDataUrlPrefix(image);

  if (base64Data.length === 0 || base64Data.length > MAX_BASE64_LENGTH || !isLikelyBase64(base64Data)) {
    return sendError(res, 400, "INVALID_IMAGE", "Image is missing, too large, or not valid base64.");
  }

  if (!detectImageType(base64Data)) {
    return sendError(res, 400, "INVALID_IMAGE", "Only JPEG, PNG, or WebP images are supported.");
  }

  const targetLanguageName = TARGET_LANGUAGES[targetLang] || TARGET_LANGUAGES.en;

  const visionApiKey = process.env.GOOGLE_VISION_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!visionApiKey || !anthropicApiKey) {
    return sendError(res, 500, "SERVER_MISCONFIGURED", "Server is not configured correctly.");
  }

  let menuText;
  try {
    menuText = await withTimeout(runVisionOcr(base64Data, visionApiKey), VISION_TIMEOUT_MS, "VISION_API_ERROR");
  } catch (err) {
    const status = err.code === "TIMEOUT" ? 504 : 502;
    return sendError(res, status, err.code || "VISION_API_ERROR", "Could not read text from the image.");
  }

  if (!menuText || !menuText.trim()) {
    return sendError(res, 422, "NO_TEXT_DETECTED", "No menu text was found in the image.");
  }

  let items;
  try {
    items = await withTimeout(
      runClaudeTranslation(menuText, targetLanguageName, anthropicApiKey),
      CLAUDE_TIMEOUT_MS,
      "TRANSLATION_API_ERROR"
    );
  } catch (err) {
    const status = err.code === "TIMEOUT" ? 504 : 502;
    return sendError(res, status, err.code || "TRANSLATION_API_ERROR", "Could not translate the menu.");
  }

  return res.status(200).json({ items });
};

function stripDataUrlPrefix(image) {
  const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.*)$/.exec(image);
  return match ? match[1] : image;
}

function isLikelyBase64(str) {
  return /^[A-Za-z0-9+/]+={0,2}$/.test(str) && str.length % 4 === 0;
}

function detectImageType(base64) {
  const header = Buffer.from(base64.slice(0, 16), "base64");
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return "jpeg";
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) return "png";
  if (header.slice(0, 4).toString("ascii") === "RIFF" && header.slice(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

async function withTimeout(promise, ms, timeoutCode) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(Object.assign(new Error("Timed out"), { code: "TIMEOUT" }));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function runVisionOcr(base64Image, apiKey) {
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: base64Image },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }]
        }
      ]
    })
  });

  if (!response.ok) {
    throw Object.assign(new Error("Vision API error"), { code: "VISION_API_ERROR" });
  }

  const data = await response.json();
  const annotation = data && data.responses && data.responses[0];
  if (annotation && annotation.error) {
    throw Object.assign(new Error(annotation.error.message || "Vision API error"), { code: "VISION_API_ERROR" });
  }
  return (annotation && annotation.fullTextAnnotation && annotation.fullTextAnnotation.text) || "";
}

async function runClaudeTranslation(menuText, targetLanguageName, apiKey) {
  const model = process.env.CLAUDE_MODEL || DEFAULT_CLAUDE_MODEL;
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: KOREAN_MENU_TRANSLATOR_V1,
      messages: [
        {
          role: "user",
          content: `target_language: ${targetLanguageName}\n\nmenu_text:\n${menuText}`
        }
      ]
    })
  });

  if (!response.ok) {
    throw Object.assign(new Error("Claude API error"), { code: "TRANSLATION_API_ERROR" });
  }

  const data = await response.json();
  const textBlock = Array.isArray(data.content) ? data.content.find((block) => block.type === "text") : null;
  const rawText = textBlock ? textBlock.text : "";

  let items;
  try {
    items = JSON.parse(extractJsonArray(rawText));
  } catch (e) {
    throw Object.assign(new Error("Could not parse translation response"), { code: "TRANSLATION_PARSE_ERROR" });
  }

  if (!Array.isArray(items)) {
    throw Object.assign(new Error("Translation response was not an array"), { code: "TRANSLATION_PARSE_ERROR" });
  }

  return items;
}

function extractJsonArray(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    return text;
  }
  return text.slice(start, end + 1);
}

function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}
