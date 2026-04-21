const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// ─── 1. HELMET: Sets secure HTTP headers ──────────────────────────────────────
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            // Allow LAN back-end calls (phone opens via 192.168.x.x)
            connectSrc: ["'self'", "http://localhost:5000", "http://*:5000"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    xssFilter: true,
    noSniff: true,
    frameguard: { action: 'deny' },
    // ⚠️ HSTS disabled — only safe on HTTPS; breaks plain HTTP LAN access from phones
    hsts: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hidePoweredBy: true,
});

// ─── 2. MONGO SANITIZE: Prevent NoSQL injection attacks ────────────────────────
// Strips $ and . from user-supplied data so attackers can't inject MongoDB operators
const sanitizeMongo = mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        console.warn(`[SECURITY] MongoSanitize: Blocked injection in field "${key}" from IP ${req.ip}`);
    },
});

// ─── 3. XSS CLEAN: Strip malicious HTML/JS from request body, query, params ──
const sanitizeXSS = xss();

// ─── 4. HPP: Prevent HTTP Parameter Pollution ─────────────────────────────────
// e.g., attacker sends ?role=user&role=admin — only the last value is used
const preventHPP = hpp({
    whitelist: ['sort', 'fields', 'page', 'limit', 'language'], // safe params that can repeat
});

// ─── 5. REQUEST FINGERPRINT VALIDATOR ─────────────────────────────────────────
// Blocks requests with missing/suspicious User-Agent headers (common bot pattern)
const requestValidator = (req, res, next) => {
    const ua = req.headers['user-agent'];

    // Block requests entirely missing a User-Agent
    if (!ua) {
        console.warn(`[SECURITY] Request with no User-Agent blocked from IP: ${req.ip}`);
        return res.status(400).json({ error: 'Bad Request: Missing required headers' });
    }

    // Block obvious scanner/attack tool patterns
    const suspiciousPatterns = [
        /sqlmap/i,
        /nikto/i,
        /masscan/i,
        /nmap/i,
        /dirbuster/i,
        /burpsuite/i,
        /python-requests\/2\.1[0-9]/i, // old automated Python scrapers
        /zgrab/i,
        /havij/i,
        /acunetix/i,
    ];

    if (suspiciousPatterns.some((pattern) => pattern.test(ua))) {
        console.warn(`[SECURITY] Suspicious User-Agent blocked: "${ua}" from IP: ${req.ip}`);
        return res.status(403).json({ error: 'Forbidden: Access denied' });
    }

    next();
};

// ─── 6. SECURITY RESPONSE HEADERS (extra layer beyond Helmet) ─────────────────
const extraHeaders = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Allow camera + microphone so phones can use file pickers / camera capture
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    next();
};

// ─── 7. BODY SIZE GUARD: Prevent large payload attacks ────────────────────────
const bodySizeGuard = (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const MAX_BYTES = 10 * 1024 * 1024; // 10 MB hard cap

    if (contentLength > MAX_BYTES) {
        console.warn(`[SECURITY] Oversized payload (${contentLength} bytes) blocked from IP: ${req.ip}`);
        return res.status(413).json({ error: 'Payload Too Large' });
    }
    next();
};

module.exports = {
    helmetConfig,
    sanitizeMongo,
    sanitizeXSS,
    preventHPP,
    requestValidator,
    extraHeaders,
    bodySizeGuard,
};
