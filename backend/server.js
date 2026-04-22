const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const { apiLimiter } = require('./middleware/rateLimiter');
const {
  helmetConfig,
  sanitizeMongo,
  sanitizeXSS,
  preventHPP,
  requestValidator,
  extraHeaders,
  bodySizeGuard,
} = require('./middleware/security');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ══════════════════════════════════════════════════════════════════
//  SECURITY MIDDLEWARE STACK  (order matters!)
// ══════════════════════════════════════════════════════════════════

// 1. Helmet: sets 15+ secure HTTP headers in one shot
app.use(helmetConfig);

// 2. Extra headers not covered by Helmet
app.use(extraHeaders);

// ─── 3. CORS ─────────────────────────────────────────────────────────────────
// Allow localhost (dev), Vite dev server, AND any device on the same LAN
// (phones/tablets connecting via the laptop's WiFi IP e.g. 192.168.x.x)
// Allowed production origins (cloud deployments)
const ALLOWED_ORIGINS = new Set(
  [process.env.FRONTEND_URL, 'https://farm-0xtp.onrender.com']
    .filter(Boolean)
);

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // server-to-server, curl, same-origin
  if (ALLOWED_ORIGINS.has(origin)) return true;
  // Allow any *.onrender.com subdomain (own deployments)
  if (origin.endsWith('.onrender.com')) return true;
  try {
    const hostname = new URL(origin).hostname;
    if (hostname === 'localhost' || hostname.startsWith('127.')) return true;
    if (hostname.startsWith('10.')) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)) return true;
    if (hostname.startsWith('192.168.')) return true;
  } catch { /* ignore malformed */ }
  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      console.warn(`[SECURITY] CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
}));

// 4. Body size guard (before JSON parsing)
app.use(bodySizeGuard);

// 5. Parse JSON / URL-encoded bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 6. Sanitize MongoDB operators from user input  (prevents NoSQL injection)
app.use(sanitizeMongo);

// 7. Sanitize HTML/JS from input              (prevents XSS via body/query/params)
app.use(sanitizeXSS);

// 8. Prevent HTTP Parameter Pollution
app.use(preventHPP);

// 9. Validate request fingerprint (block known attack tools / no User-Agent)
app.use(requestValidator);

// 10. General rate limiter on all /api routes
app.use('/api/', apiLimiter);

// ══════════════════════════════════════════════════════════════════
//  ROUTES
// ══════════════════════════════════════════════════════════════════

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const advisorRoutes = require('./routes/advisor');
app.use('/api/advisor', advisorRoutes);

const soilRoutes = require('./routes/soil');
app.use('/api/soil', soilRoutes);

const cropRoutes = require('./routes/crop');
app.use('/api/crop', cropRoutes);

// Health check (no sensitive data exposed)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ══════════════════════════════════════════════════════════════════
//  GLOBAL ERROR HANDLER
// ══════════════════════════════════════════════════════════════════

// Handle CORS errors explicitly
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Forbidden: CORS policy violation' });
  }
  // Never leak stack traces to the client
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: 'Internal Server Error' });
});

// ══════════════════════════════════════════════════════════════════
//  START SERVER
// ══════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 5000;
// Bind to 0.0.0.0 so the server is reachable from phones/tablets on the same WiFi
app.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const nets = os.networkInterfaces();
  let lanIp = 'unknown';
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) { lanIp = net.address; break; }
    }
    if (lanIp !== 'unknown') break;
  }
  console.log(`✅ FarmWise Backend running on port ${PORT}`);
  console.log(`🌐 Access from this device : http://localhost:${PORT}`);
  console.log(`📱 Access from phone/tablet: http://${lanIp}:${PORT}`);
  console.log(`🔒 Security middleware: Helmet, CORS (LAN-open), Sanitization, HPP, Rate Limiting active`);
});

module.exports = app;
