// Simple API key test
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
    console.log('API Key exists:', !!process.env.GEMINI_API_KEY);

    if (!process.env.GEMINI_API_KEY) {
        console.log('ERROR: No API key found');
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        const response = await result.response;
        console.log('SUCCESS: API is working');
        console.log('Response:', response.text().substring(0, 50));
    } catch (error) {
        console.log('ERROR:', error.message);
    }
}

test();
