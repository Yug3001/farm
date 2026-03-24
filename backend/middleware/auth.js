const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        // ── 1. Extract Bearer token ────────────────────────────────────────────
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization required' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // ── 2. Verify JWT signature & expiry ──────────────────────────────────
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Session expired. Please sign in again.' });
            }
            return res.status(401).json({ error: 'Invalid token. Please sign in again.' });
        }

        // ── 3. Load the user from DB ───────────────────────────────────────────
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ error: 'Account not found. Please sign in again.' });
        }

        // ── 4. Token version check — rejects tokens issued before last logout ──
        // This is the "forced logout" / token invalidation mechanism.
        // When a user signs out or changes password, tokenVersion is incremented.
        // Any old JWT that carries the previous tokenVersion is immediately rejected.
        if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
            return res.status(401).json({ error: 'Session has been invalidated. Please sign in again.' });
        }

        // ── 5. Account lock check ─────────────────────────────────────────────
        if (user.isLocked) {
            return res.status(423).json({ error: 'Account is temporarily locked. Please try again later.' });
        }

        req.user = user;
        next();

    } catch (error) {
        console.error('[AUTH MIDDLEWARE] Unexpected error:', error.message);
        res.status(500).json({ error: 'Authentication error' });
    }
};

module.exports = authMiddleware;
