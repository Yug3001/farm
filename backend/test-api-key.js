// Quick test script to verify Gemini API key is working
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testAPIKey() {
    console.log('\n🔑 Testing Gemini API Key...\n');

    // Check if key exists
    if (!process.env.GEMINI_API_KEY) {
        console.log('❌ GEMINI_API_KEY not found in environment variables');
        console.log('   Make sure .env file exists and contains GEMINI_API_KEY');
        return;
    }

    console.log('✅ API Key found in .env file');
    console.log('   Key starts with:', process.env.GEMINI_API_KEY.substring(0, 10) + '...');

    try {
        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        console.log('\n🧪 Testing API connection with simple prompt...\n');

        // Simple test prompt
        const result = await model.generateContent("Say 'API is working!' in exactly 3 words.");
        const response = await result.response;
        const text = response.text();

        console.log('✅ API Response received:');
        console.log('   ' + text);
        console.log('\n🎉 SUCCESS! Your Gemini API key is working correctly!\n');
        console.log('   The repeated responses issue is likely due to:');
        console.log('   1. Backend server not restarted after .env was created');
        console.log('   2. Image data not being sent correctly from frontend');
        console.log('   3. Image data format issue\n');
        console.log('   Check the backend logs when you perform an analysis.\n');

    } catch (error) {
        console.log('❌ API Test Failed!');
        console.log('   Error:', error.message);
        console.log('\n   Possible causes:');
        console.log('   - Invalid or expired API key');
        console.log('   - API quota exceeded');
        console.log('   - Network connectivity issues');
        console.log('   - API key doesn\'t have proper permissions\n');
        console.log('   Solution: Generate a new API key from:');
        console.log('   https://aistudio.google.com/app/apikey\n');
    }
}

testAPIKey();
