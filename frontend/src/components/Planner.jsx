import React, { useState } from 'react';
import './Planner.css';

const Planner = () => {
    const [selectedSeason, setSelectedSeason] = useState(null);

    const seasons = [
        { id: 'summer', name: 'Summer', icon: '☀️', color: '#FFD54F', desc: 'March to June' },
        { id: 'monsoon', name: 'Monsoon', icon: '🌧️', color: '#90CAF9', desc: 'July to October' },
        { id: 'autumn', name: 'Autumn', icon: '🍂', color: '#FFAB91', desc: 'October to November' },
        { id: 'winter', name: 'Winter', icon: '❄️', color: '#B0BEC5', desc: 'December to February' },
        { id: 'spring', name: 'Spring', icon: '🌸', color: '#A5D6A7', desc: 'February to March' }
    ];

    const cropsData = {
        summer: [
            { name: 'Watermelon', duration: '80-100 days', water: 'Regular', profit: 'High', soil: 'Sandy Loam', temp: '25-35°C', spacing: '2x2m', tips: 'Drip irrigation saves 40% water. Mulch to retain moisture.' },
            { name: 'Cucumber', duration: '50-70 days', water: 'High', profit: 'Medium', soil: 'Well-drained', temp: '20-30°C', spacing: '60x45cm', tips: 'Use vertical trellising. Harvest daily for continuous yield.' },
            { name: 'Okra (Lady Finger)', duration: '60-180 days', water: 'Medium', profit: 'Medium', soil: 'Loamy', temp: '25-35°C', spacing: '45x30cm', tips: 'Pick pods when 7-10cm long. Rich in Vitamin C.' },
            { name: 'Bitter Gourd', duration: '55-60 days', water: 'Regular', profit: 'High', soil: 'Well-drained', temp: '24-27°C', spacing: '2x1m', tips: 'Needs support structure. Medicinal value adds premium.' },
            { name: 'Pumpkin', duration: '90-120 days', water: 'Medium', profit: 'Medium', soil: 'Rich Loam', temp: '18-27°C', spacing: '3x3m', tips: 'Store in cool, dry place for 3-6 months.' },
            { name: 'Bottle Gourd', duration: '60-80 days', water: 'Regular', profit: 'Medium', soil: 'Sandy Loam', temp: '24-27°C', spacing: '2x1.5m', tips: 'Harvest young for better taste. Grows on trellis.' },
            { name: 'Ridge Gourd', duration: '55-65 days', water: 'Medium', profit: 'Medium', soil: 'Well-drained', temp: '25-30°C', spacing: '2x1m', tips: 'Drought-tolerant. Harvest every 2-3 days.' },
            { name: 'Chilli', duration: '90-150 days', water: 'Regular', profit: 'Very High', soil: 'Sandy Loam', temp: '20-30°C', spacing: '60x45cm', tips: 'Sun-dry for storage. High market demand year-round.' },
            { name: 'Brinjal (Eggplant)', duration: '100-120 days', water: 'Regular', profit: 'High', soil: 'Well-drained', temp: '25-30°C', spacing: '75x60cm', tips: 'Stake plants for support. Harvest when glossy.' },
            { name: 'Cluster Beans', duration: '60-90 days', water: 'Low', profit: 'Medium', soil: 'Sandy', temp: '25-35°C', spacing: '30x10cm', tips: 'Drought-resistant. Fixes nitrogen in soil.' },
            { name: 'Muskmelon', duration: '80-90 days', water: 'Medium', profit: 'High', soil: 'Sandy Loam', temp: '25-30°C', spacing: '1.5x1m', tips: 'Sweet aroma when ripe. Premium export crop.' },
            { name: 'Amaranth (Leafy)', duration: '30-40 days', water: 'Low', profit: 'Medium', soil: 'Any', temp: '20-30°C', spacing: '30x15cm', tips: 'Fast-growing. Rich in iron and protein.' }
        ],
        monsoon: [
            { name: 'Rice (Paddy)', duration: '120-150 days', water: 'Very High', profit: 'High', soil: 'Clay Loam', temp: '20-35°C', spacing: '20x15cm', tips: 'SRI method saves 30% water. Alternate wetting-drying conserves water.' },
            { name: 'Maize (Corn)', duration: '90-110 days', water: 'Medium', profit: 'Medium', soil: 'Well-drained', temp: '21-27°C', spacing: '60x20cm', tips: 'Intercrop with legumes. Store kernels in airtight containers.' },
            { name: 'Soybean', duration: '85-110 days', water: 'Medium', profit: 'High', soil: 'Well-drained', temp: '25-30°C', spacing: '45x5cm', tips: 'Inoculate seeds with Rhizobium. Fixes nitrogen naturally.' },
            { name: 'Cotton', duration: '150-180 days', water: 'Medium', profit: 'High', soil: 'Black Soil', temp: '21-30°C', spacing: '90x60cm', tips: 'BT varieties resist pests. Avoid waterlogging.' },
            { name: 'Turmeric', duration: '7-9 months', water: 'High', profit: 'Very High', soil: 'Loamy', temp: '20-30°C', spacing: '30x20cm', tips: 'Shade-tolerant. Boil and sun-dry for storage.' },
            { name: 'Ginger', duration: '8-10 months', water: 'High', profit: 'Very High', soil: 'Well-drained', temp: '25-30°C', spacing: '30x20cm', tips: 'Mulch heavily. Store in sand for freshness.' },
            { name: 'Groundnut', duration: '100-150 days', water: 'Medium', profit: 'High', soil: 'Sandy Loam', temp: '25-30°C', spacing: '30x10cm', tips: 'Fixes nitrogen. Rotate with cereals.' },
            { name: 'Pearl Millet (Bajra)', duration: '75-90 days', water: 'Low', profit: 'Medium', soil: 'Sandy', temp: '25-35°C', spacing: '45x15cm', tips: 'Drought-resistant. Nutritious grain for dry regions.' },
            { name: 'Finger Millet (Ragi)', duration: '120-130 days', water: 'Low', profit: 'Medium', soil: 'Red/Black', temp: '25-30°C', spacing: '22x10cm', tips: 'High calcium content. Long storage life (2+ years).' },
            { name: 'Pigeon Pea (Arhar)', duration: '150-180 days', water: 'Low', profit: 'High', soil: 'Well-drained', temp: '20-30°C', spacing: '60x20cm', tips: 'Drought-tolerant. Improves soil fertility.' },
            { name: 'Green Gram (Moong)', duration: '60-75 days', water: 'Low', profit: 'High', soil: 'Loamy', temp: '25-35°C', spacing: '30x10cm', tips: 'Short duration. Good for crop rotation.' },
            { name: 'Black Gram (Urad)', duration: '75-90 days', water: 'Medium', profit: 'High', soil: 'Clay Loam', temp: '25-35°C', spacing: '30x10cm', tips: 'Fixes nitrogen. High protein pulse.' },
            { name: 'Sesame (Til)', duration: '90-120 days', water: 'Low', profit: 'Medium', soil: 'Well-drained', temp: '25-30°C', spacing: '30x10cm', tips: 'Drought-resistant. Oil-rich seeds.' }
        ],
        autumn: [
            { name: 'Mustard', duration: '100-110 days', water: 'Low', profit: 'Medium', soil: 'Loamy', temp: '10-25°C', spacing: '30x10cm', tips: 'Oilseed crop. Green manure option.' },
            { name: 'Spinach', duration: '45-60 days', water: 'Low', profit: 'Medium', soil: 'Well-drained', temp: '15-20°C', spacing: '30x5cm', tips: 'Successive sowing for continuous harvest. Rich in iron.' },
            { name: 'Radish', duration: '40-50 days', water: 'Regular', profit: 'Medium', soil: 'Loose Loam', temp: '10-18°C', spacing: '15x5cm', tips: 'Fast-growing. Harvest when 2-3cm diameter.' },
            { name: 'Turnip', duration: '50-60 days', water: 'Regular', profit: 'Medium', soil: 'Well-drained', temp: '15-20°C', spacing: '30x10cm', tips: 'Cool season crop. Both root and leaves edible.' },
            { name: 'Carrot', duration: '70-80 days', water: 'Regular', profit: 'High', soil: 'Sandy Loam', temp: '16-20°C', spacing: '30x5cm', tips: 'Deep, loose soil needed. High in Vitamin A.' },
            { name: 'Beetroot', duration: '55-70 days', water: 'Regular', profit: 'Medium', soil: 'Loamy', temp: '15-20°C', spacing: '30x10cm', tips: 'Tolerates light frost. Rich in folate.' },
            { name: 'Coriander (Dhania)', duration: '40-50 days', water: 'Low', profit: 'High', soil: 'Well-drained', temp: '15-25°C', spacing: '20x5cm', tips: 'Multiple harvests possible. High demand herb.' },
            { name: 'Fenugreek (Methi)', duration: '30-40 days', water: 'Low', profit: 'Medium', soil: 'Loamy', temp: '10-25°C', spacing: '20x5cm', tips: 'Medicinal herb. Improves soil nitrogen.' },
            { name: 'Lettuce', duration: '45-55 days', water: 'Regular', profit: 'High', soil: 'Rich Loam', temp: '15-20°C', spacing: '30x25cm', tips: 'Grows well in shade. Premium salad crop.' },
            { name: 'Celery', duration: '85-120 days', water: 'High', profit: 'Medium', soil: 'Rich, moist', temp: '15-21°C', spacing: '30x30cm', tips: 'Needs consistent moisture. Aromatic vegetable.' }
        ],
        winter: [
            { name: 'Wheat', duration: '120-140 days', water: 'Medium', profit: 'High', soil: 'Loamy', temp: '12-25°C', spacing: 'Broadcasting', tips: 'CRI stage (21 days) critical for irrigation. Store in dry bins.' },
            { name: 'Barley', duration: '55-60 days', water: 'Low', profit: 'Medium', soil: 'Well-drained', temp: '12-15°C', spacing: 'Broadcasting', tips: 'Drought-tolerant. Good for saline soils.' },
            { name: 'Potato', duration: '90-120 days', water: 'Medium', profit: 'High', soil: 'Sandy Loam', temp: '15-20°C', spacing: '60x20cm', tips: 'Earth up plants. Store in dark, cool place (4-8°C).' },
            { name: 'Peas', duration: '60-70 days', water: 'Medium', profit: 'High', soil: 'Well-drained', temp: '10-18°C', spacing: '30x5cm', tips: 'Fixes nitrogen. Harvest when pods are full.' },
            { name: 'Cauliflower', duration: '85-90 days', water: 'Regular', profit: 'Medium', soil: 'Rich Loam', temp: '15-20°C', spacing: '60x45cm', tips: 'Tie leaves over curd for whiteness. High water need.' },
            { name: 'Cabbage', duration: '80-100 days', water: 'Regular', profit: 'Medium', soil: 'Heavy Loam', temp: '15-20°C', spacing: '45x45cm', tips: 'Harvest when heads are firm. Cold storage extends life.' },
            { name: 'Broccoli', duration: '70-100 days', water: 'Regular', profit: 'High', soil: 'Rich Loam', temp: '15-18°C', spacing: '45x45cm', tips: 'Premium export crop. Harvest before flowers open.' },
            { name: 'Onion', duration: '120-150 days', water: 'Medium', profit: 'High', soil: 'Well-drained', temp: '13-24°C', spacing: '15x10cm', tips: 'Cure in shade before storage. Long shelf life.' },
            { name: 'Garlic', duration: '150-180 days', water: 'Low', profit: 'Very High', soil: 'Sandy Loam', temp: '12-20°C', spacing: '15x10cm', tips: 'Plant cloves. Braid and hang for storage.' },
            { name: 'Chickpea (Chana)', duration: '100-120 days', water: 'Low', profit: 'High', soil: 'Well-drained', temp: '20-25°C', spacing: '30x10cm', tips: 'Drought-tolerant pulse. Fixes nitrogen.' },
            { name: 'Lentil (Masoor)', duration: '110-130 days', water: 'Low', profit: 'High', soil: 'Loamy', temp: '18-30°C', spacing: '30x5cm', tips: 'Cool season pulse. High protein content.' },
            { name: 'Broad Beans', duration: '90-110 days', water: 'Medium', profit: 'Medium', soil: 'Heavy Loam', temp: '15-20°C', spacing: '60x30cm', tips: 'Frost-tolerant. Improves soil structure.' },
            { name: 'Strawberry', duration: '4-5 months', water: 'Regular', profit: 'Very High', soil: 'Sandy Loam', temp: '15-25°C', spacing: '30x30cm', tips: 'Mulch with straw. Premium fruit with high returns.' }
        ],
        spring: [
            { name: 'Sunflower', duration: '90-100 days', water: 'Medium', profit: 'High', soil: 'Well-drained', temp: '20-25°C', spacing: '60x30cm', tips: 'Oilseed crop. Follows sun movement. Drought-resistant.' },
            { name: 'Tomato', duration: '70-100 days', water: 'Regular', profit: 'High', soil: 'Well-drained', temp: '20-25°C', spacing: '75x60cm', tips: 'Stake plants. Drip irrigation recommended.' },
            { name: 'Capsicum (Bell Pepper)', duration: '70-80 days', water: 'Medium', profit: 'High', soil: 'Rich Loam', temp: '18-25°C', spacing: '60x45cm', tips: 'Greenhouse crop. Premium pricing for colored varieties.' },
            { name: 'Cabbage', duration: '80-100 days', water: 'Regular', profit: 'Medium', soil: 'Heavy Loam', temp: '15-20°C', spacing: '45x45cm', tips: 'Cool season crop. Harvest when heads are firm.' },
            { name: 'French Beans', duration: '50-60 days', water: 'Regular', profit: 'High', soil: 'Well-drained', temp: '15-25°C', spacing: '45x10cm', tips: 'Bush or pole varieties. Harvest tender pods.' },
            { name: 'Sweet Corn', duration: '80-100 days', water: 'Medium', profit: 'High', soil: 'Loamy', temp: '18-27°C', spacing: '60x20cm', tips: 'Harvest when kernels are milky. High sugar content.' },
            { name: 'Zucchini', duration: '45-55 days', water: 'Regular', profit: 'Medium', soil: 'Rich Loam', temp: '18-24°C', spacing: '90x90cm', tips: 'Fast-growing. Harvest when 15-20cm long.' },
            { name: 'Squash', duration: '50-65 days', water: 'Medium', profit: 'Medium', soil: 'Well-drained', temp: '18-27°C', spacing: '1x1m', tips: 'Summer and winter varieties available.' },
            { name: 'Basil', duration: '60-90 days', water: 'Regular', profit: 'High', soil: 'Well-drained', temp: '20-30°C', spacing: '30x30cm', tips: 'Aromatic herb. Pinch flowers for bushy growth.' },
            { name: 'Mint', duration: 'Perennial', water: 'High', profit: 'Medium', soil: 'Moist', temp: '15-25°C', spacing: '30x30cm', tips: 'Spreads rapidly. Harvest leaves regularly.' },
            { name: 'Papaya', duration: '9-12 months', water: 'Regular', profit: 'Very High', soil: 'Well-drained', temp: '25-30°C', spacing: '2x2m', tips: 'Year-round fruiting. Rich in Vitamin C.' }
        ]
    };

    return (
        <main className="main" style={{ flexDirection: 'column', alignItems: 'center', padding: '100px 40px 40px 40px' }}>
            <div className="planner-header">
                <h1>Crop Planner</h1>
                <p>Select a season to view recommended crops.</p>
            </div>

            <div className="seasons-grid">
                {seasons.map((season) => (
                    <div
                        key={season.id}
                        className={`season-card ${selectedSeason === season.id ? 'active' : ''}`}
                        onClick={() => setSelectedSeason(season.id)}
                        style={{ borderBottom: `4px solid ${season.color}` }}
                    >
                        <div className="season-icon">{season.icon}</div>
                        <h3>{season.name}</h3>
                        <p>{season.desc}</p>
                    </div>
                ))}
            </div>

            {selectedSeason && (
                <div className="crops-container fade-in">
                    <h2 style={{ marginBottom: '20px', color: '#1f5135' }}>
                        Recommended for {seasons.find(s => s.id === selectedSeason)?.name}
                    </h2>

                    <div className="crops-list">
                        {cropsData[selectedSeason].map((crop, index) => (
                            <div key={index} className="crop-card">
                                <div className="crop-header">
                                    <h4>{crop.name}</h4>
                                </div>
                                <div className="crop-details">
                                    <div className="detail-row">
                                        <span>⏳ Duration:</span>
                                        <strong>{crop.duration}</strong>
                                    </div>
                                    <div className="detail-row">
                                        <span>💧 Water:</span>
                                        <strong>{crop.water}</strong>
                                    </div>
                                    <div className="detail-row">
                                        <span>🌡️ Temperature:</span>
                                        <strong>{crop.temp}</strong>
                                    </div>
                                    <div className="detail-row">
                                        <span>🌱 Soil Type:</span>
                                        <strong>{crop.soil}</strong>
                                    </div>
                                    <div className="detail-row">
                                        <span>📏 Spacing:</span>
                                        <strong>{crop.spacing}</strong>
                                    </div>
                                    <div className="detail-row">
                                        <span>💰 Potential:</span>
                                        <strong style={{ color: crop.profit === 'High' || crop.profit === 'Very High' ? 'green' : '#666' }}>
                                            {crop.profit}
                                        </strong>
                                    </div>
                                    <div className="detail-tips">
                                        <span>💡 Tips:</span>
                                        <p>{crop.tips}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}


        </main>
    );
};

export default Planner;
