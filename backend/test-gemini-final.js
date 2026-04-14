require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODEL = 'gemini-flash-latest';

async function testTextGeneration() {
  console.log('\n─── TEST 1: Text Generation (Advisor) ───');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL });

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [{ text: 'What is the best fertilizer for wheat in Rabi season? Answer in 2 sentences.' }]
    }]
  });
  const text = result.response.text();
  console.log('✅ Advisor response:', text.substring(0, 200) + '...');
}

async function testVisionAnalysis() {
  console.log('\n─── TEST 2: Vision Analysis (Soil/Crop) ───');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL });

  // Minimal 1x1 red pixel PNG (base64)
  const fakeImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg==';

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [
        { text: 'Describe this image in one sentence.' },
        { inlineData: { data: fakeImage, mimeType: 'image/png' } }
      ]
    }]
  });
  const text = result.response.text();
  console.log('✅ Vision response:', text.trim());
}

async function run() {
  console.log('🔑 API Key present:', !!process.env.GEMINI_API_KEY);
  console.log('🤖 Model:', MODEL);

  try {
    await testTextGeneration();
    await testVisionAnalysis();
    console.log('\n🎉 ALL TESTS PASSED — Gemini API is working correctly!');
    console.log('✅ Your app can now use AI for:');
    console.log('   • Advisor chatbot (/api/advisor/ask)');
    console.log('   • Soil image analysis (/api/soil/analyze)');
    console.log('   • Crop disease detection (/api/crop/analyze)');
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
  }
}

run();
