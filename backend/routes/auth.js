const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// ─── Validation Helpers ────────────────────────────────────────────────────────

const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validatePassword = (password) => {
  const minLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  return {
    isValid: minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar,
    errors: { minLength, hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar }
  };
};

// Helper to get real IP (works behind proxies too)
const getClientIP = (req) => req.headers['x-forwarded-for']?.split(',')[0] || req.ip;

// ─── Sign Up ───────────────────────────────────────────────────────────────────
router.post('/signup', authLimiter, async (req, res) => {
  try {
    const { username, email, password, confirmPassword, farmName, location } = req.body;

    // Required field check
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate username (no special chars)
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({
        error: 'Username must be 3-30 characters and can only contain letters, numbers, and underscores'
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      const errors = [];
      if (!passwordValidation.errors.minLength) errors.push('at least 8 characters');
      if (!passwordValidation.errors.hasUpperCase) errors.push('one uppercase letter');
      if (!passwordValidation.errors.hasLowerCase) errors.push('one lowercase letter');
      if (!passwordValidation.errors.hasNumber) errors.push('one number');
      if (!passwordValidation.errors.hasSpecialChar) errors.push('one special character');
      return res.status(400).json({ error: `Password must contain: ${errors.join(', ')}` });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Check for existing user
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      // Use identical message to prevent user enumeration
      return res.status(400).json({ error: 'Username or email already in use' });
    }

    // Hash password with bcrypt (cost factor 12)
    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      farmName: farmName || '',
      location: location || '',
      lastLoginIP: getClientIP(req),
    });

    await newUser.save();

    // Issue JWT
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email, tokenVersion: newUser.tokenVersion },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }   // shorter expiry for security
    );

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        farmName: newUser.farmName,
        location: newUser.location
      },
      token
    });

  } catch (error) {
    console.error('[AUTH] Signup error:', error.message);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Username or email already in use' });
    }
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ─── Sign In (with brute-force lockout) ───────────────────────────────────────
router.post('/signin', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user (include lockout fields)
    const user = await User.findOne({ email }).select('+loginAttempts +lockUntil +tokenVersion');
    if (!user) {
      // Use a generic message to avoid user enumeration
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if account is locked
    if (user.isLocked) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      console.warn(`[SECURITY] Locked account login attempt for: ${email} from IP: ${getClientIP(req)}`);
      return res.status(423).json({
        error: `Account temporarily locked due to multiple failed attempts. Try again in ${minutesLeft} minute(s).`
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      // Record the failed attempt (may lock the account)
      await user.incLoginAttempts();
      console.warn(`[SECURITY] Failed login for: ${email} from IP: ${getClientIP(req)} (attempt ${user.loginAttempts + 1})`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Successful login — reset attempt counter, record IP + device
    const userAgent = req.headers['user-agent'] || '';
    await user.resetLoginAttempts(getClientIP(req), userAgent);


    // Issue JWT with tokenVersion so we can invalidate on logout
    const token = jwt.sign(
      { userId: user._id, email: user.email, tokenVersion: user.tokenVersion },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Sign in successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        farmName: user.farmName,
        location: user.location
      },
      token
    });

  } catch (error) {
    console.error('[AUTH] Signin error:', error.message);
    res.status(500).json({ error: 'Sign in failed. Please try again.' });
  }
});

// ─── Sign Out (invalidate all tokens for this user) ───────────────────────────
router.post('/signout', authMiddleware, async (req, res) => {
  try {
    await req.user.invalidateTokens();
    res.json({ message: 'Signed out successfully. All sessions have been ended.' });
  } catch (error) {
    res.status(500).json({ error: 'Sign out failed.' });
  }
});

// ─── Verify Token ──────────────────────────────────────────────────────────────
router.get('/verify', authMiddleware, (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      farmName: req.user.farmName,
      location: req.user.location
    }
  });
});

// ─── Get User Profile ──────────────────────────────────────────────────────────
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -tokenVersion -loginAttempts -lockUntil');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// ─── Update User Profile ───────────────────────────────────────────────────────
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { username, farmName, location } = req.body;

    // Only allow safe fields to be updated
    const updateData = {};
    if (username) {
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
        return res.status(400).json({ error: 'Invalid username format' });
      }
      updateData.username = username;
    }
    if (farmName !== undefined) updateData.farmName = String(farmName).slice(0, 100);
    if (location !== undefined) updateData.location = String(location).slice(0, 100);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -tokenVersion -loginAttempts -lockUntil');

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    res.status(500).json({ error: 'Update failed. Please try again.' });
  }
});

// ─── Get User Activity Stats ───────────────────────────────────────────────────
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('username email farmName location preferredLanguage primaryCrop usageStats loginCount lastLogin lastDevice createdAt');

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      success: true,
      stats: {
        profile: {
          username:          user.username,
          email:             user.email,
          farmName:          user.farmName,
          location:          user.location,
          preferredLanguage: user.preferredLanguage,
          primaryCrop:       user.primaryCrop,
          memberSince:       user.createdAt,
        },
        activity: {
          loginCount:            user.loginCount,
          lastLogin:             user.lastLogin,
          lastDevice:            user.lastDevice,
          advisorQuestionsAsked: user.usageStats?.advisorQuestionsAsked || 0,
          soilAnalysisCount:     user.usageStats?.soilAnalysisCount     || 0,
          cropAnalysisCount:     user.usageStats?.cropAnalysisCount      || 0,
          plannersCreated:       user.usageStats?.plannersCreated        || 0,
          remindersSet:          user.usageStats?.remindersSet           || 0,
          lastAdvisorUse:        user.usageStats?.lastAdvisorUse,
          lastSoilScan:          user.usageStats?.lastSoilScan,
          lastCropScan:          user.usageStats?.lastCropScan,
          totalActions: (
            (user.usageStats?.advisorQuestionsAsked || 0) +
            (user.usageStats?.soilAnalysisCount     || 0) +
            (user.usageStats?.cropAnalysisCount     || 0)
          )
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

module.exports = router;
