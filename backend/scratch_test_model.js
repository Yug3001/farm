const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-pro',
];

async function test() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY not set in .env file');
    return;
  }
  console.log('API Key present:', process.env.GEMINI_API_KEY.slice(0, 8) + '...');

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  for (const modelName of MODELS) {
    const model = genAI.getGenerativeModel({ model: modelName });
    try {
      console.log(`\nTrying model: ${modelName}...`);
      const result = await model.generateContent('Say "Hello, FarmWise!" in one sentence.');
      console.log(`✅ ${modelName} WORKS:`, result.response.text().slice(0, 80));
      break; // Found a working model
    } catch (e) {
      console.error(`❌ ${modelName} FAILED [${e.status || 'unknown'}]:`, e.message.slice(0, 120));
    }
  }
}

test();
