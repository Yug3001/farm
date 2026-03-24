const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sessionId: {
        type: String,
        required: true
    },
    messages: [{
        role: {
            type: String,
            enum: ['user', 'assistant'],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    topic: {
        type: String,
        default: 'General Farming Advice'
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for user and session queries
chatHistorySchema.index({ userId: 1, sessionId: 1 });
chatHistorySchema.index({ userId: 1, lastActivity: -1 });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
