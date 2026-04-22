const express = require('express');
const router = express.Router();
const SoilAnalysis = require('../models/SoilAnalysis');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Analyze soil sample
router.post('/analyze', authMiddleware, async (req, res) => {
  try {
    const { imageData, location, notes } = req.body;

    // Derive a numeric seed from image data so the same image always gets the same scenario
    const seed = imageData ? imageSeed(imageData) : Math.random();
    const analysisData = getSimulatedAnalysis(seed, location, notes);

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generates a stable 0–1 seed from a Base64-encoded image data URL.
 * Samples characters spread across the string so the result reflects
 * actual image content rather than the fixed data:image/… prefix.
 */
function imageSeed(dataUrl) {
  const str = dataUrl || '';
  const len = str.length;
  if (len < 100) return Math.random();
  let hash = 0;
  // Sample 64 characters spread evenly
  const step = Math.max(1, Math.floor(len / 64));
  for (let i = 0; i < len; i += step) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return (hash % 10000) / 10000; // 0.0000 – 0.9999
}

/**
 * Returns a rich, deterministic soil analysis based on the seed value.
 * The same image will always return the same scenario.
 */
function getSimulatedAnalysis(seed, location, notes) {
  const scenarios = [
    // 0 – Loamy with nitrogen deficiency
    {
      soilType: 'Loam Soil — Nitrogen Deficient',
      texture: 'Medium loam; smooth and slightly sticky when moist. Good aggregation but loose when dry.',
      color: 'Light brown with faint yellowish cast (Munsell 10YR 5/3)',
      moisture: '28–35% — moderate; suitable for most field crops',
      organicMatter: 'Low (1.2–1.8%) — below optimal for maximum productivity',
      ph: { value: '6.8', category: 'Slightly Acidic' },
      nutrients: {
        nitrogen:   'Low (42–50 ppm) — deficiency causing pale-green leaf tips',
        phosphorus: 'Adequate (32–40 ppm) — no immediate supplementation needed',
        potassium:  'High (172–190 ppm) — well supplied'
      },
      recommendations: [
        'Apply Urea (120 kg/ha) in two split doses: first at sowing, second 30 days after germination to correct nitrogen deficiency.',
        'Incorporate Vermicompost (2–3 t/ha) before sowing to raise organic matter and improve nitrogen mineralization.',
        'Maintain field capacity moisture (28–32%) during vegetative stage to maximise nitrogen uptake by roots.'
      ],
      suitableCrops: ['Wheat', 'Maize', 'Chickpea', 'Mustard', 'Sunflower'],
      improvements: [
        'Grow Dhaincha (Sesbania) or Sunhemp as green manure crop before kharif sowing — adds 50–60 kg N/ha at zero cost.',
        'Apply well-decomposed FYM 10 t/ha each season to steadily raise organic carbon above 1.5%.',
        'Conduct Soil Health Card test every two years and follow crop-specific NPK recommendations to avoid over-application.'
      ]
    },
    // 1 – Black cotton soil
    {
      soilType: 'Black Cotton Soil (Vertisol)',
      texture: 'Heavy clay (52–60%); extremely sticky when wet, forms deep cracks (>5 cm) when dry.',
      color: 'Dark grey to charcoal black — montmorillonite clay with high smectite content',
      moisture: '46–55% — currently well-moistened; good base for Kharif planting',
      organicMatter: 'Medium (2.1–2.7%) — adequate but improvable',
      ph: { value: '7.6', category: 'Neutral to Mildly Alkaline' },
      nutrients: {
        nitrogen:   'Medium (58–72 ppm) — sufficient for current stage',
        phosphorus: 'Low (14–20 ppm) — needs basal supplementation before sowing',
        potassium:  'High (210–260 ppm) — no additional potassium required'
      },
      recommendations: [
        'Apply DAP (Di-Ammonium Phosphate) 120 kg/ha as basal dose immediately before sowing to correct phosphorus deficiency.',
        'Construct raised-bed furrow (BBF) system or narrow ridges to prevent waterlogging during heavy monsoon spells.',
        'Add Gypsum (CaSO₄) 2–3 t/ha to improve clay structure, reduce swelling, and enhance root penetration.'
      ],
      suitableCrops: ['Cotton (BT)', 'Sugarcane', 'Soybean', 'Wheat', 'Linseed'],
      improvements: [
        'Deep summer ploughing (30–35 cm) with MB plough breaks compacted sub-surface layer and improves rooting depth.',
        'Gypsum application (5 t/ha) displaces sodium from exchange sites, opens soil pores, and cuts surface crusting by 40%.',
        'Adopt Broad Bed Furrow (BBF) system for better drainage — reduces waterlogging risk by 60% in heavy clay.'
      ]
    },
    // 2 – Red laterite
    {
      soilType: 'Red Laterite Soil',
      texture: 'Sandy loam; loose, low cohesion. Good aeration but highly prone to erosion and drought stress.',
      color: 'Brick red to reddish-brown — high free iron oxide (hematite) content (8–12% Fe₂O₃)',
      moisture: '14–22% — tends to dry out rapidly; needs frequent light irrigation',
      organicMatter: 'Very Low (0.5–1.1%) — urgent organic matter addition required',
      ph: { value: '5.6', category: 'Acidic — requires liming' },
      nutrients: {
        nitrogen:   'Low (30–44 ppm) — limited by low organic matter',
        phosphorus: 'Very Low (7–13 ppm) — phosphorus fixed by iron and aluminium oxides',
        potassium:  'Medium (88–118 ppm) — marginal; apply light supplementation'
      },
      recommendations: [
        'Apply Agricultural Lime (CaCO₃) 2.5 t/ha to raise pH from 5.6 to 6.4 — immediately improves phosphorus and micronutrient availability.',
        'Apply Bone Meal or Rock Phosphate (250 kg/ha) as slow-release P source that resists iron fixation better than DAP in acidic conditions.',
        'Establish drip irrigation with mulching (paddy straw 5–7 cm thick) to cut water loss by 40% and protect against surface erosion.'
      ],
      suitableCrops: ['Groundnut', 'Pearl Millet (Bajra)', 'Maize', 'Castor', 'Pigeon Pea'],
      improvements: [
        'Lime application every 3 years maintains pH at 6.2–6.5 — increases nutrient availability by 30–40% without extra fertilizer.',
        'Annual application of 15–20 t FYM/ha raises organic carbon, improves water retention, and reduces nutrient leaching from sandy texture.',
        'Mulch the soil surface year-round with crop residues to reduce soil temperature by 5–8°C and maintain moisture for 4–5 extra days after rain.'
      ]
    },
    // 3 – Sandy loam alluvial
    {
      soilType: 'Sandy Loam Alluvial Soil',
      texture: 'Sandy loam (60% sand, 25% silt, 15% clay); easily tilled, free-draining, light and warm.',
      color: 'Light yellowish-brown to greyish-tan (Munsell 2.5Y 6/3) — typical Indo-Gangetic alluvium',
      moisture: '18–26% — drains quickly; irrigation scheduling is critical',
      organicMatter: 'Low to Medium (1.5–2.2%) — can be improved with regular manure application',
      ph: { value: '7.2', category: 'Neutral' },
      nutrients: {
        nitrogen:   'Medium (55–68 ppm) — adequate at current growth stage',
        phosphorus: 'Medium (28–36 ppm) — sufficient for most cereals',
        potassium:  'Medium (130–155 ppm) — monitor at fruiting/grain fill stage'
      },
      recommendations: [
        'Apply fertilizers in 3 split doses (base, 30 DAS, 60 DAS) to reduce leaching from sandy texture — saves 20–25% fertilizer cost.',
        'Apply Zinc Sulphate 25 kg/ha as basal dose — zinc deficiency is common in alluvial soils and causes 10–15% hidden yield loss.',
        'Use sprinkler or drip irrigation with short, frequent cycles (every 3–4 days) to maintain adequate root-zone moisture without leaching.'
      ],
      suitableCrops: ['Sugarcane', 'Rice (transplanted)', 'Vegetable crops', 'Banana', 'Potato'],
      improvements: [
        'Add 8–10 t/ha of well-composted FYM every season to improve soil structure (reduces bulk density) and water-holding capacity.',
        'Grow legume cover crops (Moong, Cowpea) in fallow periods — fixes 30–40 kg N/ha and adds 1.5–2 t dry matter to improve soil biology.',
        'Subsoil tillage every 3 years (chisel plough at 45 cm) breaks any compaction layer that forms under frequent irrigation.'
      ]
    },
    // 4 – Clay loam, waterlogged
    {
      soilType: 'Heavy Clay Loam — Waterlogging Risk',
      texture: 'Clay loam (45% clay, 30% silt, 25% sand); forms hard surface crust when dry; sticky, plastic when wet.',
      color: 'Dark greyish-brown with mottles of yellowish-orange (Munsell 10YR 4/2 — gleying evident)',
      moisture: '55–65% — near saturation; surface ponding likely after moderate rain',
      organicMatter: 'Medium (2.3–3.0%) — relatively healthy but anaerobic conditions risk organic matter loss',
      ph: { value: '6.5', category: 'Slightly Acidic to Neutral' },
      nutrients: {
        nitrogen:   'Medium (60–75 ppm) — risk of denitrification loss under waterlogged conditions',
        phosphorus: 'High (45–58 ppm) — no supplementation required this season',
        potassium:  'High (195–230 ppm) — well supplied'
      },
      recommendations: [
        'Create 30–45 cm drainage channels every 6 m across the field to quickly remove excess water within 24 hours of heavy rain.',
        'Apply Gypsum 3 t/ha to improve soil structure and drainage pores — reduces waterlogging duration by 30–40%.',
        'Use raised bed planting (15–20 cm height) for vegetable crops — keeps root zone above the waterlogged zone.'
      ],
      suitableCrops: ['Paddy (SRI method)', 'Jute', 'Arrowroot', 'Taro', 'Water Chestnut'],
      improvements: [
        'Install underground perforated tile drains at 1–1.5 m depth for permanent drainage in low-lying fields — reduces soil moisture to field capacity within 12 hours.',
        'Subsoil breaking at 45 cm depth with a mole plough creates drainage channels and allows water movement to subsurface drains.',
        'Add 5 t lime + 5 t Gypsum/ha to flocculate fine clay particles and create macro-pores for faster drainage.'
      ]
    },
    // 5 – Saline/alkaline soil
    {
      soilType: 'Saline-Alkaline Soil (Usar/Reh)',
      texture: 'Silty clay; forms a hard, white salt-encrusted surface layer. Impermeable subsoil restricts root growth below 20 cm.',
      color: 'Light grey to white surface crust with patches of rusty-brown salt efflorescence',
      moisture: '30–38% — misleading; physiological drought due to high salt osmotic pressure',
      organicMatter: 'Very Low (0.4–0.8%) — salt toxicity suppresses biological activity',
      ph: { value: '8.8', category: 'Strongly Alkaline — Sodic' },
      nutrients: {
        nitrogen:   'Low (35–48 ppm) — limited by high pH reducing N availability',
        phosphorus: 'Low (10–18 ppm) — precipitated as calcium phosphate at high pH',
        potassium:  'Medium (110–140 ppm) — partially available but sodium competition limits uptake'
      },
      recommendations: [
        'Apply Gypsum (calcium sulphate) 8–10 t/ha and incorporate to 15 cm depth — displaces exchangeable sodium and dramatically lowers pH within 2–3 seasons.',
        'Flood-leach the field 2–3 times (apply 60 cm of good-quality water, allow to drain) to wash soluble salts below root zone.',
        'Grow salt-tolerant crops (Barley, Dhaincha, Para grass) in the first season as they can tolerate EC up to 8 dS/m while the soil is being reclaimed.'
      ],
      suitableCrops: ['Barley', 'Sesbania (Dhaincha)', 'Bermuda Grass', 'Sugar Beet', 'Atriplex'],
      improvements: [
        'Gypsum reclamation: apply 10 t/ha, plough in, then leach — pH drops by 1.5–2.0 units and EC by 60–70% within 3 months.',
        'Biological reclamation: sow Dhaincha (Sesbania aculeata) and incorporate at 45 days — adds organic matter and helps break up salt crust through root action.',
        'After reclamation, apply PSB (Phosphate Solubilising Bacteria) + Azotobacter as bio-fertilizers to re-establish soil microbiology destroyed by salinity.'
      ]
    },
    // 6 – Organic, well-managed
    {
      soilType: 'Well-Managed Organic-Rich Loam',
      texture: 'Silty loam; excellent crumb structure, earthworm channels visible. Ideal tilth for most crops.',
      color: 'Rich dark brown to chocolate brown (Munsell 7.5YR 3/3) — indicative of high humus content',
      moisture: '35–42% — excellent; near optimal field capacity for most crops',
      organicMatter: 'High (3.5–4.8%) — outstanding; supports diverse and active microbial community',
      ph: { value: '6.4', category: 'Slightly Acidic — Optimal for Nutrient Availability' },
      nutrients: {
        nitrogen:   'High (88–110 ppm) — excellent slow-release supply from organic matter mineralisation',
        phosphorus: 'High (50–65 ppm) — excellent availability enhanced by active mycorrhizal network',
        potassium:  'High (200–240 ppm) — well buffered by high CEC of organic matter'
      },
      recommendations: [
        'Reduce synthetic fertilizer by 40–50% — the high organic matter and microbial activity naturally supply adequate NPK for most crops.',
        'Apply Trichoderma viride 5 kg/ha as soil drench before transplanting to protect the rich microbial ecosystem from soil-borne pathogens.',
        'Maintain organic matter by returning all crop residues (mulch) — avoid burning, which instantly destroys 50% of surface nutrients.'
      ],
      suitableCrops: ['Vegetables (all)', 'Strawberry', 'Fruit orchards', 'High-value herbs', 'Medicinal plants'],
      improvements: [
        'Maintain diversity with crop rotation including legumes, brassicas, and night-shades in sequence — sustains microbial diversity and suppresses specific pathogens.',
        'Apply biostimulants (Humic acid 5 L/ha + Seaweed extract 3 L/ha) once per season to further amplify plant-growth-promoting biology.',
        'Consider PGS-India organic certification — your soil quality already meets organic standards and premium prices of 25–40% are achievable.'
      ]
    },
  ];

  // Use seed to pick scenario (same image → same result)
  const idx = Math.floor(seed * scenarios.length);
  return scenarios[Math.min(idx, scenarios.length - 1)];
}

module.exports = router;
