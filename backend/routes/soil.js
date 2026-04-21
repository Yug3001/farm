const express = require('express');
const router = express.Router();
const SoilAnalysis = require('../models/SoilAnalysis');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Analyze soil sample
router.post('/analyze', authMiddleware, async (req, res) => {
  try {
    const { imageData, location, notes } = req.body;

    // AI offline — always use rich simulation mode
    console.log('⚠️ AI offline — using simulation mode (rich local data)');
    const analysisData = getSimulatedAnalysis();


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

// Helper function for simulated analysis (English only)
function getSimulatedAnalysis() {
  const scenarios = [
    {
      soilType: 'Loam Soil with Low Nitrogen',
      texture: 'Medium loam with good drainage and moderate water retention',
      color: 'Light brown with slight yellowish tint (Munsell: 10YR 5/3)',
      moisture: 'Moderate (28-35%)',
      organicMatter: 'Low (1.2-1.8%)',
      ph: { value: '6.8', category: 'Slightly Acidic' },
      nutrients: {
        nitrogen: 'Low (40-50 ppm) — deficiency likely',
        phosphorus: 'Medium (30-40 ppm)',
        potassium: 'High (170-190 ppm)'
      },
      recommendations: [
        'Apply Vermicompost (2 tons/acre) or cow dung manure (10 t/ha) to boost nitrogen and organic matter',
        'Add Urea (100-120 kg/ha) in 2-3 split applications for immediate nitrogen correction',
        'Maintain adequate moisture (field capacity) for proper nitrogen uptake and microbial activity'
      ],
      suitableCrops: ['Wheat', 'Maize', 'Chickpea', 'Mustard'],
      improvements: [
        'Add organic matter: apply well-decomposed compost 5-10 tons/ha before sowing season',
        'Grow green manure crops (Dhaincha/Sunhemp) before the main crop to fix nitrogen naturally',
        'Conduct soil testing every 2 years and follow crop-specific fertilizer recommendations'
      ]
    },
    {
      soilType: 'Black Cotton Soil (Vertisol)',
      texture: 'Heavy clay (50-60% clay), high water retention, cracks deeply when dry',
      color: 'Dark grey to black — rich in montmorillonite clay minerals',
      moisture: 'High (45-55%) — currently well-moistened',
      organicMatter: 'Medium (2.0-2.8%)',
      ph: { value: '7.5', category: 'Neutral to Slightly Alkaline' },
      nutrients: {
        nitrogen: 'Medium (55-70 ppm)',
        phosphorus: 'Low (15-20 ppm) — needs supplementation',
        potassium: 'High (200-260 ppm) — abundant'
      },
      recommendations: [
        'Apply DAP (Di-Ammonium Phosphate) 100-120 kg/ha as basal dose before sowing',
        'Improve field drainage with raised beds or broad bed furrow (BBF) system',
        'Add Gypsum (2-3 tons/ha) to improve soil structure and prevent waterlogging damage'
      ],
      suitableCrops: ['Cotton', 'Sugarcane', 'Soybean', 'Wheat'],
      improvements: [
        'Deep summer plowing to break hard pan layer and improve root penetration',
        'Apply Gypsum (Calcium Sulfate) 5 tons/ha to displace sodium and open soil pores',
        'Use Broad Bed Furrow system for improved drainage and water management'
      ]
    },
    {
      soilType: 'Red Laterite Soil',
      texture: 'Sandy loam, low cohesion, good aeration but prone to erosion',
      color: 'Reddish-brown — high iron oxide (hematite) content',
      moisture: 'Low (15-22%) — tends to dry quickly',
      organicMatter: 'Very Low (0.6-1.2%) — needs urgent improvement',
      ph: { value: '5.8', category: 'Acidic — needs liming' },
      nutrients: {
        nitrogen: 'Low (30-45 ppm)',
        phosphorus: 'Very Low (8-15 ppm) — phosphorus fixed by iron',
        potassium: 'Medium (90-120 ppm)'
      },
      recommendations: [
        'Apply Agricultural Lime (CaCO3) 2-3 tons/ha to raise pH to 6.5 for better nutrient availability',
        'Add heavy organic matter — 15-20 tons FYM/ha annually to build organic carbon',
        'Use drip irrigation to minimize water loss and ensure efficient nutrient delivery'
      ],
      suitableCrops: ['Groundnut', 'Maize', 'Pearl Millet (Bajra)', 'Castor'],
      improvements: [
        'Lime application: raise pH from 5.8 to 6.5 for 30-40% better phosphorus and nutrient availability',
        'Apply Bone Meal or Rock Phosphate (200-300 kg/ha) for slow-release phosphorus in acidic soil',
        'Mulch with crop residues (5-7 cm thick) to reduce soil temperature and retain moisture'
      ]
    }
  ];

  return scenarios[Math.floor(Math.random() * scenarios.length)];
}


module.exports = router;
