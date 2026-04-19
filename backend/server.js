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

// 3. CORS — allow only our own frontend origin
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://localhost:5173', // Vite dev server
  'http://127.0.0.1:5173',
  // Production URL from env (if set)
  ...(process.env.VITE_API_BASE_URL ? [process.env.VITE_API_BASE_URL.replace('/api', '').replace(':5000', ':3000')] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server calls (no origin) and listed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[SECURITY] CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // Cache preflight for 24 h
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
app.listen(PORT, () => {
  console.log(`✅ FarmWise Backend running on port ${PORT}`);
  console.log(`🔒 Security middleware: Helmet, CORS, Sanitization, HPP, Rate Limiting active`);
});

module.exports = app;
