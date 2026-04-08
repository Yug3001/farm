const express = require('express');
const router = express.Router();
const SoilAnalysis = require('../models/SoilAnalysis');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { generateWithRetry, parseGeminiJson, validateStructure } = require('../utils/aiHelper');

// Analyze soil sample
router.post('/analyze', authMiddleware, async (req, res) => {
  try {
    const { imageData, location, notes, language = 'en' } = req.body;

    // Debug logging
    console.log('🔍 Soil Analysis Request Received');
    console.log('API Key Present:', !!process.env.GEMINI_API_KEY);
    console.log('Image Data Present:', !!imageData);
    console.log('Image Data Valid:', imageData && imageData.startsWith('data:image'));
    console.log('Language:', language);

    // Language name mapping
    const languageNames = {
      'en': 'English',
      'hi': 'Hindi (हिंदी)',
      'gu': 'Gujarati (ગુજરાતી)',
      'mr': 'Marathi (मराठी)'
    };

    const responseLang = languageNames[language] || 'English';
    let analysisData = {};

    // Use Gemini AI if Key is available and valid image data provided
    if (process.env.GEMINI_API_KEY && imageData && imageData.startsWith('data:image')) {
      console.log('✅ Using AI Analysis (Gemini)');

      try {
        const base64Data = imageData.split(',')[1];
        const mimeType = imageData.split(';')[0].split(':')[1];

        const imagePart = {
          inlineData: { data: base64Data, mimeType }
        };

        const prompt = `You are an expert soil scientist AI specializing in Indian agriculture.
Carefully analyze this soil image and provide a precise agricultural assessment.

🌐 LANGUAGE: Respond with ALL values in ${responseLang} ONLY.
JSON keys must remain in English; only VALUES are translated.

ANALYSIS INSTRUCTIONS:
1. Examine soil color carefully (dark = organic, red = iron, pale = low fertility)
2. Estimate texture from visual cues (clay = smooth/sticky, sandy = grainy, loam = balanced)
3. Assess moisture from color saturation and surface appearance
4. Estimate organic matter from darkness/richness
5. Derive pH range from color and likely soil type
6. Recommend NPK levels based on soil type and appearance
7. Suggest region-appropriate Indian crops for this soil type
8. Give practical, actionable improvement steps

Return STRICT valid JSON only (no markdown, no prose):
{
  "soilType": "specific soil type name in ${responseLang}",
  "texture": "detailed texture description in ${responseLang}",
  "color": "specific color description (Munsell-style if possible) in ${responseLang}",
  "moisture": "moisture level estimate with percentage in ${responseLang}",
  "organicMatter": "organic matter level with percentage in ${responseLang}",
  "ph": { "value": "estimated pH value like 6.5", "category": "acidic/neutral/alkaline in ${responseLang}" },
  "nutrients": {
    "nitrogen": "level (Low/Medium/High) with ppm estimate in ${responseLang}",
    "phosphorus": "level (Low/Medium/High) with ppm estimate in ${responseLang}",
    "potassium": "level (Low/Medium/High) with ppm estimate in ${responseLang}"
  },
  "recommendations": ["specific recommendation 1 in ${responseLang}", "specific recommendation 2 in ${responseLang}", "specific recommendation 3 in ${responseLang}"],
  "suitableCrops": ["crop 1 in ${responseLang}", "crop 2 in ${responseLang}", "crop 3 in ${responseLang}", "crop 4 in ${responseLang}"],
  "improvements": ["specific improvement 1 with dosage in ${responseLang}", "specific improvement 2 in ${responseLang}", "specific improvement 3 in ${responseLang}"]
}

If the image is clearly NOT soil (e.g. a person, food, object), return:
{ "error": "Invalid image: not a soil sample. Please upload a clear photo of soil." }`;

        const rawText = await generateWithRetry(prompt, [imagePart]);
        const aiAnalysis = parseGeminiJson(rawText);

        if (aiAnalysis.error) {
          return res.json({ success: false, error: aiAnalysis.error });
        }

        // Validate required fields
        const required = ['soilType', 'texture', 'ph', 'nutrients', 'recommendations', 'suitableCrops'];
        if (!validateStructure(aiAnalysis, required)) {
          console.warn('[Soil] AI response missing required fields, using simulation fallback');
          analysisData = getSimulatedAnalysis(language);
        } else {
          analysisData = aiAnalysis;
          console.log('✅ AI Analysis Successful');
        }

      } catch (aiError) {
        console.error('❌ AI Analysis failed:', aiError.message);
        console.log('⚠️ Falling back to simulation mode');
        analysisData = getSimulatedAnalysis(language);
      }
    } else {
      console.log('⚠️ Using Fallback Mode (Simulation)');
      analysisData = getSimulatedAnalysis(language);
    }

    // Save to database
    const soilAnalysis = new SoilAnalysis({
      userId: req.user._id,
      imageUrl: imageData,
      analysis: analysisData,
      location: location || '',
      notes: notes || ''
    });

    await soilAnalysis.save();

    // Track usage in MongoDB (fire-and-forget)
    User.findById(req.user._id)
      .then(u => u?.trackUsage('soil'))
      .catch(err => console.warn('[DB] trackUsage failed:', err.message));

    res.json({ success: true, analysis: soilAnalysis });

  } catch (error) {
    console.error('Soil analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all soil analyses for a user
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { limit = 10, skip = 0 } = req.query;

    const analyses = await SoilAnalysis.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await SoilAnalysis.countDocuments({ userId: req.user._id });

    res.json({
      success: true,
      analyses,
      total,
      hasMore: total > parseInt(skip) + parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific soil analysis
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const analysis = await SoilAnalysis.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json({ success: true, analysis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a soil analysis
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const analysis = await SoilAnalysis.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json({ success: true, message: 'Analysis deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function for simulated analysis
function getSimulatedAnalysis(language = 'en') {
  const translations = {
    en: {
      scenarios: [
        {
          soilType: 'Nitrogen Deficient Loam',
          texture: 'Medium loam with good drainage',
          color: 'Light brown with yellowish tint',
          moisture: 'Moderate (30%)',
          organicMatter: 'Low (1.5%)',
          ph: { value: '6.8', category: 'Slightly acidic' },
          nutrients: {
            nitrogen: 'Low (45 ppm)',
            phosphorus: 'Medium (35 ppm)',
            potassium: 'High (180 ppm)'
          },
          recommendations: [
            'Apply Vermicompost (2 tons/acre) or grow legume cover crops',
            'Apply Urea in split doses for immediate nitrogen boost',
            'Ensure adequate moisture for nitrogen uptake'
          ],
          suitableCrops: ['Legumes', 'Beans', 'Peas'],
          improvements: [
            'Add organic matter through composting',
            'Practice crop rotation with nitrogen-fixing plants',
            'Monitor soil moisture regularly'
          ]
        }
      ]
    },
    hi: {
      scenarios: [
        {
          soilType: 'नाइट्रोजन की कमी वाली दोमट मिट्टी',
          texture: 'अच्छी जल निकासी के साथ मध्यम दोमट',
          color: 'पीले रंग की छाया के साथ हल्का भूरा',
          moisture: 'मध्यम (30%)',
          organicMatter: 'कम (1.5%)',
          ph: { value: '6.8', category: 'थोड़ा अम्लीय' },
          nutrients: {
            nitrogen: 'कम (45 पीपीएम)',
            phosphorus: 'मध्यम (35 पीपीएम)',
            potassium: 'उच्च (180 पीपीएम)'
          },
          recommendations: [
            'वर्मीकम्पोस्ट (2 टन/एकड़) डालें या फलीदार फसलें उगाएं',
            'तत्काल नाइट्रोजन बढ़ाने के लिए यूरिया को विभाजित खुराक में डालें',
            'नाइट्रोजन अवशोषण के लिए पर्याप्त नमी सुनिश्चित करें'
          ],
          suitableCrops: ['दालें', 'बीन्स', 'मटर'],
          improvements: [
            'खाद बनाकर जैविक पदार्थ जोड़ें',
            'नाइट्रोजन स्थिरीकरण करने वाले पौधों के साथ फसल चक्र अपनाएं',
            'मिट्टी की नमी की नियमित निगरानी करें'
          ]
        }
      ]
    },
    gu: {
      scenarios: [
        {
          soilType: 'નાઇટ્રોજનની ઉણપવાળી દોમટ માટી',
          texture: 'સારા ડ્રેનેજ સાથે મધ્યમ દોમટ',
          color: 'પીળા રંગના સંકેત સાથે હળવો ભૂરો',
          moisture: 'મધ્યમ (30%)',
          organicMatter: 'ઓછું (1.5%)',
          ph: { value: '6.8', category: 'થોડું એસિડિક' },
          nutrients: {
            nitrogen: 'ઓછું (45 પીપીએમ)',
            phosphorus: 'મધ્યમ (35 પીપીએમ)',
            potassium: 'વધારે (180 પીપીએમ)'
          },
          recommendations: [
            'વર્મીકમ્પોસ્ટ (2 ટન/એકર) નાખો અથવા કઠોળ પાક ઉગાડો',
            'તાત્કાલિક નાઇટ્રોજન વધારવા માટે યુરિયાને વિભાજિત માત્રામાં નાખો',
            'નાઇટ્રોજન શોષણ માટે પૂરતી ભેજ સુનિશ્ચિત કરો'
          ],
          suitableCrops: ['કઠોળ', 'બીન્સ', 'વટાણા'],
          improvements: [
            'ખાતર બનાવીને કાર્બનિક પદાર્થ ઉમેરો',
            'નાઇટ્રોજન સ્થિર કરતા છોડ સાથે પાક ફેરબદલ કરો',
            'માટીની ભેજનું નિયમિત નિરીક્ષણ કરો'
          ]
        }
      ]
    },
    mr: {
      scenarios: [
        {
          soilType: 'नायट्रोजनची कमतरता असलेली दोमट माती',
          texture: 'चांगल्या निचरा सह मध्यम दोमट',
          color: 'पिवळसर छटा असलेला हलका तपकिरी',
          moisture: 'मध्यम (30%)',
          organicMatter: 'कमी (1.5%)',
          ph: { value: '6.8', category: 'किंचित आम्लयुक्त' },
          nutrients: {
            nitrogen: 'कमी (45 पीपीएम)',
            phosphorus: 'मध्यम (35 पीपीएम)',
            potassium: 'जास्त (180 पीपीएम)'
          },
          recommendations: [
            'व्हर्मीकम्पोस्ट (2 टन/एकर) घाला किंवा शेंगा पिके लावा',
            'त्वरित नायट्रोजन वाढवण्यासाठी युरिया विभाजित डोसमध्ये घाला',
            'नायट्रोजन शोषणासाठी पुरेशी ओलावा सुनिश्चित करा'
          ],
          suitableCrops: ['डाळी', 'बीन्स', 'वाटाणा'],
          improvements: [
            'कंपोस्टिंगद्वारे सेंद्रिय पदार्थ जोडा',
            'नायट्रोजन स्थिर करणाऱ्या वनस्पतींसह पीक फेरबदल करा',
            'मातीच्या ओलाव्याचे नियमित निरीक्षण करा'
          ]
        }
      ]
    }
  };

  const langData = translations[language] || translations['en'];
  return langData.scenarios[Math.floor(Math.random() * langData.scenarios.length)];
}



module.exports = router;
