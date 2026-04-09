require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Try models in order of preference until one works
const MODELS_TO_TRY = [
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-2.0-flash',
  'gemini-flash-latest',
];

async function testModel(modelName) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [{ text: 'Reply only: "OK"' }]
    }]
  });
  return result.response.text().trim();
}

async function run() {
  console.log('🔑 API Key present:', !!process.env.GEMINI_API_KEY);
  for (const model of MODELS_TO_TRY) {
    process.stdout.write(`Testing ${model}... `);
    try {
      const reply = await testModel(model);
      console.log(`✅ WORKS! Response: "${reply}"`);
    } catch (err) {
      if (err.message.includes('429') || err.message.includes('quota')) {
        console.log('⚠️  Quota exhausted (model exists but free tier limit hit)');
      } else if (err.message.includes('404') || err.message.includes('not found')) {
        console.log('❌ Model not found');
      } else {
        console.log('❌ Error:', err.message.substring(0, 100));
      }
    }
    // Small delay between tests
    await new Promise(r => setTimeout(r, 1000));
  }
}

run();
