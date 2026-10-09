import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { dbService } from '../services/dbFallback.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { config } from '../config/index.js';

const router = express.Router();

/**
 * Strict Rate Limiter for Admin Authentication to prevent brute-force attempts
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Too many login attempts from this IP address. Please wait 15 minutes before trying again.',
  },
});

/**
 * Constant-time string comparison to prevent timing side-channel attacks
 */
function timingSafeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Constant-time dummy comparison to maintain identical execution timing
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * POST /api/admin/login
 * Strict brute-force limited, constant-time authenticated admin login
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res
        .status(400)
        .json({ success: false, message: 'Username and password are required.' });
    }

    const trimmedUsername = username.trim();

    // Constant-time comparison using centralized config values
    const isUserMatch = timingSafeCompare(trimmedUsername, config.auth.adminUsername);
    const isPassMatch = timingSafeCompare(password, config.auth.adminPassword);

    if (!isUserMatch || !isPassMatch) {
      // Artificial slight delay to prevent microsecond measurement
      await new Promise((resolve) => setTimeout(resolve, 100));
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
    }

    const token = jwt.sign(
      { username: config.auth.adminUsername, role: 'admin' },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtExpiresIn, algorithm: 'HS256' }
    );

    res.json({
      success: true,
      token,
      admin: {
        username: config.auth.adminUsername,
        role: 'admin',
        loginTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Admin Login Error]:', error.message);
    res.status(500).json({ success: false, message: 'Authentication processing error.' });
  }
});

/**
 * GET /api/admin/verify
 */
router.get('/verify', authenticateAdmin, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

/**
 * GET /api/admin/stats
 * Aggregates counts: Total, New, Contacted, Quoted, In Production, Completed, Cancelled
 */
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const all = await dbService.getEnquiries();

    const stats = {
      total: all.length,
      new: all.filter((e) => e.status === 'New').length,
      contacted: all.filter((e) => e.status === 'Contacted').length,
      quoted: all.filter((e) => e.status === 'Quoted').length,
      inProduction: all.filter((e) => e.status === 'In Production').length,
      completed: all.filter((e) => e.status === 'Completed').length,
      cancelled: all.filter((e) => e.status === 'Cancelled').length,
    };

    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
