const Groq = require('groq-sdk');

let _client = null;

/**
 * Returns a singleton Groq client, or null if no API key is configured.
 */
function getGroqClient() {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.trim() === '') {
    return null;
  }
  if (!_client) {
    _client = new Groq({ apiKey: key });
    console.log('🤖 Groq client initialised successfully');
  }
  return _client;
}

/**
 * Check if Groq is available (key is configured).
 */
function isGroqAvailable() {
  return getGroqClient() !== null;
}

/**
 * Send a chat message to Groq (text only).
 * Returns the response text or null on failure.
 */
async function groqChat(systemPrompt, userMessage, model = 'llama-3.3-70b-versatile') {
  const client = getGroqClient();
  if (!client) return null;

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.65,
      max_tokens: 1024,
    });
    return completion.choices[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error('[Groq] Chat error:', err.message);
    return null;
  }
}

/**
 * Send an image + text prompt to Groq vision model.
 * imageDataUrl: full data URL (data:image/jpeg;base64,…)
 * Returns the response text or null on failure.
 */
async function groqVision(systemPrompt, userText, imageDataUrl, model = 'meta-llama/llama-4-scout-17b-16e-instruct') {
  const client = getGroqClient();
  if (!client) return null;

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });
    return completion.choices[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error('[Groq] Vision error:', err.message);
    return null;
  }
}

/**
 * Parse a JSON block from Groq's response (handles markdown code fences).
 */
function parseGroqJSON(text) {
  if (!text) return null;
  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON object from text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

module.exports = { getGroqClient, isGroqAvailable, groqChat, groqVision, parseGroqJSON };
