/**
 * AI Helper Utilities for FarmWise
 *
 * ⚠️  Offline Mode — Gemini API integration is disabled.
 * All AI entry-points immediately throw so callers fall through
 * to their rich local knowledge-base / simulation fallbacks.
 *
 * To re-enable Gemini: set GEMINI_API_KEY in .env and restore
 * the original implementation from git history.
 */

/**
 * Stub — always rejects so routes use their local fallbacks.
 * @returns {Promise<never>}
 */
async function generateWithRetry() {
  console.log('[AI] 🔕 Offline mode — using local knowledge base / simulation.');
  throw new Error('AI offline — using local fallback.');
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
