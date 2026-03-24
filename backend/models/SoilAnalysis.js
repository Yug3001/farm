const mongoose = require('mongoose');

const soilAnalysisSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    analysis: {
        soilType: String,
        texture: String,
        color: String,
        moisture: String,
        organicMatter: String,
        pH: {
            value: String,
            category: String
        },
        nutrients: {
            nitrogen: String,
            phosphorus: String,
            potassium: String
        },
        recommendations: [String],
        suitableCrops: [String],
        improvements: [String]
    },
    location: {
        type: String
    },
    notes: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for user queries
soilAnalysisSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('SoilAnalysis', soilAnalysisSchema);
