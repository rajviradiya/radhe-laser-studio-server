import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

// Port validation
const rawPort = process.env.PORT || '5000';
const PORT = parseInt(rawPort, 10);
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(
    `[Config Error] Invalid PORT environment variable: "${rawPort}". Must be between 1 and 65535.`
  );
}

// Database Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/radhe_laser_studio';
if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
  console.warn(
    '[Config Warning] MONGODB_URI does not start with standard mongodb:// or mongodb+srv:// protocol.'
  );
}

// Admin & JWT Secrets
const JWT_SECRET = process.env.JWT_SECRET || 'radhe-laser-studio-jwt-secret-key-2026';
if (isProd && JWT_SECRET.includes('default')) {
  console.warn(
    '[Config Security Warning] Production environment detected with default JWT_SECRET. Please configure a high-entropy secret in .env.'
  );
}

const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin').trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'radhe1140';

// CORS Allowed Origins
const allowedDevOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

const rawClientUrls = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : [];
const configuredClientUrls = rawClientUrls
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowedOrigins = [...new Set([...allowedDevOrigins, ...configuredClientUrls])];

// Mail & Notification Service Config
const MAILINQUIRY_API_KEY = (process.env.MAILINQUIRY_API_KEY || '').trim();
const MAILINQUIRY_ADMIN_EMAIL = (
  process.env.MAILINQUIRY_ADMIN_EMAIL ||
  process.env.ADMIN_NOTIFICATION_EMAIL ||
  'radhelaserstudio@gmail.com'
).trim();
const MAILINQUIRY_FROM_EMAIL = (
  process.env.MAILINQUIRY_FROM_EMAIL || 'notifications@radhelaserstudio.com'
).trim();

const SMTP_HOST = (process.env.SMTP_HOST || '').trim();
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = (process.env.SMTP_USER || '').trim();
const SMTP_PASS = (process.env.SMTP_PASS || '').trim();

export const config = Object.freeze({
  env: NODE_ENV,
  isProd,
  port: PORT,
  database: {
    uri: MONGODB_URI,
  },
  auth: {
    jwtSecret: JWT_SECRET,
    adminUsername: ADMIN_USERNAME,
    adminPassword: ADMIN_PASSWORD,
    jwtExpiresIn: '7d',
  },
  cors: {
    allowedOrigins,
  },
  mail: {
    apiKey: MAILINQUIRY_API_KEY,
    adminEmail: MAILINQUIRY_ADMIN_EMAIL,
    fromEmail: MAILINQUIRY_FROM_EMAIL,
    smtp: {
      host: SMTP_HOST,
      port: SMTP_PORT,
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  },
});
