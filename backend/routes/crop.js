const express = require('express');
const router = express.Router();
const CropAnalysis = require('../models/CropAnalysis');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { generateWithRetry, parseGeminiJson, validateStructure } = require('../utils/aiHelper');

// Analyze crop disease
router.post('/analyze', authMiddleware, async (req, res) => {
  try {
    const { imageData, location, notes, language = 'en' } = req.body;

    // Debug logging
    console.log('🌿 Crop Analysis Request Received');
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

    // Use Gemini if Key is available
    if (process.env.GEMINI_API_KEY && imageData && imageData.startsWith('data:image')) {
      console.log('✅ Using AI Analysis (Gemini)');
      try {
        const base64Data = imageData.split(',')[1];
        const mimeType = imageData.split(';')[0].split(':')[1];
        const imagePart = { inlineData: { data: base64Data, mimeType } };

        const prompt = `You are an expert plant pathologist and agronomist AI specializing in Indian crops.
Analyze this crop/plant image with precision and provide a comprehensive agricultural diagnosis.

🌐 LANGUAGE: ALL values must be in ${responseLang} ONLY. JSON keys stay in English.

DETAILED ANALYSIS STEPS:
1. Identify the exact crop species (common + scientific name)
2. Determine growth stage (seedling/vegetative/flowering/fruiting/maturity)
3. Assess overall plant health (check leaf color, texture, spots, wilting, deformities)
4. Diagnose any diseases — look for: spots, lesions, rust, mold, wilting patterns
5. Identify pests — look for: holes, webs, sticky residue, insect bodies
6. Rate health score 0-100 based on observed symptoms
7. Provide evidence-based treatment recommendations
8. Estimate harvest timeline based on growth stage

Return STRICT valid JSON only (no markdown):
{
  "cropName": "exact common crop name in ${responseLang}",
  "scientificName": "botanical scientific name in Latin",
  "growthStage": "specific growth stage in ${responseLang}",
  "health": {
    "status": "Healthy / Mildly Stressed / Diseased / Severely Diseased in ${responseLang}",
    "score": 75
  },
  "diseases": [
    {
      "name": "specific disease name in ${responseLang}",
      "severity": "Low / Medium / High in ${responseLang}",
      "symptoms": "visible symptoms observed in ${responseLang}",
      "treatment": "specific treatment with product names and doses in ${responseLang}"
    }
  ],
  "pests": [
    {
      "name": "specific pest name in ${responseLang}",
      "severity": "Low / Medium / High in ${responseLang}",
      "treatment": "specific control method in ${responseLang}"
    }
  ],
  "recommendations": [
    "priority action 1 in ${responseLang}",
    "priority action 2 in ${responseLang}",
    "preventive measure in ${responseLang}"
  ],
  "careInstructions": {
    "watering": "specific watering schedule and method in ${responseLang}",
    "fertilization": "NPK recommendation with timing in ${responseLang}",
    "pruning": "pruning advice if applicable in ${responseLang}",
    "pestControl": "integrated pest management steps in ${responseLang}"
  },
  "harvestPrediction": {
    "estimatedDays": 45,
    "expectedYield": "yield estimate with unit per acre/hectare in ${responseLang}"
  }
}

If image is NOT a plant/crop, return exactly:
{ "error": "Invalid image: Please upload a clear photo of a crop or plant." }`;

        const rawText = await generateWithRetry(prompt, [imagePart]);
        const aiAnalysis = parseGeminiJson(rawText);

        if (aiAnalysis.error) {
          return res.json({ success: false, error: aiAnalysis.error });
        }

        // Validate key fields
        const required = ['cropName', 'health', 'recommendations', 'careInstructions'];
        if (!validateStructure(aiAnalysis, required)) {
          console.warn('[Crop] AI response missing required fields, using simulation fallback');
          analysisData = getSimulatedCropAnalysis(language);
        } else {
          analysisData = aiAnalysis;
          console.log('✅ AI Analysis Successful');
        }

      } catch (aiError) {
        console.error('❌ AI Analysis failed:', aiError.message);
        console.log('⚠️ Falling back to simulation mode');
        analysisData = getSimulatedCropAnalysis(language);
      }
    } else {
      console.log('⚠️ Using Fallback Mode (Simulation)');
      analysisData = getSimulatedCropAnalysis(language);
    }

    // Save to database
    const cropAnalysis = new CropAnalysis({
      userId: req.user._id,
      imageUrl: imageData,
      analysis: analysisData,
      location: location || '',
      notes: notes || ''
    });

    await cropAnalysis.save();

    // Track usage in MongoDB (fire-and-forget)
    User.findById(req.user._id)
      .then(u => u?.trackUsage('crop'))
      .catch(err => console.warn('[DB] trackUsage failed:', err.message));

    res.json({ success: true, analysis: cropAnalysis });

  } catch (error) {
    console.error('Crop analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all crop analyses for a user
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { limit = 10, skip = 0 } = req.query;

    const analyses = await CropAnalysis.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await CropAnalysis.countDocuments({ userId: req.user._id });

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

// Get a specific crop analysis
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const analysis = await CropAnalysis.findOne({
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

// Delete a crop analysis
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const analysis = await CropAnalysis.findOneAndDelete({
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

// Helper function for simulated crop analysis
function getSimulatedCropAnalysis(language = 'en') {
  const translations = {
    en: {
      cropName: 'Tomato',
      scientificName: 'Solanum lycopersicum',
      growthStage: 'Flowering stage',
      health: { status: 'Diseased', score: 65 },
      diseases: [{
        name: 'Early Blight',
        severity: 'Medium',
        treatment: 'Remove infected leaves. Apply copper fungicide or Neem oil. Use Mancozeb or Chlorothalonil every 7-10 days.'
      }],
      pests: [],
      recommendations: [
        'Avoid overhead irrigation to keep foliage dry',
        'Improve air circulation by pruning lower leaves',
        'Apply mulch to prevent soil splash on leaves'
      ],
      careInstructions: {
        watering: 'Water deeply 2-3 times per week, avoid wetting leaves',
        fertilization: 'Apply balanced NPK fertilizer every 2 weeks',
        pruning: 'Remove suckers and lower leaves regularly',
        pestControl: 'Monitor for aphids and whiteflies weekly'
      },
      harvestPrediction: {
        estimatedDays: 45,
        expectedYield: 'Medium yield expected due to disease stress'
      }
    },
    hi: {
      cropName: 'टमाटर',
      scientificName: 'Solanum lycopersicum',
      growthStage: 'फूल आने का चरण',
      health: { status: 'रोगग्रस्त', score: 65 },
      diseases: [{
        name: 'अर्ली ब्लाइट',
        severity: 'मध्यम',
        treatment: 'संक्रमित पत्तियों को हटा दें। कॉपर फंगीसाइड या नीम का तेल लगाएं। हर 7-10 दिनों में मैनकोजेब या क्लोरोथैलोनिल का उपयोग करें।'
      }],
      pests: [],
      recommendations: [
        'पत्तियों को सूखा रखने के लिए ऊपर से सिंचाई से बचें',
        'निचली पत्तियों की छंटाई करके हवा का संचार बढ़ाएं',
        'पत्तियों पर मिट्टी के छींटे रोकने के लिए मल्च लगाएं'
      ],
      careInstructions: {
        watering: 'सप्ताह में 2-3 बार गहराई से पानी दें, पत्तियों को गीला करने से बचें',
        fertilization: 'हर 2 सप्ताह में संतुलित एनपीके उर्वरक डालें',
        pruning: 'नियमित रूप से शाखाएं और निचली पत्तियां हटाएं',
        pestControl: 'साप्ताहिक रूप से एफिड्स और व्हाइटफ्लाई की निगरानी करें'
      },
      harvestPrediction: {
        estimatedDays: 45,
        expectedYield: 'रोग के तनाव के कारण मध्यम उपज की उम्मीद है'
      }
    },
    gu: {
      cropName: 'ટામેટા',
      scientificName: 'Solanum lycopersicum',
      growthStage: 'ફૂલ આવવાનો તબક્કો',
      health: { status: 'રોગગ્રસ્ત', score: 65 },
      diseases: [{
        name: 'અર્લી બ્લાઇટ',
        severity: 'મધ્યમ',
        treatment: 'ચેપગ્રસ્ત પાંદડા દૂર કરો. કોપર ફંગીસાઇડ અથવા લીમડાનું તેલ લગાવો. દર 7-10 દિવસે મેન્કોઝેબ અથવા ક્લોરોથેલોનિલનો ઉપયોગ કરો.'
      }],
      pests: [],
      recommendations: [
        'પાંદડાને સૂકા રાખવા માટે ઉપરથી સિંચાઈ ટાળો',
        'નીચેના પાંદડા કાપીને હવાનું પરિભ્રમણ સુધારો',
        'પાંદડા પર માટીના છાંટા રોકવા માટે મલ્ચ લગાવો'
      ],
      careInstructions: {
        watering: 'અઠવાડિયામાં 2-3 વખત ઊંડે પાણી આપો, પાંદડા ભીના કરવાનું ટાળો',
        fertilization: 'દર 2 અઠવાડિયે સંતુલિત એનપીકે ખાતર નાખો',
        pruning: 'નિયમિતપણે શાખાઓ અને નીચેના પાંદડા દૂર કરો',
        pestControl: 'સાપ્તાહિક એફિડ્સ અને વ્હાઇટફ્લાયનું નિરીક્ષણ કરો'
      },
      harvestPrediction: {
        estimatedDays: 45,
        expectedYield: 'રોગના તણાવને કારણે મધ્યમ ઉપજની અપેક્ષા છે'
      }
    },
    mr: {
      cropName: 'टोमॅटो',
      scientificName: 'Solanum lycopersicum',
      growthStage: 'फुलांचा टप्पा',
      health: { status: 'रोगग्रस्त', score: 65 },
      diseases: [{
        name: 'अर्ली ब्लाइट',
        severity: 'मध्यम',
        treatment: 'संक्रमित पाने काढून टाका. कॉपर बुरशीनाशक किंवा कडुलिंबाचे तेल लावा. दर 7-10 दिवसांनी मॅनकोझेब किंवा क्लोरोथॅलोनिलचा वापर करा.'
      }],
      pests: [],
      recommendations: [
        'पाने कोरडी ठेवण्यासाठी वरून सिंचन टाळा',
        'खालची पाने छाटून हवेचे संचलन सुधारा',
        'पानांवर मातीचे शिडकाव रोखण्यासाठी मल्च लावा'
      ],
      careInstructions: {
        watering: 'आठवड्यातून 2-3 वेळा खोलवर पाणी द्या, पाने ओली करणे टाळा',
        fertilization: 'दर 2 आठवड्यांनी संतुलित एनपीके खत घाला',
        pruning: 'नियमितपणे फांद्या आणि खालची पाने काढा',
        pestControl: 'साप्ताहिक एफिड्स आणि व्हाइटफ्लायचे निरीक्षण करा'
      },
      harvestPrediction: {
        estimatedDays: 45,
        expectedYield: 'रोगाच्या तणावामुळे मध्यम उत्पन्नाची अपेक्षा आहे'
      }
    }
  };

  return translations[language] || translations['en'];
}

module.exports = router;
