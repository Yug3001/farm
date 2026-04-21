const express = require('express');
const router = express.Router();
const CropAnalysis = require('../models/CropAnalysis');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Analyze crop disease
router.post('/analyze', authMiddleware, async (req, res) => {
  try {
    const { imageData, location, notes } = req.body;

    // AI offline — always use rich simulation mode
    console.log('⚠️ AI offline — using simulation mode (rich local data)');
    const analysisData = getSimulatedCropAnalysis();



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

// Helper function for simulated crop analysis (English only, varied scenarios)
function getSimulatedCropAnalysis() {
  const scenarios = [
    {
      cropName: 'Tomato',
      scientificName: 'Solanum lycopersicum',
      growthStage: 'Flowering / Early Fruiting Stage',
      health: { status: 'Diseased', score: 58 },
      diseases: [{
        name: 'Early Blight (Alternaria solani)',
        severity: 'Medium',
        symptoms: 'Concentric dark brown rings on older leaves starting from the base. Yellow halo around lesions.',
        treatment: 'Remove infected leaves immediately. Spray Mancozeb 75WP (2g/L) or Chlorothalonil every 7-10 days. Apply at sunrise or sunset.'
      }],
      pests: [],
      recommendations: [
        'Avoid overhead irrigation — switch to drip irrigation to keep foliage dry',
        'Apply copper-based fungicide as preventive spray every 10-14 days during humid weather',
        'Stake plants properly to improve air circulation and reduce blight spread'
      ],
      careInstructions: {
        watering: 'Irrigate at root zone only, 2-3 times per week. Avoid evening watering to prevent fungal growth.',
        fertilization: 'Apply NPK 19:19:19 (2g/L) as foliar spray. Increase potassium (MOP 60kg/ha) at fruiting stage for quality.',
        pruning: 'Remove suckers weekly and all lower leaves below the first fruit cluster. Improves air flow.',
        pestControl: 'Check undersides of leaves for whiteflies weekly. Spray Imidacloprid 0.5ml/L if infestation found.'
      },
      harvestPrediction: {
        estimatedDays: 40,
        expectedYield: '20-25 tons/hectare expected if disease controlled promptly'
      }
    },
    {
      cropName: 'Wheat',
      scientificName: 'Triticum aestivum',
      growthStage: 'Tillering Stage',
      health: { status: 'Mildly Stressed', score: 72 },
      diseases: [{
        name: 'Yellow Rust (Puccinia striiformis)',
        severity: 'Low',
        symptoms: 'Yellow-orange stripe-like rust pustules visible on leaf surface, parallel to leaf veins.',
        treatment: 'Spray Propiconazole 25EC (1ml/L) or Tebuconazole immediately. Repeat in 15 days if needed.'
      }],
      pests: [{
        name: 'Aphids (Rhopalosiphum padi)',
        severity: 'Low',
        treatment: 'Spray Dimethoate 30EC (2ml/L) or use Imidacloprid seed treatment for next sowing. Ladybug presence indicates natural control.'
      }],
      recommendations: [
        'Apply second irrigation immediately (tillering is critical stage for wheat)',
        'Top-dress with Urea (60 kg/ha) as second split dose to support tillering',
        'Monitor for Yellow Rust spread — spray fungicide if disease covers >5% of leaf area'
      ],
      careInstructions: {
        watering: 'Irrigate at tillering (25-30 DAS), jointing (45 DAS) and heading (65 DAS) stages — critical stages.',
        fertilization: 'Top-dress 60kg Urea/ha now. Apply third dose at boot stage. Total N: 120kg/ha.',
        pruning: 'Not applicable for wheat.',
        pestControl: 'Monitor aphid colonies on tillers. Spray at >100 aphids per meter row length (Economic Threshold Level).'
      },
      harvestPrediction: {
        estimatedDays: 75,
        expectedYield: '45-50 quintals/hectare with timely irrigation and fertilizer management'
      }
    },
    {
      cropName: 'Cotton',
      scientificName: 'Gossypium hirsutum',
      growthStage: 'Boll Development Stage',
      health: { status: 'Healthy', score: 82 },
      diseases: [],
      pests: [{
        name: 'Bollworm (Helicoverpa armigera)',
        severity: 'Low',
        treatment: 'Deploy pheromone traps (5 per acre) for monitoring. If >6 moths/trap/week, spray Chlorantraniliprole 18.5SC (0.3ml/L). Use Bt spray (Bacillus thuringiensis) organically.'
      }],
      recommendations: [
        'Apply potassium (MOP 50 kg/ha) now to improve boll weight and fiber quality',
        'Maintain pheromone traps for bollworm monitoring throughout boll development',
        'Avoid applying any hormone sprays at this stage to prevent boll shedding'
      ],
      careInstructions: {
        watering: 'Critical irrigation at boll development. Water every 10-12 days. Avoid waterlogging — reduces boll retention.',
        fertilization: 'Apply potassium sulfate (SOP) 50-60 kg/ha as foliar or soil application for quality improvement.',
        pruning: 'Remove damaged and pest-affected bolls. Top the plant if height exceeds 120cm to direct energy to bolls.',
        pestControl: 'For sucking pests (Aphids, Jassids), spray Imidacloprid 70WG (0.3g/L) at economic threshold. Use yellow sticky traps.'
      },
      harvestPrediction: {
        estimatedDays: 55,
        expectedYield: '18-22 quintals/hectare seed cotton with good pest management'
      }
    }
  ];

  return scenarios[Math.floor(Math.random() * scenarios.length)];
}

module.exports = router;
