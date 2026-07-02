// POST /api/scan — Gemini multimodal proxy: reads the menu photo directly and
// returns translated/structured menu items in one call. Runs server-side only
// on Vercel. GEMINI_API_KEY is read from env vars here and never echoed back
// in the response. The frontend must only ever call this relative endpoint,
// never the Gemini API directly.
const { KOREAN_MENU_TRANSLATOR_V1 } = require("./prompt");

const MAX_BASE64_LENGTH = 4500000; // keeps the JSON body under Vercel's ~4.5MB function payload limit
const GEMINI_TIMEOUT_MS = 25000; // temporarily raised for local timing tests — see README before deploying
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

const LOCALHOST_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const RATE_LIMIT_MAX = 5; // requests per IP per window
const RATE_LIMIT_WINDOW_SECONDS = 60;
const KV_TIMEOUT_MS = 1500;

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

  const requestOrigin = getRequestOrigin(req);
  if (!isOriginAllowed(requestOrigin)) {
    console.warn(`[scan] blocked request from disallowed origin: ${requestOrigin || "(none)"}`);
    return sendError(res, 403, "FORBIDDEN_ORIGIN", "This origin is not allowed to use this API.");
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

  const clientIp = getClientIp(req);
  const rateLimitResult = await checkRateLimit(clientIp);
  if (rateLimitResult.limited) {
    console.warn(`[scan] rate limit exceeded for ip=${clientIp}`);
    return sendError(res, 429, "RATE_LIMITED", "Too many requests. Please try again in a minute.");
  }

  const targetLanguageName = TARGET_LANGUAGES[targetLang] || TARGET_LANGUAGES.en;

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return sendError(res, 500, "SERVER_MISCONFIGURED", "Server is not configured correctly.");
  }

  const decodedByteLength = Math.ceil((base64Data.length * 3) / 4);
  console.log(
    `[scan] request accepted: base64 length=${base64Data.length} chars (~${decodedByteLength} bytes decoded), ` +
      `type=${imageType}, targetLang=${targetLang || "en"}`
  );

  const requestStartedAt = Date.now();
  let items;
  try {
    items = await withTimeout(
      runGeminiMenuRead(base64Data, MIME_TYPES[imageType], targetLanguageName, geminiApiKey),
      GEMINI_TIMEOUT_MS,
      "TIMEOUT"
    );
  } catch (err) {
    console.error(
      `[scan] Gemini call failed after ${Date.now() - requestStartedAt}ms: code=${err.code || "UNKNOWN"} message=${err.message}`
    );
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

function getRequestOrigin(req) {
  const originHeader = req.headers.origin;
  if (originHeader) return originHeader;

  const referer = req.headers.referer || req.headers.referrer;
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch (e) {
      return null;
    }
  }

  return null;
}

function isOriginAllowed(origin) {
  if (!origin) return false;
  if (LOCALHOST_ORIGIN_RE.test(origin)) return true;

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return allowedOrigins.indexOf(origin) !== -1;
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    return String(forwardedFor).split(",")[0].trim();
  }
  if (req.headers["x-real-ip"]) {
    return String(req.headers["x-real-ip"]);
  }
  return "unknown";
}

// Vercel KV (Upstash Redis) REST API, called with plain fetch — no SDK
// dependency needed. Supports both the native "Vercel KV" env var names and
// the "Upstash for Redis" marketplace integration's names, since either may
// show up depending on how the storage was provisioned. If neither is
// configured, or any KV call fails/times out, rate limiting fails OPEN
// (the request is allowed through) so a KV outage never breaks scanning.
function getKvConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function checkRateLimit(ip) {
  const kv = getKvConfig();
  if (!kv) {
    console.warn("[scan] rate limiting skipped: no KV configured (fail-open)");
    return { limited: false };
  }

  try {
    const windowBucket = Math.floor(Date.now() / (RATE_LIMIT_WINDOW_SECONDS * 1000));
    const key = `ratelimit:scan:${ip}:${windowBucket}`;

    const count = await withTimeout(kvIncr(kv, key), KV_TIMEOUT_MS, "KV_TIMEOUT");

    if (count === 1) {
      // First hit for this IP in this window — set a TTL so the key doesn't
      // linger forever. Awaited (not fire-and-forget): once this function
      // returns its HTTP response, Vercel may freeze/kill any still-pending
      // async work, so an un-awaited EXPIRE could simply never happen.
      try {
        await withTimeout(kvExpire(kv, key, RATE_LIMIT_WINDOW_SECONDS + 30), KV_TIMEOUT_MS, "KV_TIMEOUT");
      } catch (expireErr) {
        console.warn(`[scan] rate limit EXPIRE failed for ${key}: ${expireErr.message}`);
      }
    }

    return { limited: count > RATE_LIMIT_MAX };
  } catch (err) {
    console.warn(`[scan] rate limit check failed, allowing request (fail-open): ${err.message}`);
    return { limited: false };
  }
}

async function kvIncr(kv, key) {
  const response = await fetch(`${kv.url}/incr/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${kv.token}` }
  });
  if (!response.ok) {
    throw new Error(`KV INCR failed with status ${response.status}`);
  }
  const data = await response.json();
  const count = typeof data.result === "number" ? data.result : Number(data.result);
  if (!Number.isFinite(count)) {
    throw new Error("KV INCR returned a non-numeric result");
  }
  return count;
}

async function kvExpire(kv, key, seconds) {
  const response = await fetch(`${kv.url}/expire/${encodeURIComponent(key)}/${seconds}`, {
    headers: { Authorization: `Bearer ${kv.token}` }
  });
  if (!response.ok) {
    throw new Error(`KV EXPIRE failed with status ${response.status}`);
  }
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
