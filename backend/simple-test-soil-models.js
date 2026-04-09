const axios = require('axios');

async function run() {
  try {
    const { getGeminiModel } = require('./utils/aiHelper.js');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // List models doesn't seem directly on sdk easily? We can test different model names
    const modelNames = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro-vision', 'gemini-1.5-pro'];
    const fakeImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const parts = [
      { inlineData: { data: fakeImage, mimeType: "image/png" } }
    ];
    const prompt = 'Analyze this image';
    const contentsArray = [prompt, ...parts];

    for (const name of modelNames) {
      try {
        console.log(`Testing model: ${name}`);
        const model = genAI.getGenerativeModel({ model: name });
        let res = await model.generateContent(contentsArray);
        console.log(`SUCCESS for ${name}!`);
      } catch(err) {
        console.log(`FAILED for ${name}: ${err.status} ${err.statusText}`);
      }
    }
  } catch(e) {
    console.error("Test Error:", e);
  }
}

run();
