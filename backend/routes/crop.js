const express = require('express');
const router = express.Router();
const CropAnalysis = require('../models/CropAnalysis');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Analyze crop disease
router.post('/analyze', authMiddleware, async (req, res) => {
  try {
    const { imageData, location, notes } = req.body;

    // Derive a stable seed from the image so the same photo gives the same result
    const seed = imageData ? imageSeed(imageData) : Math.random();
    const analysisData = getSimulatedCropAnalysis(seed);

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
  const step = Math.max(1, Math.floor(len / 64));
  for (let i = 0; i < len; i += step) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return (hash % 10000) / 10000;
}

/**
 * Returns a rich, deterministic crop analysis based on seed value.
 * Same image → same scenario every time.
 */
function getSimulatedCropAnalysis(seed) {
  const scenarios = [
    // 0 – Tomato Early Blight
    {
      cropName: 'Tomato',
      scientificName: 'Solanum lycopersicum',
      growthStage: 'Flowering / Early Fruiting Stage (60–70 DAS)',
      health: { status: 'Diseased', score: 54 },
      diseases: [{
        name: 'Early Blight (Alternaria solani)',
        severity: 'Medium',
        symptoms: 'Dark brown concentric rings (target-board pattern) on older lower leaves. Yellow chlorotic halo surrounds lesions. Severe cases show defoliation from the base upward.',
        treatment: 'Remove all infected leaves and destroy them. Spray Mancozeb 75WP at 2 g/L water every 7–10 days. If severe, shift to Azoxystrobin 23SC (1 ml/L) for systemic control. Apply at sunrise or sunset — avoid midday spraying.'
      }],
      pests: [{
        name: 'Whitefly (Bemisia tabaci)',
        severity: 'Low',
        treatment: 'Install yellow sticky traps at canopy level (2 per 100 m²). Spray Neem oil 3 ml/L + soap 1 ml/L every 5 days. If population exceeds 5 per leaf, spray Spiromesifen 240SC at 0.5 ml/L — effective against whitefly and also suppresses tomato leaf curl virus spread.'
      }],
      recommendations: [
        'Switch from overhead irrigation to drip to keep foliage dry — humid foliage accelerates Early Blight spread 3-fold.',
        'Apply Potassium Nitrate foliar spray (2 g/L) twice weekly at fruiting stage — potassium strengthens cell walls and improves disease resistance.',
        'Stake all plants properly and prune to a single stem — better air circulation inside canopy reduces humidity and fungal germination by 50%.'
      ],
      careInstructions: {
        watering: 'Irrigate at root zone only using drip or furrow method. Frequency: every 2–3 days in hot weather. Total requirement: 400–600 mm/season. Avoid evening watering completely — wet foliage overnight triggers fungal infection.',
        fertilization: 'Foliar spray: NPK 19:19:19 at 2 g/L every 10 days up to flowering. At fruiting: switch to 0:52:34 (MKP) 2 g/L + Boron 0.5 g/L to improve fruit set and quality. Soil: apply Calcium Nitrate 100 kg/ha to prevent blossom end rot.',
        pruning: 'Remove all suckers (side shoots) weekly — keeps plant as single stem for better fruit quality. Strip all leaves below the first fruit cluster once fruits begin setting. Improves light penetration and air circulation.',
        pestControl: 'Scout weekly for whitefly, aphids, and fruit borers. Spray Imidacloprid 17.8SL at 0.3 ml/L if sucking pest population exceeds threshold. For fruit borer: deploy pheromone traps (2/acre) and spray Chlorantraniliprole 18.5SC at 0.3 ml/L at egg-hatching stage.'
      },
      harvestPrediction: {
        estimatedDays: 38,
        expectedYield: '18–24 t/ha expected if disease is controlled within next 10 days and irrigation is regularised'
      }
    },
    // 1 – Wheat Yellow Rust
    {
      cropName: 'Wheat',
      scientificName: 'Triticum aestivum',
      growthStage: 'Late Tillering / Jointing Stage (40–50 DAS)',
      health: { status: 'Mildly Stressed', score: 68 },
      diseases: [{
        name: 'Yellow Rust (Stripe Rust — Puccinia striiformis)',
        severity: 'Low to Medium',
        symptoms: 'Yellow-orange powdery pustules arranged in parallel stripes along leaf veins. Pustules rupture and release urediospores. Severe infection causes premature leaf yellowing. Currently affecting 10–15% of flag leaf area.',
        treatment: 'Apply Propiconazole 25EC at 1 ml/L water immediately — effective against all rust types. Alternatively, Tebuconazole 250EW at 1 ml/L. Repeat spray in 15–21 days if rain or cool weather (below 15°C) persists. Spray 20–30 L per acre for good coverage.'
      }],
      pests: [{
        name: 'Bird Cherry Aphid (Rhopalosiphum padi)',
        severity: 'Low',
        treatment: 'Current population is below ETL (100 aphids/m row). Monitor weekly. If population crosses threshold, spray Dimethoate 30EC at 2 ml/L or Thiamethoxam 25WG at 0.2 g/L. Ladybird beetles and lacewings present — allow natural enemies to act before applying chemicals.'
      }],
      recommendations: [
        'Second irrigation is critical NOW at jointing stage (45–50 DAS) — skipping it can reduce grain yield by 15–20%.',
        'Top-dress with Urea 60 kg/ha (second split dose) within the next 7 days before jointing is complete — nitrogen at this stage directly increases tiller number and grain count.',
        'Monitor flag leaf (top leaf) for rust spread daily — if infection exceeds 20% of flag leaf area, apply second fungicide spray immediately as flag leaf contributes 70% of final grain weight.'
      ],
      careInstructions: {
        watering: 'Critical irrigation stages: Crown Root Initiation (21 DAS) ✓done, Tillering (35–40 DAS) ✓done, Jointing (45–50 DAS) — apply NOW, Heading/Booting (65 DAS), Grain Fill (85 DAS), Dough Stage (100 DAS). Total: 5–6 irrigations, 60–80 mm each.',
        fertilization: 'Total NPK: 120:60:40 kg/ha. Remaining: Apply second Urea dose 60 kg/ha at jointing. Third dose 40 kg/ha at flag leaf stage. Last foliar spray: 2% DAP at grain fill for added protein in grain.',
        pruning: 'Not applicable for wheat. Thinning/gap filling not required at this stage.',
        pestControl: 'Monitor aphids at tillering — crossover from lower to upper canopy indicates spread. Spray at >100 aphids per metre of row (ETL). Pink stem borer: check for dead hearts in tillers — spray Chlorpyriphos 20EC if more than 5% tillers show dead heart symptoms.'
      },
      harvestPrediction: {
        estimatedDays: 70,
        expectedYield: '48–54 quintals/ha possible with timely fungicide, jointing irrigation, and Urea application'
      }
    },
    // 2 – Cotton Bollworm
    {
      cropName: 'Cotton (BT)',
      scientificName: 'Gossypium hirsutum (Bt transgenic)',
      growthStage: 'Peak Boll Development Stage (90–100 DAS)',
      health: { status: 'Healthy', score: 79 },
      diseases: [],
      pests: [{
        name: 'Pink Bollworm (Pectinophora gossypiella)',
        severity: 'Low',
        treatment: 'Deploy Gossyplure pheromone traps (5 per acre) immediately and record moth counts daily. At >6 moths per trap per week: spray Chlorantraniliprole 18.5SC at 0.3 ml/L covering bolls thoroughly. For organic management: spray Bacillus thuringiensis (Bt formulation, not seed trait) at 2 ml/L. Destroy infested green bolls you collect during scouting.'
      }, {
        name: 'Jassid / Leafhopper (Amrasca biguttula)',
        severity: 'Very Low',
        treatment: 'Yellow sticky traps showing low counts currently. If jassid infestation exceeds 2 per leaf (ETL for cotton), spray Imidacloprid 70WG at 0.25 g/L. Neem oil 5 ml/L is effective as preventive spray at 10-day intervals.'
      }],
      recommendations: [
        'Apply Potassium Sulphate (SOP) 50–60 kg/ha by soil or as foliar spray (2%) now — this directly improves boll weight, fibre length, and oil content.',
        'Maintain pheromone traps throughout boll-opening phase — Pink Bollworm pressure increases sharply after 100 DAS.',
        'Avoid any growth-regulator (Ethephon/Ethrel) sprays until at least 60% bolls have opened — premature defoliation causes yield loss.'
      ],
      careInstructions: {
        watering: 'Boll development is the most critical water stage for cotton. Irrigate every 10–12 days ensuring full root-zone penetration (45 cm). Never allow wilting at this stage. Drip irrigation preferred — reduces boll shedding from soil splash and maintains even soil moisture.',
        fertilization: 'Apply SOP (Sulphate of Potash) 50 kg/ha at boll development — potassium improves fibre strength. Foliar spray: Boron 0.2 g/L + Zinc Sulphate 0.5 g/L improves boll retention. Do NOT apply any nitrogen at this late stage — it causes excessive vegetative growth at expense of bolls.',
        pruning: 'Top the plant if main stem height exceeds 130 cm — redirects energy from vegetative growth to boll filling. Remove damaged or pink bollworm-infested bolls immediately during scouting to reduce pest multiplication. Thin out dense foliage inside canopy to improve light and air circulation.',
        pestControl: 'Pheromone trap network for Pink Bollworm + Helicoverpa is most cost-effective at this stage. Yellow sticky traps control sucking pests. Chemical: use selective insecticides (Spinosad, Chlorantraniliprole) that spare beneficial insects like pollinators and natural enemies.'
      },
      harvestPrediction: {
        estimatedDays: 48,
        expectedYield: '20–25 quintals/ha seed cotton achievable with good bollworm management and timely harvest'
      }
    },
    // 3 – Rice blast
    {
      cropName: 'Paddy (Rice)',
      scientificName: 'Oryza sativa',
      growthStage: 'Panicle Initiation / Heading Stage (75–85 DAS)',
      health: { status: 'Moderate Risk', score: 62 },
      diseases: [{
        name: 'Neck Blast (Pyricularia oryzae)',
        severity: 'Medium',
        symptoms: 'Diamond-shaped grey lesions with dark brown margins on leaf collars and neck of panicle. Infected neck turns brown and causes "white ear" — panicle does not fill grain. Humid weather and cool nights (below 22°C) favour rapid spread.',
        treatment: 'Apply Tricyclazole 75WP at 0.6 g/L water immediately — most effective against all blast types. Alternatively, Tebuconazole 250EW at 1 ml/L. Critical spray window: at 10% heading and again at 50% heading. Spray in early morning for best absorption before dew dries.'
      }],
      pests: [{
        name: 'Brown Plant Hopper (Nilaparvata lugens)',
        severity: 'Low',
        treatment: 'Current count: 3–4 hoppers per hill, below ETL of 5. Monitor daily. Maintain 5 cm water level to prevent base-of-stem access. If count crosses ETL: drain field and spray Buprofezin 25SC at 1 ml/L or Dinotefuran 20SG at 0.3 g/L into the base of plants at sunrise.'
      }],
      recommendations: [
        'Apply Tricyclazole fungicide TODAY — neck blast at heading stage can cause 40–70% yield loss in susceptible varieties within 5–7 days if left untreated.',
        'Maintain 5 cm flood water level throughout heading stage — shallow water favours BPH multiplication and increased blast severity.',
        'Apply Potassium Chloride (MOP) 25 kg/ha as top-dress or 0.5% foliar spray — potassium-stressed rice is 3× more susceptible to blast infection.'
      ],
      careInstructions: {
        watering: 'Maintain 5 cm standing water from panicle initiation through grain fill. Drain 7–10 days before harvest to facilitate stem hardening. Avoid water stress at heading (85 DAS) — single drought event can cut grain set by 25%.',
        fertilization: 'Third N dose was due at panicle initiation (75 DAS). If not applied: use 20 kg Urea/ha as late top-dress only if crop appears pale. Apply 2% DAP foliar spray at 50% heading for grain protein enrichment. Avoid heavy N application now — increases blast susceptibility.',
        pruning: 'Not applicable. Remove and destroy blast-infected tillers from the field boundary — they act as inoculum source for spread into the crop.',
        pestControl: 'For BPH: always spray into the lower canopy at field level, not from overhead. Whorl-level spraying only displaces the insect without killing it. Drain field before spraying for better stem contact. Never use pyrethroids for BPH — they kill natural enemies and cause BPH resurgence.'
      },
      harvestPrediction: {
        estimatedDays: 28,
        expectedYield: '50–58 quintals/ha if blast is controlled immediately; drops to 35–40 quintals without intervention'
      }
    },
    // 4 – Potato late blight
    {
      cropName: 'Potato',
      scientificName: 'Solanum tuberosum',
      growthStage: 'Tuber Bulking Stage (70–85 DAS)',
      health: { status: 'High Risk', score: 45 },
      diseases: [{
        name: 'Late Blight (Phytophthora infestans)',
        severity: 'High',
        symptoms: 'Water-soaked, dark olive-brown lesions on leaf margins and between veins that rapidly enlarge. White cottony sporulation visible on the underside of lesions in humid conditions. Lesions have no distinct margins — irregular spreading. Tubers may show brown, firm rot if spores wash into soil.',
        treatment: 'EMERGENCY — apply systemic fungicide within 24 hours. Metalaxyl+Mancozeb (Ridomil Gold) at 2.5 g/L is the most effective option. If Metalaxyl resistance is suspected (common in advanced strains), use Cymoxanil+Mancozeb (Curzate) at 2.5 g/L. Repeat every 5–7 days during cool, wet weather. Remove and bag any heavily necrotic leaves before spraying.'
      }],
      pests: [],
      recommendations: [
        'Spray systemic fungicide IMMEDIATELY — Late Blight can destroy an entire field in 7–10 days under cool, humid conditions (>80% RH, temp 15–22°C).',
        'Stop all overhead or flood irrigation until weather improves — moisture on foliage is the primary trigger for spore germination; switch to drip or furrow.',
        'If >40% of foliage is already infected, consider vine killing (haulm destruction by herbicide or mechanical) to stop further spread to tubers before harvest.'
      ],
      careInstructions: {
        watering: 'Critical: reduce irrigation immediately to avoid keeping foliage wet. Use furrow or drip — no overhead sprinkler. Soil moisture at tuber stage: 60–65% field capacity. Excess moisture combined with Late Blight means tuber rot risk is extremely high.',
        fertilization: 'No additional nitrogen at this stage. Apply Calcium Nitrate 50 kg/ha as foliar or soil application — calcium strengthens tuber skin and reduces soft rot penetration if blight reaches tubers. Potassium application already done; verify it was adequate.',
        pruning: 'Remove all heavily infected leafy stems from the outer rows (field margins) immediately — blight always enters from field edges and spreads inward. Bag and remove from the field. Do NOT compost infected material.',
        pestControl: 'No significant pest pressure currently. Continue monitoring for Cutworm (Agrotis) in tubers — check by digging 5 plants per 30 m. If found, apply Chlorpyriphos granules 10G at 15 kg/ha to soil.'
      },
      harvestPrediction: {
        estimatedDays: 22,
        expectedYield: '180–240 quintals/ha achievable if blight is arrested now. Without treatment: expect 40–60% yield loss from tuber infection.'
      }
    },
    // 5 – Soybean healthy
    {
      cropName: 'Soybean',
      scientificName: 'Glycine max',
      growthStage: 'Pod Filling Stage — R5 (85–95 DAS)',
      health: { status: 'Healthy', score: 86 },
      diseases: [{
        name: 'Cercospora Leaf Spot (Cercospora kikuchii)',
        severity: 'Low',
        symptoms: 'Very small angular reddish-purple spots (<3 mm) on upper leaf surface. Currently affecting <5% of canopy area. No economic damage at this level.',
        treatment: 'No treatment required at current level. If spots enlarge or coalesce during wet weather: spray Thiophanate Methyl 70WP at 1 g/L. Focus on the top two leaf layers only — these contribute most to pod filling.'
      }],
      pests: [{
        name: 'Soybean Girdle Beetle (Obereopsis brevis)',
        severity: 'Low',
        treatment: 'Check stem at 30 cm height for circular girdles (cuts around the stem circumference). If >5% plants show girdles with wilting above: spray Chlorpyriphos 20EC at 2 ml/L at base of stems. Remove and destroy girdled stems to reduce beetle adult emergence.'
      }],
      recommendations: [
        'Critical irrigation: pod fill (R5 stage) requires one more irrigation cycle — water deficit now causes shrivelled seeds and reduced protein/oil content.',
        'Foliar spray of 0:52:34 (MKP) at 3 g/L water + Zinc Sulphate 0.5 g/L improves seed filling and increases oil/ protein content by 3–5%.',
        'DO NOT apply any broad-spectrum insecticide now — pod-stage soybean flowers attract pollinators and beneficial insects critical for final pod set.'
      ],
      careInstructions: {
        watering: 'Pod fill is the most water-sensitive stage for soybean — equivalent to "grain fill" in cereals. Apply irrigation every 7–8 days maintaining 60% field capacity. One water deficit event at R5 drops yield by 8–12%. Ensure drainage is good after irrigation — standing water causes pod decay.',
        fertilization: 'Remaining nutrition: one foliar spray of 2% DAP + 0.5% MgSO₄ (Epsom salt) at pod fill improves seed protein accumulation. Do NOT apply soil nitrogen at this stage — it delays maturity and reduces seed quality. Rhizobium nodules should be providing adequate biological nitrogen.',
        pruning: 'Not applicable to mature soybean. Avoid any mechanical disturbance to the field during pod fill — it causes pod shattering in dry conditions.',
        pestControl: 'Soybean-specific scouting: check for soybean stem fly (dark dot at stem base), Pod borer larvae inside pods (open 10 pods per 50 m²), and Spodoptera (armyworm) defoliation. Spray Spinosad 45SC at 0.3 ml/L if defoliation exceeds 25% of total leaf area.'
      },
      harvestPrediction: {
        estimatedDays: 18,
        expectedYield: '26–32 quintals/ha is achievable — excellent pod set and health score indicate a good yield is approaching'
      }
    },
    // 6 – Banana Sigatoka
    {
      cropName: 'Banana',
      scientificName: 'Musa acuminata',
      growthStage: 'Vegetative — Bunch Initiation Stage (5–6 months)',
      health: { status: 'Moderate', score: 65 },
      diseases: [{
        name: 'Yellow Sigatoka Leaf Spot (Mycosphaerella musicola)',
        severity: 'Medium',
        symptoms: 'Pale yellowish streaks parallel to leaf veins on young leaves that enlarge into oval brown spots with yellow halos. Centre of spots turns grey and necrotic. Severe infection causes premature leaf death, reducing photosynthetic area by 30–50%.',
        treatment: 'Apply Propiconazole 25EC at 1.5 ml/L as foliar spray using a knapsack sprayer targeting the underside of leaves — spores infect through stomata on the underside. Spray every 21 days during wet humid periods. Alternatively, Bordeaux Mixture (1%) as preventive coat. Remove and destroy severely infected leaves at base of plant.'
      }],
      pests: [{
        name: 'Banana Weevil Borer (Cosmopolites sordidus)',
        severity: 'Low',
        treatment: 'Set pseudostem traps (cut banana stem halves placed near plant base) overnight — check morning count. If >1 weevil per trap per night: apply Chlorpyriphos 20EC at 20 ml/plant as soil drench around the corm. Maintain clean field — remove old pseudostems immediately after harvest as they are primary breeding sites.'
      }],
      recommendations: [
        'Remove all leaves showing >50% Sigatoka necrosis — they are no longer photosynthesising net positive and are active spore sources for spread.',
        'Apply complete NPK 200:60:300 g per plant in two splits — potassium is critical for bunch filling and Sigatoka tolerance. High-K plants are significantly less susceptible to Sigatoka.',
        'Install bunch covers (blue polythene sleeves) now at bunch emergence to protect fingers from direct Sigatoka spore deposit and improve skin quality for market.'
      ],
      careInstructions: {
        watering: 'Banana requires 25–30 mm water per week consistently. Drip irrigation with 4 LPH emitters per plant is ideal — maintains soil moisture without wetting foliage. Do NOT use overhead sprinklers — they directly promote Sigatoka sporulation. Root zone should remain moist but not waterlogged.',
        fertilization: 'Apply 10 splits of NPK 200:60:300 g/plant/year (every 5–6 weeks). Currently at 5-month stage: apply 30 g N + 0 g P + 70 g K per plant this month as bunch is forming. Micro: apply ZnSO₄ 0.5 g + Boron 0.1 g per plant monthly as foliar. Magnesium: 10 g MgSO₄ per plant quarterly.',
        pruning: 'Remove all leaves below the bunch — they shade the bunch and increase humidity that favours Sigatoka. Allow only 8–10 functional green leaves per plant. Remove all suckers except the "ratoon" (follower) plant that is 4–6 months younger than mother.',
        pestControl: 'Nematode management: apply Carbofuran 3G at 40 g per plant every 6 months to control Root Knot Nematodes (Radopholus similis) that weaken root system. Check for Thrips (causes fruit scarring): apply Dimethoate 30EC as bunch spray if 5+ thrips per hand.'
      },
      harvestPrediction: {
        estimatedDays: 95,
        expectedYield: '25–35 kg per bunch expected; with bunch cover and Sigatoka management, premium-grade fruit achievable'
      }
    },
  ];

  const idx = Math.floor(seed * scenarios.length);
  return scenarios[Math.min(idx, scenarios.length - 1)];
}

module.exports = router;
