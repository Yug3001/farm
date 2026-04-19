/**
 * AI Helper Utilities for FarmWise
 * Provides robust Gemini AI integration with retry logic,
 * JSON validation, and structured error handling.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Model fallback chain — tried in order until one works
const MODEL_FALLBACK_CHAIN = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-pro',
];

/**
 * Initialize Gemini model
 * @param {string} modelName - specific model, or uses first in fallback chain
 */
function getGeminiModel(modelName = MODEL_FALLBACK_CHAIN[0]) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: modelName });
}

/**
 * Generate text from Gemini with retry logic
 * @param {string} prompt
 * @param {Array}  parts - optional array of inline data parts (for vision)
 * @param {number} retries
 * @returns {string} raw text from model
 */
async function generateWithRetry(prompt, parts = [], retries = 1) {
  // Build a proper parts array: text prompt first, then any inline data (images, etc.)
  const contentParts = [
    { text: prompt },
    ...parts
  ];

  // Try each model in the fallback chain
  for (const modelName of MODEL_FALLBACK_CHAIN) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const model = getGeminiModel(modelName);
        console.log(`[AI] Trying model: ${modelName} (attempt ${attempt + 1})`);
        const result = await model.generateContent({ contents: [{ role: 'user', parts: contentParts }] });
        const response = result.response;
        const text = response.text();
        if (!text || text.trim().length === 0) {
          throw new Error('Empty response from Gemini');
        }
        console.log(`[AI] ✅ Success with model: ${modelName}`);
        return text.trim();
      } catch (err) {
        const errMsg = err.message || '';
        const status = err.status || 0;

        // 404 = model not found for this API key tier — skip to next model immediately
        if (status === 404 || errMsg.includes('not found') || errMsg.includes('not supported')) {
          console.warn(`[AI] ⚠️ Model ${modelName} not available (404), trying next…`);
          break; // break inner retry loop, try next model
        }

        // 503 = model overloaded — skip to next model
        if (status === 503 || errMsg.includes('Service Unavailable') || errMsg.includes('high demand')) {
          console.warn(`[AI] ⚠️ Model ${modelName} overloaded (503), trying next…`);
          break;
        }

        // 429 = quota exhausted — no point retrying any model
        if (status === 429 || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota') || errMsg.includes('Too Many Requests')) {
          console.error(`[AI] ❌ Quota exhausted (429). Falling back to local knowledge base.`);
          throw Object.assign(err, { quotaExhausted: true });
        }

        // API key invalid
        if (errMsg.includes('API key') || status === 400) {
          console.error(`[AI] ❌ Invalid API key.`);
          throw err;
        }

        // Last attempt for this model — try next model
        if (attempt === retries) {
          console.warn(`[AI] ⚠️ Model ${modelName} failed after ${retries + 1} attempts, trying next model…`);
          break;
        }

        // Exponential back-off between retries
        const wait = 500 * Math.pow(2, attempt);
        console.warn(`[AI] Attempt ${attempt + 1} failed, retrying in ${wait}ms…`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }

  // All models failed
  throw new Error('All Gemini models unavailable. Using fallback response.');
}

/**
 * Safely parse JSON from Gemini response text.
 * Strips markdown fences (```json … ```) and trims.
 * @param {string} text
 * @returns {object}
 */
function parseGeminiJson(text) {
  // Remove markdown code fences if present
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // If the response contains explanatory text before/after JSON, extract just the JSON
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('[AI] JSON parse failed. Raw text:\n', text.slice(0, 500));
    throw new Error('AI returned invalid JSON. Please try again.');
  }
}

/**
 * Validate that a parsed object contains the required keys.
 * @param {object} obj
 * @param {string[]} requiredKeys
 * @returns {boolean}
 */
function validateStructure(obj, requiredKeys) {
  if (!obj || typeof obj !== 'object') return false;
  return requiredKeys.every((key) => key in obj);
}

module.exports = {
  getGeminiModel,
  generateWithRetry,
  parseGeminiJson,
  validateStructure,
};
