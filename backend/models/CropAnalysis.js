const mongoose = require('mongoose');

const cropAnalysisSchema = new mongoose.Schema({
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
        cropName: String,
        scientificName: String,
        growthStage: String,
        health: {
            status: String,
            score: Number
        },
        diseases: [{
            name: String,
            severity: String,
            treatment: String
        }],
        pests: [{
            name: String,
            severity: String,
            treatment: String
        }],
        recommendations: [String],
        careInstructions: {
            watering: String,
            fertilization: String,
            pruning: String,
            pestControl: String
        },
        harvestPrediction: {
            estimatedDays: Number,
            expectedYield: String
        }
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
cropAnalysisSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('CropAnalysis', cropAnalysisSchema);
