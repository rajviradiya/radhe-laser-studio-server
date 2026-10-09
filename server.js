import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { config } from './config/index.js';

import enquiryRoutes from './routes/enquiries.js';
import portfolioRoutes from './routes/portfolio.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Set to false so local Vite frontend scripts and HMR are unhindered
  })
);

// Restrictive CORS configuration with Vercel deployment support
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g. server-to-server, mobile client, curl)
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (
        config.cors.allowedOrigins.includes(normalizedOrigin) ||
        normalizedOrigin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy restriction: Origin '${origin}' is not permitted.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Safe body parsers (2MB maximum to prevent body buffer denial of service)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Static uploads folder with hardened security headers
const uploadsDir = process.env.VERCEL
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(__dirname, 'uploads');
app.use(
  '/uploads',
  express.static(uploadsDir, {
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      const ext = path.extname(filePath).toLowerCase();
      // Force attachment download & sandbox for vectors/documents to eliminate stored XSS risks
      if (['.svg', '.pdf', '.dxf', '.ai', '.cdr', '.zip'].includes(ext)) {
        res.setHeader('Content-Disposition', 'attachment');
        res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      }
    },
  })
);

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
});

const enquirySubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message:
      'Too many quote submissions from this IP. Please call or WhatsApp us directly at 7984190368.',
  },
});

app.use('/api', generalLimiter);
app.use('/api/enquiries', (req, res, next) => {
  if (req.method === 'POST') {
    return enquirySubmitLimiter(req, res, next);
  }
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  res.json({
    status: 'online',
    service: 'Radhe Laser Studio API Server',
    endpoints: {
      health: '/api/health',
      portfolio: '/api/portfolio',
      enquiries: '/api/enquiries',
      admin: '/api/admin',
    },
    database: isMongoConnected ? 'MongoDB (Connected)' : 'Fallback Storage (Active)',
  });
});

// Routes
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    environment: config.env,
    service: 'Radhe Laser Studio API Server',
    database: isMongoConnected ? 'MongoDB (Connected)' : 'Persistent Storage (Active)',
    location: 'Gota, Ahmedabad, Gujarat',
  });
});

// Centralized Global Error Handler (prevents leaking internal stack traces)
app.use((err, req, res, next) => {
  if (err.message && err.message.includes('CORS policy restriction')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  console.error('[Unhandled Server Error]:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: config.isProd
      ? 'An internal server error occurred.'
      : err.message || 'Internal server error.',
  });
});

// Attempt MongoDB Connection with fallback (cached connection for serverless)
if (mongoose.connection.readyState === 0) {
  console.log('🔄 Connecting to database...');
  mongoose
    .connect(config.database.uri, {
      serverSelectionTimeoutMS: 2500,
    })
    .then(() => {
      console.log('✅ Connected to MongoDB successfully');
    })
    .catch((err) => {
      console.warn(`⚠️  MongoDB connection notice: ${err.message}`);
      console.log('📁 Using local persistent storage. All inquiries and data will persist reliably.');
    });
}

// Start HTTP server only in standalone / local environments (not on Vercel Serverless)
if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`🚀 Radhe Laser Studio Backend Server is running on port ${config.port}`);
    console.log(`📡 API Endpoints available at http://localhost:${config.port}/api`);
  });
}

export default app;
