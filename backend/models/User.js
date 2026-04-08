const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // ── Core Credentials ────────────────────────────────────────────────────────
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [30, 'Username must not exceed 30 characters'],
        match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters']
    },

    // ── Farm Profile ─────────────────────────────────────────────────────────────
    farmName: {
        type: String,
        trim: true,
        maxlength: [100, 'Farm name is too long']
    },
    location: {
        type: String,
        trim: true,
        maxlength: [100, 'Location is too long']
    },
    preferredLanguage: {
        type: String,
        enum: ['en', 'hi', 'gu', 'mr'],
        default: 'en'
    },
    // Optional: user's main crop (for personalized advice)
    primaryCrop: {
        type: String,
        trim: true,
        maxlength: [50, 'Crop name is too long']
    },

    // ── Brute-Force / Account Lockout Protection ─────────────────────────────────
    loginAttempts: { type: Number, default: 0 },
    lockUntil:     { type: Date,   default: null },

    // ── Token Rotation ────────────────────────────────────────────────────────────
    tokenVersion: { type: Number, default: 0 },

    // ── Activity Tracking (auto-updated on every action) ─────────────────────────
    lastLogin:   { type: Date },
    lastLoginIP: { type: String, default: '' },
    loginCount:  { type: Number, default: 0 }, // how many times user has logged in

    // Feature usage counters — auto-incremented on the backend
    usageStats: {
        advisorQuestionsAsked: { type: Number, default: 0 },  // total chat questions
        soilAnalysisCount:     { type: Number, default: 0 },  // total soil scans
        cropAnalysisCount:     { type: Number, default: 0 },  // total crop scans
        plannersCreated:       { type: Number, default: 0 },  // planner tasks added
        remindersSet:          { type: Number, default: 0 },  // reminders configured
        lastAdvisorUse:        { type: Date },
        lastSoilScan:          { type: Date },
        lastCropScan:          { type: Date },
    },

    // Session device fingerprint (for audit/security)
    lastDevice: {
        userAgent:  { type: String, default: '' },
        browser:    { type: String, default: '' },
        platform:   { type: String, default: '' },
    },

    // Account status
    isActive:   { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false }, // for future email verification

}, {
    timestamps: true, // auto-manages createdAt + updatedAt on every save
});

// ── Indexes ────────────────────────────────────────────────────────────────────
// email and username indexes are auto-created by `unique: true`
userSchema.index({ 'usageStats.lastAdvisorUse': -1 }); // for sorting active users
userSchema.index({ createdAt: -1 });                   // for admin queries

// ── Virtual ───────────────────────────────────────────────────────────────────
userSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ── Constants ──────────────────────────────────────────────────────────────────
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MINUTES  = 30;

// ── Methods ───────────────────────────────────────────────────────────────────

/** Called after every FAILED login attempt */
userSchema.methods.incLoginAttempts = async function () {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({ $set: { loginAttempts: 1, lockUntil: null } });
    }
    const updates = { $inc: { loginAttempts: 1 } };
    if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
        updates.$set = { lockUntil: new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000) };
        console.warn(`[SECURITY] Account locked: ${this.email}`);
    }
    return this.updateOne(updates);
};

/** Called after SUCCESSFUL login — resets counters & records metadata */
userSchema.methods.resetLoginAttempts = async function (ip = '', userAgent = '') {
    const browser  = parseBrowser(userAgent);
    const platform = parsePlatform(userAgent);
    return this.updateOne({
        $set: {
            loginAttempts: 0,
            lockUntil:     null,
            lastLogin:     new Date(),
            lastLoginIP:   ip,
            'lastDevice.userAgent': userAgent.slice(0, 200),
            'lastDevice.browser':  browser,
            'lastDevice.platform': platform,
        },
        $inc: { loginCount: 1 }
    });
};

/** Invalidates ALL existing JWTs (on logout or password change) */
userSchema.methods.invalidateTokens = async function () {
    return this.updateOne({ $inc: { tokenVersion: 1 } });
};

/**
 * Increment a usage counter.
 * @param {'advisor' | 'soil' | 'crop' | 'planner' | 'reminder'} feature
 */
userSchema.methods.trackUsage = async function (feature) {
    const now = new Date();
    const fieldMap = {
        advisor: { counter: 'usageStats.advisorQuestionsAsked', date: 'usageStats.lastAdvisorUse' },
        soil:    { counter: 'usageStats.soilAnalysisCount',     date: 'usageStats.lastSoilScan' },
        crop:    { counter: 'usageStats.cropAnalysisCount',     date: 'usageStats.lastCropScan' },
        planner: { counter: 'usageStats.plannersCreated' },
        reminder:{ counter: 'usageStats.remindersSet' },
    };
    const map = fieldMap[feature];
    if (!map) return;

    const update = { $inc: { [map.counter]: 1 } };
    if (map.date) update.$set = { [map.date]: now };
    return this.updateOne(update);
};

// ── Utility Parsers ───────────────────────────────────────────────────────────

function parseBrowser(ua = '') {
    if (!ua) return 'Unknown';
    if (ua.includes('Chrome'))  return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari'))  return 'Safari';
    if (ua.includes('Edge'))    return 'Edge';
    return 'Other';
}

function parsePlatform(ua = '') {
    if (!ua) return 'Unknown';
    if (ua.includes('iPhone') || ua.includes('Android')) return 'Mobile';
    if (ua.includes('iPad'))   return 'Tablet';
    if (ua.includes('Win'))    return 'Windows';
    if (ua.includes('Mac'))    return 'macOS';
    if (ua.includes('Linux'))  return 'Linux';
    return 'Other';
}

module.exports = mongoose.model('User', userSchema);
