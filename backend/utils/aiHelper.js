/**
 * AI Helper Utilities for FarmWise
 *
 * Legacy stub — routes now call groqClient.js directly.
 * Kept for backward-compat so any old import doesn't break.
 */

/**
 * Stub — always rejects so routes use their local fallbacks.
 * Modern routes should use groqChat / groqVision from groqClient.js.
 * @returns {Promise<never>}
 */
async function generateWithRetry() {
  console.log('[AI] Using Groq AI or local fallback.');
  throw new Error('Use groqClient.js directly — this stub always rejects.');
}

/**
 * Safely parse JSON from an AI response text.
 * Strips markdown fences and trims.
 * @param {string} text
 * @returns {object}
 */
function parseGeminiJson(text) {
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const jsonStart = cleaned.indexOf('{');
  const jsonEnd   = cleaned.lastIndexOf('}');
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
  generateWithRetry,
  parseGeminiJson,
  validateStructure,
};
