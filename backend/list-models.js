require('dotenv').config();
const https = require('https');

const key = process.env.GEMINI_API_KEY;
if (!key) { console.error('No API key found'); process.exit(1); }

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.error) {
        console.error('API Error:', json.error.message);
        return;
      }
      console.log('\n✅ Models supporting generateContent:\n');
      json.models
        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
        .forEach(m => console.log(' •', m.name, '-', m.displayName));
    } catch(e) {
      console.error('Parse error:', e.message, '\nRaw:', data.slice(0, 300));
    }
  });
}).on('error', e => console.error('Network error:', e.message));
