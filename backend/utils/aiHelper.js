/**
 * AI Helper Utilities for FarmWise
 * Provides robust Gemini AI integration with retry logic,
 * JSON validation, and structured error handling.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Initialize Gemini model (singleton per key)
 */
function getGeminiModel(modelName = 'gemini-1.5-flash') {
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
async function generateWithRetry(prompt, parts = [], retries = 2) {
  const model = getGeminiModel();
  const contents = parts.length > 0 ? [prompt, ...parts] : [prompt];

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(contents);
      const response = await result.response;
      const text = response.text();
      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini');
      }
      return text.trim();
    } catch (err) {
      const isLast = attempt === retries;
      if (isLast) throw err;

      // Check for quota / rate-limit errors — don't retry those
      const errMsg = err.message || '';
      if (
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('quota') ||
        errMsg.includes('API key')
      ) {
        throw err;
      }

      // Exponential back-off
      const wait = 500 * Math.pow(2, attempt);
      console.warn(`[AI] Attempt ${attempt + 1} failed, retrying in ${wait}ms…`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
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
