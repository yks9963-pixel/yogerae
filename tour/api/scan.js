// POST /api/scan — Gemini multimodal proxy: reads the menu photo directly and
// returns translated/structured menu items in one call. Runs server-side only
// on Vercel. GEMINI_API_KEY is read from env vars here and never echoed back
// in the response. The frontend must only ever call this relative endpoint,
// never the Gemini API directly.
const { KOREAN_MENU_TRANSLATOR_V1 } = require("./prompt");

const MAX_BASE64_LENGTH = 4500000; // keeps the JSON body under Vercel's ~4.5MB function payload limit
const GEMINI_TIMEOUT_MS = 25000; // temporarily raised for local timing tests — see README before deploying
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

const TARGET_LANGUAGES = {
  en: "English",
  zh: "Chinese",
  ja: "Japanese"
};

const MIME_TYPES = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

// Mirrors prompt.js's OUTPUT FORMAT exactly, just expressed in Gemini's
// responseSchema syntax — this does not change the JSON contract returned
// to the frontend, it only makes Gemini's own output more reliably shaped.
const MENU_ITEMS_RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      original_ko: { type: "STRING" },
      romanization: { type: "STRING" },
      translated_name: { type: "STRING" },
      description: { type: "STRING" },
      price_krw: { type: "INTEGER", nullable: true },
      spice_level: { type: "INTEGER" },
      main_ingredients: { type: "ARRAY", items: { type: "STRING" } },
      allergens: { type: "ARRAY", items: { type: "STRING" } },
      dietary: {
        type: "OBJECT",
        properties: {
          vegetarian: { type: "BOOLEAN" },
          vegan: { type: "BOOLEAN" },
          halal_friendly: { type: "BOOLEAN" },
          contains_pork: { type: "BOOLEAN" },
          contains_beef: { type: "BOOLEAN" },
          contains_alcohol: { type: "BOOLEAN" }
        },
        required: ["vegetarian", "vegan", "halal_friendly", "contains_pork", "contains_beef", "contains_alcohol"]
      },
      ocr_confidence: { type: "STRING" }
    },
    required: ["original_ko", "romanization", "translated_name", "description", "spice_level", "main_ingredients", "allergens", "dietary"]
  }
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

  const imageType = detectImageType(base64Data);
  if (!imageType) {
    return sendError(res, 400, "INVALID_IMAGE", "Only JPEG, PNG, or WebP images are supported.");
  }

  const targetLanguageName = TARGET_LANGUAGES[targetLang] || TARGET_LANGUAGES.en;

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return sendError(res, 500, "SERVER_MISCONFIGURED", "Server is not configured correctly.");
  }

  let items;
  try {
    items = await withTimeout(
      runGeminiMenuRead(base64Data, MIME_TYPES[imageType], targetLanguageName, geminiApiKey),
      GEMINI_TIMEOUT_MS,
      "TIMEOUT"
    );
  } catch (err) {
    const status = err.code === "TIMEOUT" ? 504 : 502;
    return sendError(res, status, err.code || "GEMINI_API_ERROR", "Could not read or translate the menu.");
  }

  if (items.length === 0) {
    return sendError(res, 422, "NO_TEXT_DETECTED", "No menu items were found in the image.");
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
      reject(Object.assign(new Error("Timed out"), { code: timeoutCode }));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function runGeminiMenuRead(base64Image, mimeType, targetLanguageName, apiKey) {
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const startedAt = Date.now();
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: KOREAN_MENU_TRANSLATOR_V1 }]
      },
      contents: [
        {
          role: "user",
          parts: [
            { text: `target_language: ${targetLanguageName}` },
            { inline_data: { mime_type: mimeType, data: base64Image } }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: MENU_ITEMS_RESPONSE_SCHEMA
      }
    })
  });
  console.log(`[scan] Gemini fetch took ${Date.now() - startedAt}ms (model=${model}, http ${response.status})`);

  if (!response.ok) {
    throw Object.assign(new Error("Gemini API error"), { code: "GEMINI_API_ERROR" });
  }

  const data = await response.json();
  const candidate = data && Array.isArray(data.candidates) ? data.candidates[0] : null;
  const part = candidate && candidate.content && Array.isArray(candidate.content.parts) ? candidate.content.parts[0] : null;
  const rawText = part && typeof part.text === "string" ? part.text : "";

  if (!rawText) {
    throw Object.assign(new Error("Gemini returned no content"), { code: "GEMINI_API_ERROR" });
  }

  let items;
  try {
    items = JSON.parse(extractJsonArray(rawText));
  } catch (e) {
    throw Object.assign(new Error("Could not parse Gemini response"), { code: "GEMINI_PARSE_ERROR" });
  }

  if (!Array.isArray(items)) {
    throw Object.assign(new Error("Gemini response was not an array"), { code: "GEMINI_PARSE_ERROR" });
  }

  console.log(`[scan] Gemini end-to-end (fetch+parse) took ${Date.now() - startedAt}ms, ${items.length} item(s)`);
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
