const axios = require('axios');
const fs = require('fs');

async function run() {
  try {
    const { getGeminiModel } = require('./utils/aiHelper.js');
    const model = getGeminiModel();
    const fakeImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const parts = [
      {
        inlineData: { data: fakeImage, mimeType: "image/png" }
      }
    ];
    const prompt = 'Analyze this image';
    
    // Using original array format
    const contentsArray = [prompt, ...parts];
    console.log("Trying array format...");
    let res = await model.generateContent(contentsArray);
    console.log("Result using array:", res.response.text());
    
  } catch(e) {
    console.error("Test Error:", e);
  }
}

run();
