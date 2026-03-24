const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
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
        minlength: [8, 'Password must be at least 8 characters long']
    },
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

    // ── Brute-Force / Account Lockout Protection ──────────────────────────────
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date,
        default: null
    },

    // ── Token Rotation: invalidate all old tokens on logout/password change ────
    // Increment this whenever the user logs out or changes password.
    // Stored in JWT payload; tokens with old version are rejected.
    tokenVersion: {
        type: Number,
        default: 0
    },

    // ── Audit / Activity ───────────────────────────────────────────────────────
    lastLogin: {
        type: Date
    },
    lastLoginIP: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Note: email and username already have DB indexes via `unique: true` in the schema fields.

// ── Virtual: is the account currently locked? ──────────────────────────────────
userSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ── Methods ────────────────────────────────────────────────────────────────────
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 30;

/**
 * Call after a FAILED login attempt.
 * Increments counter; locks account after MAX_LOGIN_ATTEMPTS failures.
 */
userSchema.methods.incLoginAttempts = async function () {
    // If previous lock has expired, reset
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $set: { loginAttempts: 1, lockUntil: null }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };

    // Lock the account if we've reached max attempts
    if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
        updates.$set = {
            lockUntil: new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000)
        };
        console.warn(`[SECURITY] Account locked: ${this.email} after ${MAX_LOGIN_ATTEMPTS} failed attempts`);
    }

    return this.updateOne(updates);
};

/**
 * Call after a SUCCESSFUL login.
 * Resets failure counters.
 */
userSchema.methods.resetLoginAttempts = async function (ip = '') {
    return this.updateOne({
        $set: {
            loginAttempts: 0,
            lockUntil: null,
            lastLogin: new Date(),
            lastLoginIP: ip
        }
    });
};

/**
 * Invalidates ALL existing JWTs for this user (e.g., on logout or password change).
 */
userSchema.methods.invalidateTokens = async function () {
    return this.updateOne({ $inc: { tokenVersion: 1 } });
};

module.exports = mongoose.model('User', userSchema);
