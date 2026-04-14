const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function test() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  try {
    const result = await model.generateContent("hello, is this model working?");
    console.log("Success:", result.response.text());
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
