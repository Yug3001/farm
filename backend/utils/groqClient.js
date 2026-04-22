/**
 * groqClient.js  –  FarmWise Groq AI integration
 *
 * Exports:
 *   isGroqAvailable()            – returns true if GROQ_API_KEY is set
 *   groqVision(system, user, imageDataUrl)  – vision analysis (image + text)
 *   groqChat(system, user)       – text-only chat completion
 *   parseGroqJSON(text)          – safely parse JSON from model response
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ─── Model names ──────────────────────────────────────────────────────────────
// Vision model  – supports image input
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
// Text model    – fast, cheap, great for JSON
const TEXT_MODEL = 'llama3-8b-8192';

// ─── Availability check ───────────────────────────────────────────────────────
/**
 * @returns {boolean}  true when a Groq API key is present in the environment
 */
function isGroqAvailable() {
  return !!(GROQ_API_KEY && GROQ_API_KEY.trim().length > 10);
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
/**
 * Low-level call to the Groq /v1/chat/completions endpoint.
 * @param {object[]} messages  – array of {role, content} objects
 * @param {string}   model     – model identifier
 * @returns {Promise<string>}  – the assistant text response
 */
async function callGroq(messages, model) {
  if (!isGroqAvailable()) {
    throw new Error('GROQ_API_KEY is not set in environment variables');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 2048,
      temperature: 0.2,       // low temperature → more deterministic JSON output
    }),
  });

  // ── Handle HTTP errors ─────────────────────────────────────────────────────
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '(no body)');
    console.error(`[Groq] HTTP ${response.status}:`, errorBody);

    // Surface actionable messages for common status codes
    if (response.status === 401) {
      throw new Error('Invalid GROQ_API_KEY – check Render environment variables');
    }
    if (response.status === 429) {
      throw new Error('Groq rate limit exceeded – falling back to simulation');
    }
    if (response.status === 400) {
      // Usually means the model doesn't support vision or the image is too large
      throw new Error(`Groq bad request (400): ${errorBody.slice(0, 200)}`);
    }
    throw new Error(`Groq API error ${response.status}: ${errorBody.slice(0, 200)}`);
  }

  const data = await response.json();

  // ── Validate response shape ────────────────────────────────────────────────
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('[Groq] Unexpected response shape:', JSON.stringify(data).slice(0, 300));
    throw new Error('Groq returned an unexpected response format');
  }

  return data.choices[0].message.content;
}

// ─── Vision analysis ──────────────────────────────────────────────────────────
/**
 * Sends an image + text prompt to Groq's vision model.
 *
 * @param {string} systemPrompt  – role: system instruction
 * @param {string} userText      – role: user text message
 * @param {string} imageDataUrl  – full data URL, e.g. "data:image/jpeg;base64,..."
 * @returns {Promise<string>}    – raw text response from the model
 */
async function groqVision(systemPrompt, userText, imageDataUrl) {
  if (!imageDataUrl) throw new Error('imageDataUrl is required for vision analysis');

  // ── Build the image content block ─────────────────────────────────────────
  // Groq follows the OpenAI vision spec: content can be an array of blocks
  const userContent = [
    {
      type: 'image_url',
      image_url: {
        // Accept both raw base64 and full data URLs
        url: imageDataUrl.startsWith('data:')
          ? imageDataUrl
          : `data:image/jpeg;base64,${imageDataUrl}`,
        detail: 'high',       // request high-res analysis
      },
    },
    {
      type: 'text',
      text: userText,
    },
  ];

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];

  console.log('[Groq] Sending vision request…');
  const result = await callGroq(messages, VISION_MODEL);
  console.log('[Groq] Vision response received, length:', result?.length ?? 0);
  return result;
}

// ─── Text-only chat ───────────────────────────────────────────────────────────
/**
 * Sends a plain text prompt (no image) to Groq.
 *
 * @param {string} systemPrompt
 * @param {string} userText
 * @returns {Promise<string>}
 */
async function groqChat(systemPrompt, userText) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userText },
  ];

  console.log('[Groq] Sending chat request…');
  const result = await callGroq(messages, TEXT_MODEL);
  console.log('[Groq] Chat response received');
  return result;
}

// ─── JSON parser ──────────────────────────────────────────────────────────────
/**
 * Safely extracts and parses a JSON object from the model's raw text output.
 * Handles markdown code fences, leading/trailing prose, etc.
 *
 * @param {string} text  – raw model response
 * @returns {object|null}  – parsed object, or null if parsing fails
 */
function parseGroqJSON(text) {
  if (!text || typeof text !== 'string') return null;

  // 1. Strip markdown code fences  (```json … ``` or ``` … ```)
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // 2. Extract the first complete JSON object
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start === -1 || end === -1 || end < start) {
    console.error('[Groq] No JSON object found in response. Preview:', cleaned.slice(0, 300));
    return null;
  }

  cleaned = cleaned.slice(start, end + 1);

  // 3. Parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('[Groq] JSON.parse failed:', e.message);
    console.error('[Groq] Raw snippet:', cleaned.slice(0, 500));
    return null;
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  isGroqAvailable,
  groqVision,
  groqChat,
  parseGroqJSON,
};