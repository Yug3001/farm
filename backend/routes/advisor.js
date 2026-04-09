const express = require('express');
const router = express.Router();
const ChatHistory = require('../models/ChatHistory');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const QueryClassifier = require('../utils/queryClassifier');


const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize query classifier for hybrid AI approach
const queryClassifier = new QueryClassifier();

// Get farming advice
router.post('/ask', authMiddleware, async (req, res) => {
  try {
    const { question, sessionId, language = 'en' } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Language name mapping
    const languageNames = {
      'en': 'English',
      'hi': 'Hindi (हिंदी)',
      'gu': 'Gujarati (ગુજરાતી)',
      'mr': 'Marathi (मराठी)'
    };

    const responseLang = languageNames[language] || 'English';

    // Define the knowledge base function
    function getKnowledgeBase() {
      return {
        // --- FERTILIZERS & NUTRIENTS (What is NPK, etc.) ---
        'npk': 'NPK stands for Nitrogen (N), Phosphorus (P), and Potassium (K) — the three primary macronutrients that plants need to grow. 🌱\n\n• **Nitrogen (N):** Promotes leafy, green vegetative growth. Deficiency causes yellowing of older leaves. Applied as Urea (46% N) or DAP.\n• **Phosphorus (P):** Promotes root development, flowering, and fruiting. Deficiency causes purple/dark-green leaves. Applied as DAP or SSP.\n• **Potassium (K):** Strengthens stems, improves disease resistance, enhances fruit quality. Deficiency causes brown leaf edges. Applied as MOP or SOP.\n\n**Standard NPK recommendation:** 120:60:40 kg/ha for most field crops. Always do a soil test before applying. NPK fertilizers are sold as compound fertilizers like 10:26:26, 12:32:16, or 19:19:19.',
        'nitrogen': 'Nitrogen (N) is the most important plant nutrient for leafy growth. It is part of chlorophyll and amino acids. Deficiency causes yellowing (chlorosis) starting from older leaves. Sources: Urea (46% N), Ammonium Sulphate (21% N), DAP (18% N). Apply in 2-3 splits to avoid leaching. Avoid excess — it delays maturity, increases pest susceptibility, and causes lodging. Organic sources: FYM, green manure (Dhaincha, Cowpea), vermicompost.',
        'phosphorus': 'Phosphorus (P) is essential for root development, energy transfer (ATP), flowering, and seed formation. Deficiency: Leaves turn dark green or purple, poor root growth, delayed maturity. Sources: DAP (46% P2O5), SSP (Single Super Phosphate — 16% P2O5), Rock Phosphate. Apply as basal dose before sowing. Phosphorus is immobile in soil — place near roots. Organic: Bone meal, Rock phosphate. Higher availability in slightly acidic pH (6–6.5).',
        'potassium': 'Potassium (K) strengthens cell walls, activates enzymes, improves water use efficiency, disease resistance, and fruit quality. Deficiency: Brown/scorched leaf edges (marginal necrosis), weak stems, lodging, poor fruit quality. Sources: MOP (Muriate of Potash — 60% K2O), SOP (Sulfate of Potash — 50% K2O, preferred for quality crops). Apply 40-60 kg K2O/ha. Critical at fruiting and grain-filling stages. Organic: Wood ash, compost.',
        'urea': 'Urea is the most widely used nitrogen fertilizer with 46% N content. It is cost-effective and water-soluble. Apply by broadcasting or band placement. Broadcast immediately before irrigation to prevent volatile losses. Split application (3 doses) is best: at sowing, 30 days after sowing, and at flowering. Do not mix with DAP or SSP directly. Store in a cool, dry place. Rate: 100-200 kg/ha depending on crop.',
        'dap': 'DAP (Di-Ammonium Phosphate) is a popular compound fertilizer containing 18% N and 46% P2O5. It is the most widely used phosphatic fertilizer in India. Apply as basal dose before or at sowing. It provides both nitrogen and phosphorus simultaneously. Rate: 100-150 kg/ha. Slightly acidic in soil reaction — good for alkaline soils. Do not mix with urea at the same time. Price: Subsidized under GoI scheme.',
        'mop': 'MOP (Muriate of Potash) contains 60% K2O and is the most common potassium fertilizer. It is water-soluble and quickly available to plants. Apply as basal dose or split at vegetative and fruiting stages. Rate: 50-100 kg/ha. Avoid for crops sensitive to chloride (tobacco, potato, strawberry) — use SOP (Sulfate of Potash) instead. Imported, so prices can fluctuate. Store in dry conditions.',
        'vermicompost': 'Vermicompost is organic manure produced by earthworms (Eisenia fetida) from agricultural waste. It contains 2-3% N, 1.5-2% P, 1.5% K plus micronutrients and beneficial microbes. Benefits: Improves soil structure, water-holding capacity, promotes beneficial microorganisms. Application: 2-3 tons/ha. Ready in 45-60 days. Can be produced at low cost on-farm. Ideal for organic farming and vegetable production.',

        // --- MAJOR CROPS (Detailed) ---
        'rice': 'Rice (Oryza sativa) requires standing water during growth. Best sown in Kharif season (June-July). Use SRI (System of Rice Intensification) method to save 30-40% water. Transplant 8-12 day old seedlings at 25x25cm spacing. Apply Nitrogen in 3 splits: basal, tillering, panicle initiation. Watch for Blast disease (brown spots on leaves) and Stem borer (dead hearts). Harvest when 80% grains turn golden yellow. Popular varieties: Swarna, IR-64, Pusa Basmati.',
        'paddy': 'Paddy cultivation: Maintain 2-5cm water level throughout growth. Apply 120kg N, 60kg P2O5, 40kg K2O per hectare. Zinc deficiency is common (rusty brown leaves)—apply 25kg Zinc Sulfate per hectare. Weed control is critical in first 30 days. Use Butachlor herbicide or manual weeding. Brown Plant Hopper is a major pest—spray Imidacloprid if infestation exceeds 5 per hill.',
        'wheat': 'Wheat (Triticum aestivum) is a Rabi crop. Optimal sowing: Nov 10-30 in North India. Seed rate: 100kg/ha for timely sowing, 125kg/ha for late sowing. Crown Root Initiation (CRI) stage at 21 days is critical—first irrigation must be given. Apply 120:60:40 NPK kg/ha. Yellow Rust and Brown Rust are major threats—use resistant varieties like HD-2967, PBW-343. Harvest when moisture is 20-25%.',
        'tomato': 'Tomato (Solanum lycopersicum) needs well-drained, slightly acidic soil (pH 6-7). Transplant 25-30 day seedlings at 60x45cm spacing. Staking/caging increases yield by 30%. Apply 100:50:50 NPK kg/ha. Early Blight (concentric rings on leaves)—spray Mancozeb 2g/L. Leaf Curl Virus spread by Whiteflies—use yellow sticky traps and spray Imidacloprid. Harvest when fruits are firm and fully colored.',
        'potato': 'Potato (Solanum tuberosum) requires loose, well-aerated soil. Plant seed tubers (30-40g) at 60x20cm spacing in Oct-Nov. Earthing up at 30 and 45 days is essential for tuber development. Apply 120:80:100 NPK kg/ha. Late Blight is devastating—spray Mancozeb preventively when humidity >80%. Harvest when leaves turn yellow. Cure tubers in shade for 10-15 days before storage. Varieties: Kufri Jyoti, Kufri Pukhraj.',
        'cotton': 'Cotton (Gossypium) grows best in Black soil with good drainage. BT Cotton (Bollgard) resists American Bollworm. Sow in June-July at 90x60cm spacing. Apply 120:60:60 NPK kg/ha. Pink Bollworm is emerging threat—use Pheromone traps for monitoring. Sucking pests (Aphids, Jassids, Whiteflies) damage early—spray Imidacloprid if needed. Avoid waterlogging. First picking at 120-130 days. Varieties: RCH-2, Ankur-651.',
        'sugarcane': 'Sugarcane (Saccharum officinarum) is a long-duration crop (10-12 months). Plant 3-bud setts at 90cm row spacing in Feb-March (Spring) or Oct-Nov (Autumn). Deep planting (15-20cm) prevents lodging. Apply 250:115:115 NPK kg/ha in splits. Red Rot causes hollow stems with red patches—use resistant varieties like Co-0238, Co-86032. Earthing up at 90-120 days. Harvest when Brix reaches 18-20%.',
        'maize': 'Maize/Corn (Zea mays) is sensitive to waterlogging. Sow in Kharif (June-July) or Rabi (Oct-Nov). Spacing: 60x20cm. Apply 120:60:40 NPK kg/ha. Fall Armyworm is a major pest—check leaf whorls for sawdust-like frass and spray Chlorantraniliprole. Knee-high stage and tasseling are critical for nitrogen application. Harvest when moisture is 20-25%. Varieties: DHM-117, Pusa Vivek QPM-9.',
        'soybean': 'Soybean (Glycine max) is a Kharif oilseed legume. Inoculate seeds with Rhizobium culture for nitrogen fixation. Sow in June-July at 45x5cm spacing. Apply 20:60:40 NPK kg/ha (low N as it fixes nitrogen). Yellow Mosaic Virus transmitted by Whiteflies—control vectors with Imidacloprid. Girdle Beetle cuts stems—spray Chlorpyriphos. Harvest when 95% pods turn brown. Varieties: JS-335, JS-9305.',
        'mustard': 'Mustard (Brassica juncea) is a Rabi oilseed. Sow in Oct-Nov at 30x10cm spacing. Apply 80:40:20 NPK kg/ha. Aphids ("Mahua") are the main pest forming dense colonies—spray Imidacloprid when infestation exceeds 50 aphids/10cm shoot. White Rust appears as white pustules on leaves—spray Metalaxyl. Harvest when 75% pods turn yellow-brown. Varieties: Pusa Bold, RH-30.',
        'onion': 'Onion (Allium cepa) needs sulfur-rich soil for pungency. Transplant 45-day seedlings at 15x10cm spacing. Apply 100:50:50 NPK kg/ha. Avoid excess nitrogen late in season—it reduces storage life. Purple Blotch (concentric rings on leaves)—spray Mancozeb. Thrips damage leaves—spray Fipronil. Harvest when tops fall over naturally. Cure bulbs in shade for 7-10 days. Varieties: Pusa Red, Nasik Red.',
        'chilli': 'Chilli/Pepper (Capsicum annuum) is sensitive to waterlogging. Transplant at 60x45cm spacing. Apply 100:50:50 NPK kg/ha. Leaf Curl disease (Churda-Murda) is viral—control Thrips and Mites with Fipronil. Anthracnose causes fruit rot—spray Carbendazim. Fruit borer damages fruits—spray Spinosad. Apply Neem oil fortnightly as preventive. Varieties: Pusa Jwala, Arka Lohit.',

        // --- MORE CROPS ---
        'groundnut': 'Groundnut/Peanut (Arachis hypogaea) is a Kharif crop. Sow in June-July at 30x10cm spacing. Apply 20:40:60 NPK kg/ha with Gypsum 400kg/ha (for pod filling). Tikka disease (brown spots)—spray Chlorothalonil. Aphids and Thrips—spray Dimethoate. Harvest when leaves turn yellow (120-140 days). Varieties: TG-37A, Kadiri-6.',
        'chickpea': 'Chickpea/Gram (Cicer arietinum) is a Rabi pulse. Sow in Oct-Nov at 30x10cm spacing. Inoculate with Rhizobium. Apply 20:40:20 NPK kg/ha. Wilt disease—use resistant varieties like JG-11, JG-16. Pod borer damages pods—spray NPV or Quinalphos. Harvest when 80% pods turn brown. Varieties: JG-130, Pusa-362.',
        'banana': 'Banana (Musa) requires well-drained soil rich in organic matter. Plant suckers at 1.8x1.8m spacing. Apply 200:60:300g NPK per plant per year in 10 splits. Panama Wilt (Fusarium)—use tissue culture plants. Sigatoka leaf spot—spray Propiconazole. Bunch covers protect from pests. Harvest when fingers are full and rounded. Varieties: Grand Naine, Robusta.',
        'mango': 'Mango (Mangifera indica) requires deep, well-drained soil. Plant grafted saplings at 10x10m spacing. Apply 1kg N, 0.5kg P2O5, 1kg K2O per tree per year. Powdery Mildew on flowers—spray Sulfur. Fruit fly—use methyl eugenol traps. Anthracnose on fruits—spray Carbendazim. Flowering: Dec-Feb, Harvest: May-July. Varieties: Alphonso, Dasheri, Kesar.',
        'kharif': 'Kharif crops are sown in June-July (monsoon onset) and harvested in September-October. They require warm, humid conditions and heavy rainfall. Major Kharif crops: Rice, Maize, Cotton, Soybean, Groundnut, Pigeonpea, Sugarcane, Jowar, Bajra. Key challenge: Pest and disease pressure is high due to humidity. Fertilizers applied at sowing and 30 days after.',
        'rabi': 'Rabi crops are sown in October-November (post-monsoon) and harvested in March-April. They require cool growing conditions and irrigation. Major Rabi crops: Wheat, Chickpea, Mustard, Lentil, Peas, Barley, Potato. Key advantage: Fewer pests and diseases compared to Kharif. Irrigation at critical growth stages is essential.',

        // --- SOIL & NUTRIENTS (Expanded) ---
        'clay soil': 'Clay soil has >40% clay particles, high water retention but poor drainage and aeration. Heavy to work. Add organic matter (5-10 tons compost/ha) and Gypsum (2-5 tons/ha) to improve structure. Avoid working when wet. Suitable for rice, wheat in irrigated conditions. Deep tillage helps root penetration.',
        'sandy soil': 'Sandy soil has >70% sand, drains too fast, low water and nutrient retention. Add 10-15 tons organic compost/ha annually. Use drip irrigation or frequent light irrigation. Apply fertilizers in small, frequent doses. Mulching reduces water loss. Suitable for groundnut, watermelon, carrot with proper management.',
        'loam soil': 'Loam is ideal soil (~40% sand, 40% silt, 20% clay). Good drainage, water retention, and aeration. Suitable for almost all crops. Maintain fertility with crop rotation, green manure, and balanced fertilization. pH 6-7 is optimal. Regular organic matter addition maintains structure.',
        'black soil': 'Black soil (Regur/Vertisol) is rich in clay (40-60%), high in Ca, Mg but low in N, P. Ideal for cotton, sugarcane, soybean, wheat. Holds moisture well but cracks deeply when dry. Add organic matter to improve structure. Avoid deep tillage when dry. pH 7-8.5.',
        'red soil': 'Red soil is rich in iron oxide (red color), often acidic (pH 5-6.5). Low in N, P, organic matter. Apply Lime 2-5 tons/ha to raise pH. Add organic compost. Suitable for groundnut, pulses, millets, tobacco. Responds well to fertilizers when pH is corrected.',
        'acidic soil': 'Acidic soil (pH <6) limits nutrient availability, especially P, Ca, Mg. Aluminum toxicity may occur. Apply Agricultural Lime (CaCO3) 2-5 tons/ha based on pH. Use acid-tolerant crops like tea, pineapple if uncorrected. Soil test every 2-3 years to monitor pH.',
        'alkaline soil': 'Alkaline/Sodic soil (pH >7.5) causes micronutrient deficiencies (Zn, Fe, Mn). Apply Gypsum 5-10 tons/ha to displace sodium. Use acidifying fertilizers like Ammonium Sulfate. Grow salt-tolerant crops initially. Leaching with good quality water helps. Add organic matter and Sulfur.',
        'nitrogen deficiency': 'Nitrogen deficiency: Older leaves turn pale yellow (chlorosis) in V-shape from tip. Stunted growth, thin stems. Apply Urea 50-100kg/ha or Ammonium Sulfate. Side-dress during vegetative stage. Organic: Apply FYM, compost, or green manure (Dhaincha, Sunhemp). Legumes fix atmospheric N.',
        'phosphorus deficiency': 'Phosphorus deficiency: Leaves turn dark green/purple, especially on undersides. Poor root development, delayed maturity. Apply DAP (Di-Ammonium Phosphate) 100-150kg/ha or SSP (Single Super Phosphate) 200-300kg/ha as basal dose. Rock phosphate for long-term. Organic: Bone meal.',
        'potassium deficiency': 'Potassium deficiency: Leaf edges and tips turn brown/scorched (marginal necrosis). Weak stems, lodging. Poor fruit quality. Apply MOP (Muriate of Potash) 50-100kg/ha or SOP (Sulfate of Potash) for quality crops. Organic: Wood ash, compost. Critical during fruiting stage.',
        'zinc deficiency': 'Zinc deficiency: "Khaira" disease in rice (brown spots on leaves). Small leaves, short internodes in fruit trees. Apply Zinc Sulfate 25kg/ha as basal or 0.5% foliar spray. Mix with Lime to prevent fixation in alkaline soil. Common in alkaline and sandy soils.',

        // ── NEW: MORE NUTRIENTS ────────────────────────────────────────────────
        'ssp': 'SSP (Single Super Phosphate) contains 16% P2O5, 11% S, and 19% Ca — the only phosphate fertilizer that also supplies sulfur. Ideal for oilseeds (mustard, soybean, groundnut). Rate: 200-300 kg/ha as basal. Also corrects sulfur deficiency. More cost-effective than DAP when sulfur is needed.',
        'calcium': 'Calcium (Ca) is essential for cell wall strength and root tip growth. Deficiency: tip burn (lettuce), blossom end rot (tomato, pepper), hollow heart (brassicas). Apply Agricultural Lime (CaCO3), Gypsum (CaSO4), or Calcium Nitrate as foliar. Keep soil pH >6 for adequate calcium availability.',
        'sulphur': 'Sulfur (S) is vital for protein synthesis and oil quality. Deficiency: yellowing of young leaves (unlike nitrogen where old leaves yellow). Common in sandy/low-organic soils. Apply Gypsum 200-400 kg/ha, SSP, or Ammonium Sulphate. Critical for mustard, garlic, onion, soybean to improve oil/pungency quality.',
        'iron deficiency': 'Iron (Fe) deficiency: young leaves turn yellow while veins remain green (interveinal chlorosis). Common in alkaline soils (pH>7). Spray Ferrous Sulphate (1%) or chelated iron (Fe-EDTA). Soil application: Ferrous Sulphate 20-25 kg/ha mixed with compost. Lowering soil pH also helps iron availability.',
        'magnesium deficiency': 'Magnesium (Mg) deficiency: older leaves show interveinal yellowing (veins stay green). Occurs in sandy/acidic soils or where potassium is very high. Apply Magnesium Sulphate (Epsom salt) 10-20 kg/ha or 1% foliar spray. Dolomitic lime supplies both Ca and Mg. Mg is the central atom in chlorophyll.',
        'boron deficiency': 'Boron (B) deficiency: hollow stem in cauliflower/broccoli, cracked stem in celery, tip burn in beets, poor pollen viability and fruit set. Apply Borax 10-15 kg/ha basal or 0.1-0.2% foliar spray (Solubor). Do not exceed recommended dose — boron toxicity also damages crops.',

        // ── NEW: BIO-INPUTS ────────────────────────────────────────────────────
        'fym': 'FYM (Farm Yard Manure) is a mixture of cattle dung, urine, and bedding material. Average composition: 0.5% N, 0.25% P, 0.5% K. Apply 10-20 t/ha before sowing. Well-decomposed FYM improves soil structure, water retention, and microbial activity. Never use fresh FYM — it causes N loss and harbours pathogens.',
        'compost': 'Compost is decomposed organic matter. Aerobic composting: layer crop residue + FYM + soil 1:1:1, maintain moisture, turn every 15 days, ready in 3-4 months. Nutrient content: ~1-2% N, 0.5-1% P, 1-1.5% K. Apply 5-10 t/ha. Improves soil health, water holding, and earthworm populations.',
        'green manure': 'Green manuring: grow fast-growing legumes (Dhaincha/Sesbania, Sunhemp/Crotalaria, Cowpea, Moong) and incorporate at flowering (45-60 days). Adds 40-60 kg N/ha, improves organic matter, suppresses weeds. Widely used before paddy in rice-wheat systems. Low cost and highly effective.',
        'bio fertilizer': 'Bio-fertilizers are living microorganism preparations. Types: Rhizobium (legume N fixation), Azotobacter (free-living N fixation, 20-30 kg N/ha), PSB (phosphate solubilising bacteria), Azospirillum (cereals). Treat seeds just before sowing. Store in cool, dark place below 25°C. Very cost-effective input.',
        'rhizobium': 'Rhizobium fixes nitrogen (50-200 kg N/ha) in root nodules of legumes: chickpea, soybean, peas, groundnut, moong, urad. Inoculate seeds with crop-specific Rhizobium culture mixed with jaggery solution before sowing. Reduces fertilizer N by 30-50%. Must use correct strain for each legume species.',
        'azotobacter': 'Azotobacter is a free-living nitrogen-fixing bacteria for non-legumes (wheat, maize, vegetables). Fixes 20-30 kg N/ha, produces growth hormones and antifungal substances. Apply as seed treatment or soil drench at 5-10 kg/ha. Use within 6 months of production. Do not mix with chemical fertilizers.',
        'trichoderma': 'Trichoderma is a beneficial fungus for biological disease control. Controls Fusarium wilt, Rhizoctonia damping-off, Sclerotinia, Pythium root rot. Apply as seed treatment (5g/kg seed), soil drench (5 kg/ha enriched in compost), or root dip during transplanting. Avoid mixing with chemical fungicides.',
        'psb': 'PSB (Phosphate Solubilising Bacteria — Bacillus, Pseudomonas) solubilises locked soil phosphorus, saving 10-20 kg P2O5/ha. Apply as seed treatment or soil application. Most effective combined with rock phosphate. Use within shelf life.',
        'neem': 'Neem (Azadirachta indica) is invaluable in organic farming. Neem Oil (3ml/L + soap) controls aphids, whiteflies, mites, soil pests. Neem Cake (200-500 kg/ha soil) controls nematodes, white grubs, adds N (5%). NSKE 5% (Neem Seed Kernel Extract) repels pests, acts as antifeedant. Safe for beneficial insects and humans.',
        'jeevamrut': 'Jeevamrut is the cornerstone of Zero Budget Natural Farming (ZBNF). Mix 10 kg cow dung + 10 L cow urine + 2 kg jaggery + 2 kg pulse flour + 1 handful local soil in 200 L water. Ferment 48 hours, stirring twice daily. Apply 200 L/acre by drip or sprinkler. Boosts soil microbial population dramatically at almost zero cost.',

        // ── NEW: MILLETS ───────────────────────────────────────────────────────
        'jowar': 'Jowar/Sorghum (Sorghum bicolor) — drought-tolerant Kharif crop. Sow June-July at 45x15cm. Apply 80:40:40 NPK kg/ha. Tolerates poor soil, not waterlogging. Shoot fly is key seedling pest — use resistant varieties. Grain mold at high humidity — spray Mancozeb at dough stage. Stover is excellent cattle fodder. Varieties: CSH-16, CSH-23.',
        'bajra': 'Bajra/Pearl Millet (Pennisetum glaucum) — most drought-hardy crop for arid zones. Sow June-July at 45x15cm. Apply 80:40:00 NPK kg/ha. Downy Mildew — use resistant varieties + Metalaxyl seed treatment. Ergot fungus affects grain. Good protein and energy source for cattle. Varieties: HHB-67, GHB-558.',
        'ragi': 'Ragi/Finger Millet (Eleusine coracana) — highly nutritious (Ca 344mg/100g, high iron). Sow June-July or transplant at 22.5x10cm. Apply 60:40:40 NPK kg/ha. Blast disease (gray lesions) — spray Tricyclazole. Good for red and laterite soils, hilly regions. Varieties: GPU-28, MR-6.',
        'barley': 'Barley (Hordeum vulgare) — Rabi crop, hardier than wheat. Sow Oct-Nov at 100-125 kg seed/ha. Apply 60:30:20 NPK. Tolerates saline/alkaline soil better than wheat. Used for animal feed, malt, sattu. Stripe Rust — spray Propiconazole. Varieties: RD-2660, NDB-1173.',

        // ── NEW: VEGETABLES ────────────────────────────────────────────────────
        'brinjal': 'Brinjal/Eggplant — transplant 30-35 day seedlings at 75x60cm. Apply 120:60:60 NPK kg/ha. Shoot and Fruit Borer (SFB) — pheromone traps + Chlorantraniliprole. Bacterial Wilt — use resistant varieties. Little Leaf phytoplasma — remove and burn. Varieties: Pusa Purple Long, KS-224.',
        'okra': 'Okra/Bhindi — fast growing, warm-season direct-sown at 60x30cm. Apply 100:50:50 NPK. YVMV (Yellow Vein Mosaic Virus) spread by whiteflies — use resistant varieties A-4, Parbhani Kranti. Fruit Borer — Spinosad. Harvest every 2-3 days. 50-60 day crop.',
        'cauliflower': 'Cauliflower — cool climate (15-20°C), transplant at 60x45cm. Apply 120:60:60 NPK + Boron 1-2 kg/ha (prevents hollow stem). Downy Mildew + Collar Rot — Metalaxyl+Mancozeb. DBM (Diamond Back Moth) — Bt spray or Spinosad. Varieties: Pusa Snowball K-1.',
        'cucumber': 'Cucumber — warm-season creeper. Sow 2 seeds/pit at 150x60cm. Apply 100:60:60 NPK. Downy Mildew (yellow angular spots) — Cymoxanil+Mancozeb. Fruit Fly — protein bait traps. Trellis improves yield and disease management. Varieties: Pusa Uday, Himadri.',
        'peas': 'Peas (Rabi vegetable/pulse) — sow Oct-Nov at 30x10cm. Apply 20:60:40 NPK + Rhizobium. Powdery Mildew — Sulfur 3g/L. Pod Borer — Spinosad. Harvest when pods full but tender. Varieties: Arkel (early), Bonneville (main season).',
        'carrot': 'Carrot — needs deep, loose soil. Sow Aug-Oct at 30x7.5cm. Apply 75:50:50 NPK. Avoid excess N (causes forked roots). Alternaria Leaf Blight — Mancozeb. Root Knot Nematode — soil solarize or Carbofuran. Varieties: Pusa Kesar, Nantes.',
        'spinach': 'Spinach — cool weather (15-20°C). Direct sow at 30cm row spacing. Apply 100:60:60 NPK (high N for leafy growth). Downy Mildew and Leaf Miner common. Harvest outer leaves repeatedly. 6-8 week crop cycles. Rich in iron, calcium. Good kitchen garden crop.',
        'garlic': 'Garlic (Rabi crop) — plant cloves 250-300 kg/ha at 15x7.5cm in Oct-Nov. Apply 100:50:50 NPK + Sulfur 30 kg/ha. Thrips — Fipronil. Purple Blotch — Mancozeb. Harvest when 50% tops fall. Cure 10-15 days. Varieties: Yamuna Safed-3, G-282.',
        'ginger': 'Ginger — plant seed rhizomes (1500-1800 kg/ha) at 25x25cm in March-April. Apply 75:50:50 NPK + 15 t FYM. Soft Rot (Pythium) — use disease-free rhizomes + Metalaxyl drench. Rhizome Fly — Chlorpyriphos drench. Harvest at 8-10 months. Varieties: Maran, Rio-de-Janeiro.',
        'turmeric': 'Turmeric — plant rhizomes at 45x30cm in March-May. Apply 60:50:120 NPK (high K for rhizome quality). Leaf Blotch — Mancozeb. Rhizome Rot — Metalaxyl drench. Harvest at 7-9 months when leaves dry. Varieties: Erode Local, Pratibha (high curcumin). Yield: 15-20 t green rhizomes/ha.',

        // ── NEW: PULSES ────────────────────────────────────────────────────────
        'pigeon pea': 'Pigeon Pea/Tur/Arhar (Kharif, deep-rooted) — sow June-July at 75x20cm. Apply 20:50:20 NPK + Rhizobium. Fusarium Wilt and Sterility Mosaic (mite-transmitted) — resistant varieties. Pod Borer (Helicoverpa) — Chlorantraniliprole. Matures 180-250 days. Varieties: ICPH-2671, Asha.',
        'lentil': 'Lentil/Masoor (Rabi, 90-110 days) — sow Nov-Dec at 30x10cm. Apply 20:40:20 NPK + Rhizobium. Rust (orange pustules) — Mancozeb. Aphids — Dimethoate. High protein (25%). Varieties: DPL-15, L-4076.',
        'moong': 'Moong/Green Gram (60-75 days, Kharif or Zaid) — sow June-July or Feb-March at 30x10cm. Apply 20:40:20 NPK + Rhizobium. YMV (Yellow Mosaic Virus) — resistant varieties Pusa Vishal. Harvest when 80% pods black. Varieties: MH-421, Pusa Ratna.',
        'urad': 'Urad/Black Gram (Kharif, similar to Moong) — sow June-July at 30x10cm. Apply 20:40:20 NPK. YMV — resistant varieties LBG-648. Powdery Mildew — Sulfur spray. High protein, widely used in Indian diet. Varieties: WBG-26, Pant U-19.',

        // ── NEW: FRUITS ────────────────────────────────────────────────────────
        'papaya': 'Papaya — plant gynodioecious varieties (1 male: 10 female) at 2x2m. Apply 200g N + 200g P + 400g K per plant/month. PRSV (Papaya Ringspot Virus) — tolerant hybrids Red Lady, Taiwan-786. Phytophthora collar rot — avoid waterlogging. Harvest when skin turns yellow. Rich in papain enzyme.',
        'guava': 'Guava — hardy fruit, wide soil tolerance. Plant at 6x6m. Apply 260g N + 220g P + 680g K per tree/year. Fruit Fly — methyl eugenol traps. Fusarium Wilt — resistant varieties. Prune after every crop. Varieties: Allahabad Safeda (white, round), Sardar L-49 (pear-shaped).',
        'pomegranate': 'Pomegranate — drought-tolerant, semi-arid. Plant at 5x3m. Apply 250:125:250g NPK per plant/year. Bacterial Blight (Xanthomonas) — Copper Oxychloride spray. Fruit Borer — Chlorantraniliprole. Apply Bahar treatment before flowering. Harvest when skin is pink-red. Varieties: Bhagwa, Wonderful.',
        'grapes': 'Grapes — need training system (Bower/Kniffin). Spacing 3x3m. Apply 400g N + 250g P + 500g K per vine/year. Downy Mildew + Powdery Mildew — Bordeaux Mixture or Myclobutanil. Anthracnose — Mancozeb. Harvest at 18-22° Brix. Varieties: Thompson Seedless, Sharad Seedless, Sonaka.',
        'watermelon': 'Watermelon (Kharif/Zaid) — sow Feb-March or June-July at 200x60cm. Apply 100:60:60 NPK. Fusarium Wilt — resistant hybrids or grafting. Fruit Fly — protein bait traps. Harvest when tendril near fruit dries. Varieties: Sugar Baby, Arka Jyoti.',
        'orange': 'Orange/Mandarin — plant budded saplings at 6x6m. Apply 600g N + 200g P + 400g K per tree/year in 3 splits. Citrus Canker — Copper Oxychloride + pruning. HLB Greening (Psylla-transmitted) — no cure, use disease-free material. Varieties: Nagpur Mandarin, Coorg Mandarin.',
        'apple': 'Apple — thrives 1500-2700m altitude, needs 1000-1200 chilling hours. Plant grafted trees at 4x4m. Apply 700g N + 350g P + 700g K per tree/year. Scab — Mancozeb/Carbendazim. Fire Blight — Streptomycin + pruning. Varieties: Delicious, Royal Gala, McIntosh.',

        // ── NEW: PESTS ─────────────────────────────────────────────────────────
        'aphids': 'Aphids — soft sap-sucking insects (green/black/brown). Cause leaf curl, honeydew, sooty mold, virus transmission. Control: Neem oil 3ml/L, yellow sticky traps, ladybug release. Chemical: Imidacloprid 0.3ml/L or Dimethoate 2ml/L. Check undersides of young leaves.',
        'whiteflies': 'Whiteflies — tiny white insects, suck sap, transmit viruses (Leaf Curl, YMV). Control: yellow sticky traps, Neem oil, weed-free fields. Chemical: Imidacloprid, Thiamethoxam, Spiromesifen. Spray early morning for best contact.',
        'bollworm': 'Bollworms bore into cotton bolls, tomato fruits, chickpea pods. Use pheromone traps, handpick larvae. Spray NPV or Bt (biological). Chemical: Chlorantraniliprole, Spinosad. Destroy crop residues after harvest.',
        'termites': 'Termites attack roots/stems especially in dry soil. Treat seeds with Chlorpyriphos 4ml/kg. Apply Neem cake 250 kg/ha. Chemical: Chlorpyriphos 2.5L/ha soil drench. Maintain soil moisture. Remove undecomposed organic matter from field.',
        'stem borer': 'Stem borers bore stems causing dead hearts (vegetative) or white ears (reproductive stage). Use pheromone traps. Release Trichogramma 50,000/ha. Spray Cartap Hydrochloride or Chlorantraniliprole. Remove crop stubble post-harvest.',
        'fruit fly': 'Fruit flies lay eggs inside fruits, maggots cause drop and rot. Methyl eugenol bait traps. Bait spray: hydrolysed protein + Malathion. Collect and destroy fallen fruits. Spray Spinosad organically. Paper/net bag covers protect fruits.',
        'blight disease': 'Blight — rapid browning and death of plant tissue. Early Blight (Alternaria): concentric rings — Mancozeb 2g/L. Late Blight (Phytophthora): water-soaked lesions + white mold — Metalaxyl+Mancozeb. Bacterial Blight: water-soaked spots — Copper Oxychloride 3g/L.',
        'rust disease': 'Rust — orange powdery pustules on wheat, pea, beans. Yellow Rust, Brown Rust, Black Rust in wheat. Plant resistant varieties. Spray Sulfur or Propiconazole. Avoid excess nitrogen. Ensure good air circulation.',
        'powdery mildew': 'Powdery Mildew — white powdery coating on leaves/fruits. Dry weather + cool nights favour it. Spray Wettable Sulfur 2g/L or Hexaconazole 1ml/L. Improve air circulation. Avoid overhead irrigation. Remove infected parts promptly.',
        'wilt disease': 'Wilt — sudden wilting from soil-borne Fusarium, Verticillium, or bacterial infection. Vascular browning in stem cross-section. Use resistant varieties, crop rotation, soil solarization, Trichoderma soil application. Remove and burn infected plants.',
        'leaf miner': 'Leaf miners create white serpentine tunnels inside leaves. Affects tomato, cucumber, spinach, peas. Control: Neem oil, remove affected leaves, yellow sticky traps. Chemical: Abamectin 1.8 EC at 0.5ml/L. Avoid excessive nitrogen.',
        'nematodes': 'Root Knot Nematodes (Meloidogyne spp.) cause root galls, stunted growth, yellowing. Soil solarization (transparent polythene 45-60 days in summer — soil reaches 55-60°C). Apply Carbofuran 3G or Neem cake 500 kg/ha. Crop rotation with maize or sorghum.',
        'mites': 'Spider/Red Mites suck leaf sap causing stippling, bronzing, webbing. Worse in hot dry conditions. Neem oil 5ml/L + soap. Acaricides: Abamectin, Dicofol, Spiromesifen. Predatory Phytoseiid mites are natural enemies.',

        // ── NEW: FARMING PRACTICES ─────────────────────────────────────────────
        'drip irrigation': 'Drip irrigation delivers water to root zones via emitters (2-4 LPH). Saves 30-50% water vs flood. Enables fertigation. Reduces weeds. PMKSY subsidy: 55% SC/SF, 45% others. Maintain: clean filters weekly, flush laterals monthly.',
        'sprinkler irrigation': 'Sprinkler irrigation saves 30-40% water. Suits uneven terrain, light soils, field crops. Types: portable, semi-portable, centre pivot. Avoid in high wind or for foliar-sensitive crops. PMKSY subsidy available.',
        'mulching': 'Mulching conserves moisture, suppresses weeds, regulates temperature. Organic mulch (straw 5-10cm): adds nutrients. Plastic mulch (black/silver): increases soil temperature, ideal for vegetables. Reduces irrigation frequency 30-40%.',
        'crop rotation': 'Crop rotation breaks pest/disease cycles, improves fertility. Example: Rice-Wheat-Chickpea. Include legumes for N fixation. Never grow same family consecutively. 3-4 year rotation ideal.',
        'intercropping': 'Intercropping grows two+ crops simultaneously. Examples: Maize+Soybean, Cotton+Moong, Sugarcane+Onion, Coconut+Banana+Pepper. Benefits: better land use, income security, natural pest control.',
        'organic farming': 'Organic farming uses no synthetic chemicals. Inputs: compost, FYM, vermicompost, green manure, bio-fertilizers. Pest control: Neem, Panchagavya, NPV, Bt, Trichoderma. Certification: NPOP (India) or PGS-India (cheaper). Premium prices 20-40% higher. 3-year conversion period.',
        'greenhouse farming': 'Polyhouse/Greenhouse — controlled environment for capsicum, cucumber, tomato, flowers, strawberry. MIDH subsidy available. Natural ventilation or climate-controlled. Higher investment but 3-4x yields year-round.',
        'natural farming': 'Natural Farming (ZBNF) by Subhash Palekar uses farm-produced inputs: Jeevamrut (fermented cow dung + urine), Bijamrut (seed treatment), crop residue mulch — zero external inputs. Drastically reduces input cost. Best for mixed farms with cattle.',
        'agroforestry': 'Agroforestry integrates trees with crops or livestock. Types: Agrisilviculture (trees+crops), Silvopastoral (trees+livestock). Examples: Poplar+Wheat, Coconut+Banana+Pepper. Benefits: extra income from trees, improved microclimate, soil conservation, carbon credit potential.',
        'seed treatment': 'Seed treatment steps: (1) Fungicide — Thiram or Carboxin+Thiram 2-3g/kg seed. (2) Bio-agent — Trichoderma 5g/kg, Rhizobium for legumes. (3) Micronutrient priming — ZnSO4 1% solution soak. Air-dry before sowing. Never eat treated seed.',
        'hydroponics': 'Hydroponics grows plants in nutrient solution (no soil). Saves 90% water, higher yields year-round. Systems: NFT, DWC, Ebb-Flow, Drip. Target pH 5.5-6.5, EC 1.5-2.5 dS/m. Crops: leafy greens, herbs, tomato, cucumber. Requires electricity and technical knowledge.',
        'precision agriculture': 'Precision Agriculture uses GPS, soil sensors, drones, satellite imagery for site-specific management. Variable rate fertilizer and pesticide application. Reduces waste, optimises inputs, increases efficiency. Requires capital investment and training.',
        'vertical farming': 'Vertical farming grows crops in stacked indoor layers under LED lights with hydroponics or aeroponics. Saves 95% water, uses minimal land, no pesticides, year-round. Best for leafy greens, herbs, strawberries. High electricity cost.',
        'zaid': 'Zaid (Summer) crops grow March-June using residual moisture or irrigation. Fast-season warm-weather crops: watermelon, muskmelon, cucumber, moong, fodder. Key challenge: high temperatures and water management. Use mulching to conserve moisture.',

        // ── NEW: SOIL TOPICS ───────────────────────────────────────────────────
        'saline soil': 'Saline soil (EC >4 dS/m) — excess soluble salts cause physiological drought even with adequate water. Grow salt-tolerant crops (barley, sugarbeet). Apply Gypsum, leach with good-quality water. Mulch to reduce surface evaporation. Use salt-tolerant varieties.',
        'laterite soil': 'Laterite soil (Kerala, Odisha, Maharashtra) — iron/aluminium-rich, poor in N, P, K, Ca. Highly acidic (pH 4.5-5.5). Apply heavy lime doses. Use compost abundantly. Suitable for cashew, coconut, tea, rubber with proper management.',

        // ── NEW: GOVERNMENT SCHEMES ────────────────────────────────────────────
        'pm kisan scheme': 'PM-KISAN: ₹6,000/year in 3 installments of ₹2,000 (April, August, December). All landholding farmer families eligible. Register at pmkisan.gov.in with Aadhaar, bank account, land records. DBT directly to bank account.',
        'kisan credit card': 'KCC: short-term credit for crop production at 7% interest (4% with Prompt Repayment Incentive). Limit based on cropping pattern and land. Apply at any bank. ₹3 lakh credit available. Includes insurance coverage. Renewable annually.',
        'fasal bima yojana': 'PMFBY: crop insurance against natural calamities (drought, flood, hail, cyclone, pest/disease). Premium: 1.5% Rabi, 2% Kharif, 5% horticulture. Rest paid by government. Enroll 2 weeks before sowing. Covers pre-sowing to post-harvest losses.',
        'pmksy subsidy': 'PMKSY: micro-irrigation subsidy — 55% for small/marginal farmers, 45% for others. Apply at District Agriculture Office. Promotes drip and sprinkler. Per Drop More Crop component targets 60 lakh ha water efficiency.',
        'kusum scheme': 'PM-KUSUM: solar energy for farmers. Component B: standalone solar pumps with 70% subsidy. Component C: grid-connected pump solarisation. Apply via DISCOM or State Nodal Agency. Reduces diesel cost significantly.',
        'enam platform': 'e-NAM: online agricultural market platform. 1000+ mandis integrated. Transparent price discovery. Register at local mandi with e-NAM card. Payment within 24 hours. Download e-NAM app for real-time prices.',
        'minimum support price': 'MSP: government-announced minimum price for 23 crops. FCI and state agencies procure at MSP. Major crops: paddy, wheat, pulses, oilseeds, cotton. Announced before sowing season. Sell at MSP procurement centres meeting quality norms.',
        'pkvy scheme': 'PKVY (Paramparagat Krishi Vikas Yojana): promotes organic farming. Support: ₹50,000/ha over 3 years for organic inputs. Facilitates cluster formation, PGS-India certification. Apply through state agriculture department.',
        'smam scheme': 'SMAM: subsidised farm equipment. Subsidy: 40-50% for general farmers, 50-80% for SC/ST/small farmers. Covers tractors, tillers, harvesters, seeders, sprayers. Apply at District Agriculture Office. CHC (Custom Hiring Centres) setup also subsidised.',

        // ── NEW: GENERAL QUESTIONS ─────────────────────────────────────────────
        'soil testing': 'Soil testing: collect from 0-15cm depth, 8-10 random spots per field, mix, take 500g sample. Tests 12 parameters: N, P, K, pH, EC, OC, S, Zn, Fe, Cu, Mn, B. Free under Soil Health Card scheme. Follow crop-specific fertilizer recommendations — saves 20-30% fertilizer cost, increases yield 10-15%.',
        'integrated pest management': 'IPM: holistic pest control using multiple tactics in sequence. Cultural: crop rotation, resistant varieties, timely sowing. Mechanical: handpicking, traps, barriers. Biological: Trichogramma, Bt, NPV, Trichoderma. Chemical: last resort only at/above Economic Threshold Level (ETL). Reduces pesticide use 30-50%.',
        'post harvest management': 'Post-harvest: harvest at correct maturity (moisture, color, firmness). Clean and grade to improve market value. Dry to safe storage moisture (wheat 12%, paddy 14%, maize 12%). Store in clean, cool, dry warehouses. Cold storage for perishables. Reduces 10-30% post-harvest losses.',
        'market prices': 'Check market prices before selling: e-NAM (enam.gov.in) and Agmarknet.gov.in for daily prices across 1000+ mandis. Sell during lean or festival season for premium. Grading and packaging increase price 15-30%. FPOs enable collective selling for better bargaining.',
        'weather forecast': 'Check 3-7 day weather forecast before farm operations. Avoid spraying fertilizers or pesticides if rain expected within 24 hours. Use IMD app, Meghdoot app, or local KVK advisory for agro-meteorological guidance.',
        'compost making': 'Composting: layer crop residues + FYM + soil in 1:1:1, maintain 60% moisture, turn every 15 days. Ready in 3-4 months. Vermicomposting (Eisenia fetida worms) — ready in 45-60 days. C:N ratio 25-30:1 is ideal.',
        'crop water requirement': 'Crop Water Requirement varies by crop and stage. Wheat total: 450-650mm. Critical irrigation stages: CRI (25 DAS), tillering (45 DAS), jointing (65 DAS), heading (90 DAS). Use tensiometer (irrigate at >40 centibars) or feel method for scheduling.',
        'crop insurance': 'PMFBY crop insurance protects against natural calamity, pest, and disease losses. Premium very low (1.5-5%). Enroll through bank or insurance company before cut-off date. Also consider WBCIS (weather-based) for drought/frost areas. Claims settled within 60 days.',
        'seed rate': 'Seed rates: Wheat 100-125 kg/ha, Paddy (nursery): 25 kg/ha, Soybean 75-80 kg/ha, Maize hybrid 20-25 kg/ha, Mustard 4-5 kg/ha, Groundnut 100-120 kg/ha, Cotton BT 1.5 kg/ha. Use certified seed with >85% germination.',
        'herbicide': 'Herbicides control weeds. Pre-emergence: Pendimethalin (Stomp), Atrazine (maize). Post-emergence: 2,4-D for broadleaf weeds in wheat, Quizalofop for grass weeds in soybean. Always read label for dose, timing, safety. Wear protective gear. Leave buffer zones near water bodies.',
        'drainage': 'Field drainage removes excess water that causes waterlogging. Surface drainage: shallow trenches/channels carry runoff. Subsurface: perforated pipes 1-2m deep lower water table. Raised bed cultivation is simple drainage solution for vegetables.',
        'irrigation scheduling': 'Irrigation scheduling: (1) Feel method — squeeze soil, crumbles = irrigate. (2) Tensiometer at >40 centibars. (3) ETc-based daily calculation. (4) Crop-stage specific. Irrigate between 6-8 AM to reduce evaporation losses.',
        'tractor': 'Tractor selection: 20-35 HP for <5 acres, 40-55 HP for 5-25 acres, 60+ HP for large farms. Operations: plowing, rotavation, seed drilling, spraying, threshing. SMAM subsidy 40-50%. Annual maintenance: change engine oil every 250 hours, check tire pressure, clean air filter.',
        'farm pond': 'Farm pond: small on-farm reservoir (30x30x3m = 2700 m³, serves ~0.5 ha). HDPE liner prevents seepage. Stores rainwater for supplemental irrigation during dry spells. MGNREGS and state scheme subsidies available. Can also be used for fish farming (bonus income).',
        'soil health card': 'Soil Health Card (SHC): free testing every 2 years. Tests N, P, K, pH, EC, OC, S, Zn, Fe, Cu, Mn, B. Collect sample from 0-15cm, 8-10 spots, mix 500g. Results in 15-30 days. Follow crop-specific recommendations to save fertilizer and boost yields 10-15%.',
      };
    }

    // 🎯 HYBRID AI: Classify query
    const classification = queryClassifier.classify(question);
    console.log(`📊 Query Classification:`, {
      question: question.substring(0, 50) + '...',
      type: classification.type,
      confidence: classification.confidence,
      reason: classification.reason
    });

    const lowerQuestion = question.toLowerCase();
    const kbResponses = getKnowledgeBase();

    // ROUTE 1: Simple queries in ENGLISH with high confidence → Knowledge Base (saves API calls)
    // For non-English languages, always use Gemini so response is in the selected language
    if (language === 'en' && classification.type === 'simple' && classification.confidence >= 0.7) {
      let bestMatch = null;
      let maxLen = 0;
      for (const key in kbResponses) {
        if (lowerQuestion.includes(key) && key.length > maxLen) {
          maxLen = key.length;
          bestMatch = kbResponses[key];
        }
      }
      if (bestMatch) {
        console.log('✅ Using Knowledge Base (English) - API call saved!');
        // Track usage in MongoDB (fire-and-forget — don't block response)
        User.findById(req.user._id)
          .then(u => u?.trackUsage('advisor'))
          .catch(err => console.warn('[DB] trackUsage failed:', err.message));

        await saveChatMessage(req.user._id, sessionId, question, bestMatch);
        return res.json({
          question,
          answer: bestMatch,
          timestamp: new Date(),
          userId: req.user._id,
          source: 'Knowledge Base',
          apiCallSaved: true
        });
      }
      // KB miss — fall through to Gemini AI
    }

    // ROUTE 2: Complex queries → Use Gemini AI
    console.log('🤖 Using Gemini AI for complex query');

    // AI INTEGRATION: Use Gemini if key exists
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `You are FarmWise, an expert Indian Agricultural Advisor AI. Answer the farmer's question with practical, specific advice for Indian farming.

🌐 LANGUAGE: Respond ONLY in ${responseLang}. Use native script for Hindi/Gujarati/Marathi.

📋 RESPONSE FORMAT (150-200 words):
- Quick Answer: 1-2 sentence direct solution
- Key Details: specific doses, timings, product names, varieties
- Practical Tips: 2-3 actionable points
- Next Step: what to do/monitor next

Topics you cover: crops (Kharif/Rabi/Zaid), soil science, NPK nutrients, pest/disease control (IPM), irrigation, organic farming, government schemes (PM-KISAN, PMFBY, KCC, PMKSY, MSP), market prices.

Farmer's Question: "${question}"

Respond in ${responseLang} with expert, practical advice:`


        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiAnswer = response.text().trim();

        // Track usage in MongoDB (fire-and-forget)
        User.findById(req.user._id)
          .then(u => u?.trackUsage('advisor'))
          .catch(err => console.warn('[DB] trackUsage failed:', err.message));

        // Save to chat history
        await saveChatMessage(req.user._id, sessionId, question, aiAnswer);

        return res.json({
          question,
          answer: aiAnswer,
          timestamp: new Date(),
          userId: req.user._id,
          source: 'AI'
        });

      } catch (aiError) {
        console.error("AI Advisor failed:", aiError);
        // Fallback to local database logic below
      }
    }

    // FALLBACK: Comprehensive Agriculture Knowledge Base
    const responses = {
      // --- MAJOR CROPS (Detailed) ---
      'rice': 'Rice (Oryza sativa) requires standing water during growth. Best sown in Kharif season (June-July). Use SRI (System of Rice Intensification) method to save 30-40% water. Transplant 8-12 day old seedlings at 25x25cm spacing. Apply Nitrogen in 3 splits: basal, tillering, panicle initiation. Watch for Blast disease (brown spots on leaves) and Stem borer (dead hearts). Harvest when 80% grains turn golden yellow. Popular varieties: Swarna, IR-64, Pusa Basmati.',
      'paddy': 'Paddy cultivation: Maintain 2-5cm water level throughout growth. Apply 120kg N, 60kg P2O5, 40kg K2O per hectare. Zinc deficiency is common (rusty brown leaves)—apply 25kg Zinc Sulfate per hectare. Weed control is critical in first 30 days. Use Butachlor herbicide or manual weeding. Brown Plant Hopper is a major pest—spray Imidacloprid if infestation exceeds 5 per hill.',
      'wheat': 'Wheat (Triticum aestivum) is a Rabi crop. Optimal sowing: Nov 10-30 in North India. Seed rate: 100kg/ha for timely sowing, 125kg/ha for late sowing. Crown Root Initiation (CRI) stage at 21 days is critical—first irrigation must be given. Apply 120:60:40 NPK kg/ha. Yellow Rust and Brown Rust are major threats—use resistant varieties like HD-2967, PBW-343. Harvest when moisture is 20-25%.',
      'tomato': 'Tomato (Solanum lycopersicum) needs well-drained, slightly acidic soil (pH 6-7). Transplant 25-30 day seedlings at 60x45cm spacing. Staking/caging increases yield by 30%. Apply 100:50:50 NPK kg/ha. Early Blight (concentric rings on leaves)—spray Mancozeb 2g/L. Leaf Curl Virus spread by Whiteflies—use yellow sticky traps and spray Imidacloprid. Harvest when fruits are firm and fully colored.',
      'potato': 'Potato (Solanum tuberosum) requires loose, well-aerated soil. Plant seed tubers (30-40g) at 60x20cm spacing in Oct-Nov. Earthing up at 30 and 45 days is essential for tuber development. Apply 120:80:100 NPK kg/ha. Late Blight is devastating—spray Mancozeb preventively when humidity >80%. Harvest when leaves turn yellow. Cure tubers in shade for 10-15 days before storage. Varieties: Kufri Jyoti, Kufri Pukhraj.',
      'cotton': 'Cotton (Gossypium) grows best in Black soil with good drainage. BT Cotton (Bollgard) resists American Bollworm. Sow in June-July at 90x60cm spacing. Apply 120:60:60 NPK kg/ha. Pink Bollworm is emerging threat—use Pheromone traps for monitoring. Sucking pests (Aphids, Jassids, Whiteflies) damage early—spray Imidacloprid if needed. Avoid waterlogging. First picking at 120-130 days. Varieties: RCH-2, Ankur-651.',
      'sugarcane': 'Sugarcane (Saccharum officinarum) is a long-duration crop (10-12 months). Plant 3-bud setts at 90cm row spacing in Feb-March (Spring) or Oct-Nov (Autumn). Deep planting (15-20cm) prevents lodging. Apply 250:115:115 NPK kg/ha in splits. Red Rot causes hollow stems with red patches—use resistant varieties like Co-0238, Co-86032. Earthing up at 90-120 days. Harvest when Brix reaches 18-20%.',
      'maize': 'Maize/Corn (Zea mays) is sensitive to waterlogging. Sow in Kharif (June-July) or Rabi (Oct-Nov). Spacing: 60x20cm. Apply 120:60:40 NPK kg/ha. Fall Armyworm is a major pest—check leaf whorls for sawdust-like frass and spray Chlorantraniliprole. Knee-high stage and tasseling are critical for nitrogen application. Harvest when moisture is 20-25%. Varieties: DHM-117, Pusa Vivek QPM-9.',
      'soybean': 'Soybean (Glycine max) is a Kharif oilseed legume. Inoculate seeds with Rhizobium culture for nitrogen fixation. Sow in June-July at 45x5cm spacing. Apply 20:60:40 NPK kg/ha (low N as it fixes nitrogen). Yellow Mosaic Virus transmitted by Whiteflies—control vectors with Imidacloprid. Girdle Beetle cuts stems—spray Chlorpyriphos. Harvest when 95% pods turn brown. Varieties: JS-335, JS-9305.',
      'mustard': 'Mustard (Brassica juncea) is a Rabi oilseed. Sow in Oct-Nov at 30x10cm spacing. Apply 80:40:20 NPK kg/ha. Aphids (\"Mahua\") are the main pest forming dense colonies—spray Imidacloprid when infestation exceeds 50 aphids/10cm shoot. White Rust appears as white pustules on leaves—spray Metalaxyl. Harvest when 75% pods turn yellow-brown. Varieties: Pusa Bold, RH-30.',
      'onion': 'Onion (Allium cepa) needs sulfur-rich soil for pungency. Transplant 45-day seedlings at 15x10cm spacing. Apply 100:50:50 NPK kg/ha. Avoid excess nitrogen late in season—it reduces storage life. Purple Blotch (concentric rings on leaves)—spray Mancozeb. Thrips damage leaves—spray Fipronil. Harvest when tops fall over naturally. Cure bulbs in shade for 7-10 days. Varieties: Pusa Red, Nasik Red.',
      'chilli': 'Chilli/Pepper (Capsicum annuum) is sensitive to waterlogging. Transplant at 60x45cm spacing. Apply 100:50:50 NPK kg/ha. Leaf Curl disease (Churda-Murda) is viral—control Thrips and Mites with Fipronil. Anthracnose causes fruit rot—spray Carbendazim. Fruit borer damages fruits—spray Spinosad. Apply Neem oil fortnightly as preventive. Varieties: Pusa Jwala, Arka Lohit.',

      // --- MORE CROPS ---
      'groundnut': 'Groundnut/Peanut (Arachis hypogaea) is a Kharif crop. Sow in June-July at 30x10cm spacing. Apply 20:40:60 NPK kg/ha with Gypsum 400kg/ha (for pod filling). Tikka disease (brown spots)—spray Chlorothalonil. Aphids and Thrips—spray Dimethoate. Harvest when leaves turn yellow (120-140 days). Varieties: TG-37A, Kadiri-6.',
      'chickpea': 'Chickpea/Gram (Cicer arietinum) is a Rabi pulse. Sow in Oct-Nov at 30x10cm spacing. Inoculate with Rhizobium. Apply 20:40:20 NPK kg/ha. Wilt disease—use resistant varieties like JG-11, JG-16. Pod borer damages pods—spray NPV or Quinalphos. Harvest when 80% pods turn brown. Varieties: JG-130, Pusa-362.',
      'banana': 'Banana (Musa) requires well-drained soil rich in organic matter. Plant suckers at 1.8x1.8m spacing. Apply 200:60:300g NPK per plant per year in 10 splits. Panama Wilt (Fusarium)—use tissue culture plants. Sigatoka leaf spot—spray Propiconazole. Bunch covers protect from pests. Harvest when fingers are full and rounded. Varieties: Grand Naine, Robusta.',
      'mango': 'Mango (Mangifera indica) requires deep, well-drained soil. Plant grafted saplings at 10x10m spacing. Apply 1kg N, 0.5kg P2O5, 1kg K2O per tree per year. Powdery Mildew on flowers—spray Sulfur. Fruit fly—use methyl eugenol traps. Anthracnose on fruits—spray Carbendazim. Flowering: Dec-Feb, Harvest: May-July. Varieties: Alphonso, Dasheri, Kesar.',

      // --- SOIL & NUTRIENTS (Expanded) ---
      'clay soil': 'Clay soil has >40% clay particles, high water retention but poor drainage and aeration. Heavy to work. Add organic matter (5-10 tons compost/ha) and Gypsum (2-5 tons/ha) to improve structure. Avoid working when wet. Suitable for rice, wheat in irrigated conditions. Deep tillage helps root penetration.',
      'sandy soil': 'Sandy soil has >70% sand, drains too fast, low water and nutrient retention. Add 10-15 tons organic compost/ha annually. Use drip irrigation or frequent light irrigation. Apply fertilizers in small, frequent doses. Mulching reduces water loss. Suitable for groundnut, watermelon, carrot with proper management.',
      'loam soil': 'Loam is ideal soil (~40% sand, 40% silt, 20% clay). Good drainage, water retention, and aeration. Suitable for almost all crops. Maintain fertility with crop rotation, green manure, and balanced fertilization. pH 6-7 is optimal. Regular organic matter addition maintains structure.',
      'black soil': 'Black soil (Regur/Vertisol) is rich in clay (40-60%), high in Ca, Mg but low in N, P. Ideal for cotton, sugarcane, soybean, wheat. Holds moisture well but cracks deeply when dry. Add organic matter to improve structure. Avoid deep tillage when dry. pH 7-8.5.',
      'red soil': 'Red soil is rich in iron oxide (red color), often acidic (pH 5-6.5). Low in N, P, organic matter. Apply Lime 2-5 tons/ha to raise pH. Add organic compost. Suitable for groundnut, pulses, millets, tobacco. Responds well to fertilizers when pH is corrected.',
      'acidic soil': 'Acidic soil (pH <6) limits nutrient availability, especially P, Ca, Mg. Aluminum toxicity may occur. Apply Agricultural Lime (CaCO3) 2-5 tons/ha based on pH. Use acid-tolerant crops like tea, pineapple if uncorrected. Soil test every 2-3 years to monitor pH.',
      'alkaline soil': 'Alkaline/Sodic soil (pH >7.5) causes micronutrient deficiencies (Zn, Fe, Mn). Apply Gypsum 5-10 tons/ha to displace sodium. Use acidifying fertilizers like Ammonium Sulfate. Grow salt-tolerant crops initially. Leaching with good quality water helps. Add organic matter and Sulfur.',
      'nitrogen deficiency': 'Nitrogen deficiency: Older leaves turn pale yellow (chlorosis) in V-shape from tip. Stunted growth, thin stems. Apply Urea 50-100kg/ha or Ammonium Sulfate. Side-dress during vegetative stage. Organic: Apply FYM, compost, or green manure (Dhaincha, Sunhemp). Legumes fix atmospheric N.',
      'phosphorus deficiency': 'Phosphorus deficiency: Leaves turn dark green/purple, especially on undersides. Poor root development, delayed maturity. Apply DAP (Di-Ammonium Phosphate) 100-150kg/ha or SSP (Single Super Phosphate) 200-300kg/ha as basal dose. Rock phosphate for long-term. Organic: Bone meal.',
      'potassium deficiency': 'Potassium deficiency: Leaf edges and tips turn brown/scorched (marginal necrosis). Weak stems, lodging. Poor fruit quality. Apply MOP (Muriate of Potash) 50-100kg/ha or SOP (Sulfate of Potash) for quality crops. Organic: Wood ash, compost. Critical during fruiting stage.',
      'zinc deficiency': 'Zinc deficiency: \"Khaira\" disease in rice (brown spots on leaves). Small leaves, short internodes in fruit trees. Apply Zinc Sulfate 25kg/ha as basal or 0.5% foliar spray. Mix with Lime to prevent fixation in alkaline soil. Common in alkaline and sandy soils.',

      // --- PESTS & DISEASES (Expanded) ---
      'aphids': 'Aphids are small, soft-bodied sap-sucking insects (green/black/brown). Cause leaf curling, stunted growth, honeydew secretion (leads to sooty mold). Transmit viral diseases. Control: Neem oil 3ml/L spray, release Ladybugs/Lacewings, yellow sticky traps. Chemical: Imidacloprid 0.3ml/L, Dimethoate 2ml/L. Monitor undersides of young leaves.',
      'whiteflies': 'Whiteflies are tiny white flying insects. Suck sap and transmit viral diseases (Leaf Curl, Yellow Mosaic). Cause yellowing, honeydew. Control: Yellow sticky traps, Neem oil spray, keep field weed-free. Chemical: Imidacloprid, Thiamethoxam, Spiromesifen. Spray early morning when they are less active.',
      'bollworm': 'Bollworms (Helicoverpa, Earias) bore into cotton bolls, tomato fruits, chickpea pods. Larvae feed inside. Use Pheromone traps for monitoring. Handpick and destroy larvae. Spray NPV (Nuclear Polyhedrosis Virus) or Bacillus thuringiensis (Bt). Chemical: Chlorantraniliprole, Spinosad. Destroy crop residues after harvest.',
      'termites': 'Termites attack roots and stems, especially in dry soil and organic matter. Cause wilting, plant death. Treat seeds with Chlorpyriphos 4ml/kg seed. Apply Neem cake 250kg/ha in soil. Avoid undecomposed organic matter. Chemical: Chlorpyriphos 2.5L/ha soil drench. Maintain soil moisture.',
      'stem borer': 'Stem borers (Scirpophaga in rice, Chilo in sugarcane) bore into stems causing \"dead hearts\" in vegetative stage, \"white ears\" in reproductive stage. Use Pheromone traps. Release Trichogramma egg parasitoids @ 50,000/ha. Spray Cartap Hydrochloride or Chlorantraniliprole. Remove and destroy stubbles.',
      'fruit fly': 'Fruit flies (Bactrocera) lay eggs in fruits. Maggots feed inside causing fruit drop and rot. Use Methyl Eugenol traps for males. Bait spray: Protein hydrolysate + Malathion. Collect and destroy fallen fruits. Spray Spinosad. Cover fruits with paper bags. Maintain field sanitation.',
      'blight disease': 'Blight causes rapid browning and death of leaves/stems. Early Blight (Alternaria): Concentric rings on leaves—spray Mancozeb 2g/L. Late Blight (Phytophthora): Water-soaked lesions, white mold on underside—spray Metalaxyl+Mancozeb. Bacterial Blight: Water-soaked spots—spray Copper Oxychloride 3g/L. Remove infected parts.',
      'rust disease': 'Rust diseases appear as rusty/orange powdery pustules on leaves (wheat, pea, beans). Yellow Rust, Brown Rust, Black Rust in wheat. Reduces photosynthesis. Plant resistant varieties. Spray Sulfur-based fungicides or Propiconazole. Remove alternate hosts. Avoid excess nitrogen. Ensure good air circulation.',
      'powdery mildew': 'Powdery Mildew: White powdery coating on leaves, stems, fruits. Common in dry weather with cool nights. Reduces photosynthesis. Spray Wettable Sulfur 2g/L or Hexaconazole 1ml/L. Improve air circulation. Avoid overhead irrigation. Remove infected parts. Resistant varieties available for many crops.',
      'wilt disease': 'Wilt diseases (Fusarium, Verticillium, Bacterial) cause sudden wilting and plant death. Vascular browning visible in stem cross-section. Soil-borne, difficult to control. Use resistant varieties. Crop rotation with non-hosts. Soil solarization. Trichoderma application. Avoid waterlogging. Remove and burn infected plants.',

      // --- FARMING TECHNIQUES (Expanded) ---
      'drip irrigation': 'Drip irrigation delivers water directly to root zone through emitters. Saves 30-50% water, reduces weed growth, precise fertilizer application (fertigation). Suitable for row crops, orchards, vegetables. Components: Pump, filters, mainline, laterals, emitters. Subsidy available under PMKSY. Maintenance: Clean filters regularly, flush lines, check for clogging.',
      'sprinkler irrigation': 'Sprinkler irrigation sprays water like rain. Suitable for uneven terrain, light soils, field crops. Saves 30-40% water vs flood. Types: Portable, Semi-portable, Solid-set, Center pivot. Avoid in high wind. Not suitable for crops sensitive to foliar wetness. Subsidy available. Maintenance: Check nozzles, pressure, uniformity.',
      'hydroponics': 'Hydroponics grows plants in nutrient solution without soil. Saves 90% water, higher yields, year-round production. Systems: NFT (Nutrient Film Technique), DWC (Deep Water Culture), Ebb & Flow, Drip. Suitable for leafy greens (lettuce, spinach), herbs, tomato, cucumber. Requires technical knowledge, electricity, quality water. pH 5.5-6.5, EC 1.5-2.5.',
      'organic farming': 'Organic farming avoids synthetic chemicals, focuses on soil health. Use compost, FYM, vermicompost, green manure, bio-fertilizers (Rhizobium, Azotobacter, PSB). Pest control: Neem, Panchagavya, NPV, Trichoderma. Certification: NPOP (India), USDA, EU. Premium prices (20-40% higher). 3-year conversion period. Maintain records.',
      'mulching': 'Mulching covers soil surface to conserve moisture, suppress weeds, regulate temperature, prevent erosion. Types: Organic (straw, leaves, crop residues), Plastic (black, silver). Organic mulch adds nutrients. Plastic mulch increases soil temperature (good for winter crops). Apply 5-10cm thick. Drip irrigation under plastic mulch.',
      'crop rotation': 'Crop rotation: Growing different crop families in sequence. Breaks pest/disease cycles, improves soil fertility, reduces weed pressure. Example: Rice → Wheat → Legume → Vegetable. Include legumes to fix nitrogen. Avoid same family back-to-back (e.g., Tomato then Potato both Solanaceae). 3-4 year rotation ideal.',
      'greenhouse farming': 'Greenhouse/Polyhouse: Protected cultivation under transparent cover. Controls temperature, humidity, light, pests. Suitable for high-value crops: Capsicum, Cucumber, Tomato, Flowers, Strawberry. Types: Naturally ventilated, Climate-controlled. Subsidy available under MIDH. Higher investment but 3-4x yields. Requires technical knowledge.',
      'vertical farming': 'Vertical farming: Growing crops in stacked layers indoors using LED lights, hydroponics/aeroponics. Saves 95% water, 99% land, no pesticides, year-round production. Suitable for urban areas, leafy greens, herbs, strawberries. High initial investment, electricity cost. Controlled environment: temperature, humidity, CO2, light spectrum.',
      'precision agriculture': 'Precision Agriculture uses technology for site-specific management. GPS-guided tractors, soil sensors, drones, satellite imagery, variable rate application. Optimizes inputs (seeds, fertilizers, water, pesticides), increases efficiency, reduces waste. Soil mapping, yield monitoring, crop health assessment. Requires investment and technical knowledge.',

      // --- GOVERNMENT SCHEMES (Expanded) ---
      'pm kisan scheme': 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi): ₹6,000/year income support to landholding farmers in 3 installments of ₹2,000 each (April, August, December). All landholding farmers eligible. Register at pmkisan.gov.in with Aadhaar, bank account, land records. Direct Benefit Transfer (DBT) to bank account.',
      'kisan credit card': 'Kisan Credit Card (KCC): Short-term credit for crop production, post-harvest expenses, household needs. Interest: 7% (4% with timely repayment + 3% interest subvention). Limit based on cropping pattern and land. Apply at any bank with land records, Aadhaar. Renewable annually. Insurance coverage included.',
      'fasal bima yojana': 'Pradhan Mantri Fasal Bima Yojana (PMFBY): Crop insurance against natural calamities (drought, flood, hail, cyclone, pest/disease). Premium: 1.5% for Rabi, 2% for Kharif, 5% for horticulture. Rest paid by government. Enroll within cutoff dates. Claim based on Crop Cutting Experiments (CCE). Covers pre-sowing to post-harvest.',
      'soil health card': 'Soil Health Card (SHC) Scheme: Free soil testing every 2 years. Tests 12 parameters: N, P, K, pH, EC, OC, S, Zn, Fe, Cu, Mn, B. Provides crop-wise fertilizer recommendations. Collect samples from Block Agriculture Office or Soil Testing Lab. Results in 15-30 days. Follow recommendations for balanced nutrition.',
      'pmksy subsidy': 'Pradhan Mantri Krishi Sinchayee Yojana (PMKSY): Subsidy for micro-irrigation (Drip, Sprinkler). Subsidy: 55% for small/marginal farmers, 45% for others, 55% in NE states. Apply through District Agriculture Office. Technical approval required. Includes Per Drop More Crop component. Promotes water use efficiency.',
      'kusum scheme': 'PM-KUSUM (Pradhan Mantri Kisan Urja Suraksha evam Utthaan Mahabhiyan): Subsidy for solar pumps and grid-connected solar power plants on farmland. Component A: Solar power plants (500kW-2MW). Component B: Standalone solar pumps (30% subsidy). Component C: Solarization of grid-connected pumps. Apply through DISCOM or State Nodal Agency.',
      'enam platform': 'e-NAM (National Agriculture Market): Online trading platform for agricultural commodities. 1,000+ mandis integrated. Farmers can see prices across markets, get better price discovery. Register with mandi, get e-NAM card. Trade online or through commission agents. Payment within 24 hours. Reduces intermediaries.',
      'minimum support price': 'Minimum Support Price (MSP): Government-announced minimum price for 23 crops to ensure farmer income. Procurement at MSP by FCI, state agencies. Major crops: Paddy, Wheat, Pulses, Oilseeds, Cotton, Sugarcane. Announced before sowing season. Sell at MSP procurement centers with quality norms. Payment within 3-7 days.',

      // --- GENERAL TOPICS ---
      'weather forecast': 'Always check 3-7 day weather forecast before farm operations. Don\'t spray pesticides/fertilizers if rain expected within 24 hours. Postpone irrigation if rain forecast. Harvest mature crops before heavy rain. Use IMD (India Meteorological Department) app, Meghdoot app, or local Krishi Vigyan Kendra for advisories.',
      'market prices': 'Check market prices before selling. e-NAM platform shows prices across 1000+ mandis. Agmarknet.gov.in for daily prices. Sell when prices are high (festivals, lean season). Grading and packaging increase price by 15-30%. Consider FPO (Farmer Producer Organization) for collective marketing. Avoid distress sale immediately after harvest.',
      'soil testing': 'Soil testing is essential for balanced fertilization. Test every 2-3 years. Collect samples from 0-15cm depth, 8-10 spots, mix, take 500g. Tests: pH, EC, OC, N, P, K, S, Zn, Fe, Mn, Cu, B. Free under SHC scheme. Follow recommendations to save fertilizer cost by 20-30% and increase yield by 10-15%.',
      'compost making': 'Composting converts organic waste into nutrient-rich manure. Aerobic method: Layer crop residues, FYM, soil in 1:1:1 ratio. Keep moist, turn every 15 days. Ready in 3-4 months. Vermicomposting: Use Eisenia fetida earthworms. Ready in 45-60 days. C:N ratio 20-30:1. Compost adds organic matter, improves soil structure, provides slow-release nutrients.',
      'integrated pest management': 'IPM (Integrated Pest Management): Holistic approach using multiple tactics. Cultural: Crop rotation, resistant varieties, timely sowing. Mechanical: Handpicking, traps, barriers. Biological: Natural enemies, biopesticides (NPV, Bt, Trichoderma). Chemical: Last resort, use judiciously. Monitor pest levels, spray only when Economic Threshold Level (ETL) exceeded. Reduces pesticide use by 30-50%.'
    };

    // Logic: Find the LONGEST matching keyword from the FALLBACK KB.
    // This ensures specific matches (e.g., "black soil") beat generic ones (e.g., "soil").
    let bestMatch = null;
    let maxLen = 0;

    for (const key in responses) {
      if (lowerQuestion.includes(key)) {
        if (key.length > maxLen) {
          maxLen = key.length;
          bestMatch = responses[key];
        }
      }
    }

    // Word-level fuzzy match if no exact key match found
    if (!bestMatch) {
      const words = lowerQuestion.split(/\s+/).filter(w => w.length > 3);
      outerLoop: for (const word of words) {
        for (const key in responses) {
          if (key.startsWith(word) || key.includes(word)) {
            bestMatch = responses[key];
            break outerLoop;
          }
        }
      }
    }

    const advice = bestMatch ||
      `Thank you for your question! 🌱 Here is expert farming guidance:

**Soil Health First:** Get a free Soil Health Card soil test (N, P, K, pH, EC, Zn, Fe, etc.). Balanced fertilization saves 20-30% cost and boosts yield 10-15%.

**Crop Selection:** Kharif crops (rice, cotton, maize, soybean) — sow June-July. Rabi crops (wheat, chickpea, mustard) — sow October-November. Zaid crops (watermelon, moong) — sow Feb-March.

**Water Management:** Drip or sprinkler irrigation saves 30-50% water. PMKSY scheme gives 45-55% subsidy on micro-irrigation.

**Pest Control (IPM):** Resistant varieties + crop rotation → mechanical traps → Neem oil/bio-agents (Trichoderma, Bt) → chemicals only at threshold level.

**Government Support:** PM-KISAN gives ₹6,000/year direct income | PMFBY crop insurance at 1.5-2% premium | KCC loans at 4% interest | Free Soil Health Card every 2 years.

For specific advice, ask about a crop (e.g., "How to grow wheat?"), a pest/disease (e.g., "Aphid control in cotton"), soil issue (e.g., "Acidic soil treatment"), or scheme (e.g., "Kisan Credit Card eligibility"). 🌾`;

    // Save to chat history
    await saveChatMessage(req.user._id, sessionId, question, advice);

    res.json({
      question,
      answer: advice,
      timestamp: new Date(),
      userId: req.user._id,
      source: 'Local DB'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Get chat history for a session
router.get('/history/:sessionId', authMiddleware, async (req, res) => {
  try {
    const chatHistory = await ChatHistory.findOne({
      userId: req.user._id,
      sessionId: req.params.sessionId
    });

    if (!chatHistory) {
      return res.json({ messages: [] });
    }

    res.json({ messages: chatHistory.messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all chat sessions for a user
router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    const sessions = await ChatHistory.find({ userId: req.user._id })
      .select('sessionId topic lastActivity createdAt')
      .sort({ lastActivity: -1 });

    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a chat session
router.delete('/sessions/:sessionId', authMiddleware, async (req, res) => {
  try {
    await ChatHistory.findOneAndDelete({
      userId: req.user._id,
      sessionId: req.params.sessionId
    });

    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to save chat messages
async function saveChatMessage(userId, sessionId, userMessage, assistantMessage) {
  try {
    const session = sessionId || `session_${Date.now()}`;

    let chatHistory = await ChatHistory.findOne({ userId, sessionId: session });

    if (!chatHistory) {
      chatHistory = new ChatHistory({
        userId,
        sessionId: session,
        messages: []
      });
    }

    // Add user message
    chatHistory.messages.push({
      role: 'user',
      content: userMessage
    });

    // Add assistant message
    chatHistory.messages.push({
      role: 'assistant',
      content: assistantMessage
    });

    chatHistory.lastActivity = new Date();
    await chatHistory.save();

    return session;
  } catch (error) {
    console.error('Error saving chat message:', error);
  }
}

module.exports = router;
