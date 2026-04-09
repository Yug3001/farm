async function run() {
  try {
    const { generateWithRetry } = require('./utils/aiHelper.js');
    const fakeImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const parts = [
      { inlineData: { data: fakeImage, mimeType: "image/png" } }
    ];
    const prompt = 'Analyze this image';
    console.log("Calling generateWithRetry...");
    const res = await generateWithRetry(prompt, parts, 1);
    console.log("SUCCESS:", res);
  } catch(e) {
    console.error("Test Error:", e);
  }
}
run();
