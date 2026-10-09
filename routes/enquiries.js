import express from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { dbService } from '../services/dbFallback.js';
import { mailInquiryService } from '../services/mailInquiryService.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// Supported design file extensions
const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.pdf',
  '.svg',
  '.dxf',
  '.ai',
  '.cdr',
  '.zip',
]);

// Allowed status values
const ALLOWED_STATUSES = new Set([
  'New',
  'Contacted',
  'Quoted',
  'In Production',
  'Completed',
  'Cancelled',
]);

// Phone regex (allowing optional + prefix, country code, 10-15 digits)
const PHONE_REGEX = /^\+?[0-9\s-]{10,15}$/;

// Standard email regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Ensure uploads directory exists (use tmpdir on serverless / Vercel)
const uploadsDir = process.env.VERCEL
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(process.cwd(), 'uploads');

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.warn('[Uploads] Directory creation warning:', err.message);
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Strip path traversal attempts and special characters
    const parsed = path.parse(file.originalname);
    const safeBaseName = parsed.name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50); // limit base filename length
    const ext = parsed.ext.toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${safeBaseName}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Reject multiple dangerous extensions like file.php.jpg
  const parts = file.originalname.split('.');
  if (parts.length > 2) {
    const dangerousExts = [
      'php',
      'exe',
      'bat',
      'cmd',
      'sh',
      'js',
      'html',
      'htm',
      'vbs',
      'ps1',
      'jar',
    ];
    const hasExecutableSegment = parts
      .slice(1, -1)
      .some((p) => dangerousExts.includes(p.toLowerCase()));
    if (hasExecutableSegment) {
      return cb(
        new Error(
          'Rejected: Multi-extension files with executable segments are not allowed for security reasons.'
        )
      );
    }
  }

  if (ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File extension ${ext} not allowed. Please upload JPG, PNG, PDF, SVG, DXF, AI, CDR or ZIP.`
      )
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max per file
    files: 5, // Max 5 files
  },
  fileFilter,
});

/**
 * Middleware wrapper to handle Multer upload errors gracefully
 */
const handleUpload = (req, res, next) => {
  upload.array('files', 5)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'Uploaded file exceeds the maximum allowed size of 25MB.',
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'You can upload a maximum of 5 files per quote request.',
          });
        }
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ success: false, message: err.message || 'File upload error.' });
    }
    next();
  });
};

/**
 * POST /api/enquiries
 * Submit customer quotation / inquiry
 */
router.post('/', handleUpload, async (req, res) => {
  try {
    const {
      name,
      companyName,
      phone,
      whatsapp,
      email,
      service,
      product,
      material,
      quantity,
      width,
      height,
      thickness,
      requiredDate,
      message,
      honeypot,
    } = req.body || {};

    // Check Honeypot spam trap
    if (honeypot && String(honeypot).trim().length > 0) {
      console.warn('[AntiSpam] Honeypot triggered, dropping submission quietly.');
      return res.status(200).json({
        success: true,
        message:
          'Thank you! Your enquiry has been received. We will review your requirement and contact you shortly.',
      });
    }

    // Required fields presence
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide your full name.' });
    }

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'Please provide your contact phone number.' });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'Please provide your email address.' });
    }

    // Length and format validation
    const cleanName = name.trim().slice(0, 100);
    const cleanPhone = phone.trim().slice(0, 20);
    const cleanEmail = email.trim().toLowerCase().slice(0, 120);

    if (cleanName.length < 2) {
      return res
        .status(400)
        .json({ success: false, message: 'Name must be at least 2 characters.' });
    }

    // Validate phone number: minimum 10 digits
    const digitsOnly = cleanPhone.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return res
        .status(400)
        .json({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
    }

    // Validate email address
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address (e.g. name@example.com).',
      });
    }

    // Process uploaded files with dual property support (filePath & path)
    const uploadedFiles = (req.files || []).map((file) => ({
      originalName: file.originalname.slice(0, 150),
      fileName: file.filename,
      filePath: `/uploads/${file.filename}`,
      path: `/uploads/${file.filename}`,
      fileSize: file.size,
      mimeType: file.mimetype || 'application/octet-stream',
      uploadedAt: new Date(),
    }));

    const enquiryData = {
      name: cleanName,
      companyName: companyName ? String(companyName).trim().slice(0, 120) : '',
      phone: cleanPhone,
      whatsapp: whatsapp ? String(whatsapp).trim().slice(0, 20) : cleanPhone,
      email: cleanEmail,
      service: service ? String(service).trim().slice(0, 100) : 'CO2 Laser Cutting',
      product: product ? String(product).trim().slice(0, 100) : 'Custom Requirement',
      material: material ? String(material).trim().slice(0, 100) : 'Acrylic',
      quantity: quantity ? String(quantity).trim().slice(0, 30) : '1',
      width: width ? String(width).trim().slice(0, 50) : '',
      height: height ? String(height).trim().slice(0, 50) : '',
      thickness: thickness ? String(thickness).trim().slice(0, 50) : '',
      requiredDate: requiredDate ? String(requiredDate).trim().slice(0, 50) : '',
      message: message ? String(message).trim().slice(0, 3000) : '',
      uploadedFiles,
      status: 'New',
      internalNotes: '',
    };

    // Save to Database / Persistent Store
    const savedEnquiry = await dbService.createEnquiry(enquiryData);

    // Trigger MailInquiry notification asynchronously
    try {
      await mailInquiryService.sendEnquiryNotification(savedEnquiry);
    } catch (mailErr) {
      console.warn('[MailInquiry] Background email notification notice:', mailErr.message);
    }

    // Customer WhatsApp direct link generator
    const whatsappText = encodeURIComponent(
      `Hello Radhe Laser Studio! I just submitted a quote request for ${enquiryData.service} (${enquiryData.material}, Qty: ${enquiryData.quantity}). Name: ${enquiryData.name}. Phone: ${enquiryData.phone}. Ref ID: ${savedEnquiry._id}`
    );
    const directWhatsappUrl = `https://wa.me/917984190368?text=${whatsappText}`;

    return res.status(201).json({
      success: true,
      message:
        'Thank you! Your enquiry has been received. We will review your requirement and contact you shortly.',
      enquiryId: savedEnquiry._id,
      whatsappUrl: directWhatsappUrl,
    });
  } catch (error) {
    console.error('[Enquiry API Error]:', error);
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Error processing your quote request. Please call or WhatsApp us directly at 7984190368.',
    });
  }
});

/**
 * GET /api/enquiries (Admin Protected)
 */
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status && status !== 'All' && ALLOWED_STATUSES.has(status)) {
      filter.status = status;
    }

    let list = await dbService.getEnquiries(filter);

    if (search && typeof search === 'string') {
      const q = search.trim().toLowerCase().slice(0, 100);
      if (q) {
        list = list.filter(
          (item) =>
            (item.name && item.name.toLowerCase().includes(q)) ||
            (item.phone && item.phone.includes(q)) ||
            (item.email && item.email.toLowerCase().includes(q)) ||
            (item.service && item.service.toLowerCase().includes(q)) ||
            (item.material && item.material.toLowerCase().includes(q))
        );
      }
    }

    res.json({ success: true, count: list.length, enquiries: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/enquiries/:id (Admin Protected)
 */
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id || id.length > 100) {
      return res.status(400).json({ success: false, message: 'Invalid enquiry ID parameter.' });
    }

    const item = await dbService.getEnquiryById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }
    res.json({ success: true, enquiry: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/enquiries/:id (Admin Protected)
 * Update status or add internal notes
 */
router.patch('/:id', authenticateAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id || id.length > 100) {
      return res.status(400).json({ success: false, message: 'Invalid enquiry ID parameter.' });
    }

    const { status, internalNotes } = req.body || {};
    const update = {};

    if (status !== undefined) {
      if (!ALLOWED_STATUSES.has(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed values: ${Array.from(ALLOWED_STATUSES).join(', ')}`,
        });
      }
      update.status = status;
    }

    if (internalNotes !== undefined) {
      if (typeof internalNotes !== 'string') {
        return res.status(400).json({ success: false, message: 'internalNotes must be a string.' });
      }
      update.internalNotes = internalNotes.slice(0, 5000);
    }

    const updated = await dbService.updateEnquiry(id, update);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }
    res.json({ success: true, enquiry: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/enquiries/:id (Admin Protected)
 * Delete spam enquiry
 */
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id || id.length > 100) {
      return res.status(400).json({ success: false, message: 'Invalid enquiry ID parameter.' });
    }

    const deleted = await dbService.deleteEnquiry(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }
    res.json({ success: true, message: 'Enquiry deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
