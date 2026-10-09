import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { Enquiry } from '../models/Enquiry.js';
import { Portfolio } from '../models/Portfolio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

const ENQUIRIES_FILE = process.env.VERCEL
  ? path.join(os.tmpdir(), 'enquiries.json')
  : path.join(DATA_DIR, 'enquiries.json');
const PORTFOLIO_FILE = path.join(DATA_DIR, 'portfolio.json');

// Ensure data folder and initial files exist (non-blocking for serverless)
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  // Ignored in read-only serverless environments
}

const initialPortfolioSeed = [
  {
    _id: 'port-1',
    title: 'Precision Laser Cut Geometric Panels',
    category: 'Laser Cutting',
    material: '3.5mm Cast Acrylic & MDF',
    description:
      'High-tolerance CO₂ laser cut decorative pattern panels for interior architectural application in Ahmedabad.',
    imageUrl:
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    featured: true,
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'port-2',
    title: 'Corporate Reception 3D Acrylic Logo',
    category: 'Signage',
    material: 'Gold Mirror Acrylic on 5mm Matte Black Backing',
    description:
      'Dual-layer precision laser cut corporate reception branding with clean bevel and wall standoff mounts.',
    imageUrl:
      'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=800&q=80',
    featured: true,
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'port-3',
    title: 'Dimensional Solid Acrylic Letters',
    category: 'Acrylic',
    material: '8mm High-Gloss Cast Acrylic',
    description:
      'Crisp laser contoured typography with laser polished edges for showroom entry display.',
    imageUrl:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    featured: true,
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'port-4',
    title: 'Laser Carved MDF Jali Décor Screen',
    category: 'MDF',
    material: '12mm High-Density Engineered MDF',
    description:
      'Complex lattice cut pattern without edge burn, calibrated for residential partition installation.',
    imageUrl:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    featured: true,
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'port-5',
    title: 'Custom Acrylic Villa Name Plate',
    category: 'Name Plates',
    material: 'Frosted Acrylic + Rose Gold Mirror Accents',
    description:
      'Customized residential entrance name plate with weatherproof laser engraving and brass hardware.',
    imageUrl:
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
    featured: true,
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'port-6',
    title: 'Retail Storefront Backlit Acrylic Sign Board',
    category: 'Branding',
    material: 'Translucent White Acrylic + Black Acrylic Borders',
    description:
      'Durable illuminated retail fascia lettering prepared for LED backlighting and weather exposure.',
    imageUrl:
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
    featured: true,
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'port-7',
    title: 'Custom LED Flex Neon Event Sign',
    category: 'Décor',
    material: 'Laser Cut Clear Acrylic Backing + Silicone Neon',
    description:
      'Contour-cut transparent acrylic base with warm amber neon tubing for wedding and stage backdrop.',
    imageUrl:
      'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',
    featured: true,
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'port-8',
    title: 'Laser Engraved Wooden Corporate Desktop Organizers',
    category: 'Gifts',
    material: 'Natural Steamed Beechwood & Birch Ply',
    description:
      'Batch engraved employee onboarding gift set with individual name customization and sharp contrast.',
    imageUrl:
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
    featured: true,
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'port-9',
    title: 'Intricate Festive Rangoli Stencils',
    category: 'Custom Products',
    material: '2mm Flexible Virgin Acrylic',
    description:
      'Reusable high-detail laser cut stencils for festive floor decorations, easy to wash and store.',
    imageUrl:
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
    featured: true,
    createdAt: new Date().toISOString(),
  },
];

try {
  if (!fs.existsSync(PORTFOLIO_FILE)) {
    fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(initialPortfolioSeed, null, 2));
  }
} catch (e) {
  // Ignored in read-only environment
}

try {
  if (!fs.existsSync(ENQUIRIES_FILE)) {
    fs.writeFileSync(ENQUIRIES_FILE, JSON.stringify([], null, 2));
  }
} catch (e) {
  // Ignored in read-only environment
}

let inMemoryEnquiries = [];

function readJSON(file) {
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      return JSON.parse(raw);
    }
  } catch {
    // Return cached items
  }
  return file === ENQUIRIES_FILE ? inMemoryEnquiries : initialPortfolioSeed;
}

function writeJSON(file, data) {
  if (file === ENQUIRIES_FILE) {
    inMemoryEnquiries = data;
  }
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (err) {
    console.warn(`[dbFallback] File write skipped in read-only environment: ${err.message}`);
  }
}

export const dbService = {
  isMongooseReady() {
    return mongoose.connection.readyState === 1;
  },

  async createEnquiry(enquiryData) {
    if (this.isMongooseReady()) {
      const enquiry = new Enquiry(enquiryData);
      return await enquiry.save();
    }
    const items = readJSON(ENQUIRIES_FILE);
    const newEnquiry = {
      _id: 'enq-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      ...enquiryData,
      status: enquiryData.status || 'New',
      internalNotes: enquiryData.internalNotes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    items.unshift(newEnquiry);
    writeJSON(ENQUIRIES_FILE, items);
    return newEnquiry;
  },

  async getEnquiries(filter = {}) {
    if (this.isMongooseReady()) {
      return await Enquiry.find(filter).sort({ createdAt: -1 });
    }
    let items = readJSON(ENQUIRIES_FILE);
    if (filter.status) {
      items = items.filter((i) => i.status === filter.status);
    }
    return items;
  },

  async getEnquiryById(id) {
    if (this.isMongooseReady()) {
      return await Enquiry.findById(id);
    }
    const items = readJSON(ENQUIRIES_FILE);
    return items.find((i) => String(i._id) === String(id)) || null;
  },

  async updateEnquiry(id, updateData) {
    if (this.isMongooseReady()) {
      return await Enquiry.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      );
    }
    const items = readJSON(ENQUIRIES_FILE);
    const index = items.findIndex((i) => String(i._id) === String(id));
    if (index === -1) return null;
    items[index] = {
      ...items[index],
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
    writeJSON(ENQUIRIES_FILE, items);
    return items[index];
  },

  async deleteEnquiry(id) {
    if (this.isMongooseReady()) {
      return await Enquiry.findByIdAndDelete(id);
    }
    let items = readJSON(ENQUIRIES_FILE);
    const existing = items.find((i) => String(i._id) === String(id));
    if (!existing) return null;
    items = items.filter((i) => String(i._id) !== String(id));
    writeJSON(ENQUIRIES_FILE, items);
    return existing;
  },

  async getPortfolio(category) {
    if (this.isMongooseReady()) {
      const q = category && category !== 'All' ? { category } : {};
      return await Portfolio.find(q).sort({ createdAt: -1 });
    }
    let items = readJSON(PORTFOLIO_FILE);
    if (category && category !== 'All') {
      items = items.filter((i) => i.category.toLowerCase() === category.toLowerCase());
    }
    return items;
  },

  async createPortfolioItem(data) {
    if (this.isMongooseReady()) {
      const p = new Portfolio(data);
      return await p.save();
    }
    const items = readJSON(PORTFOLIO_FILE);
    const newItem = {
      _id: 'port-' + Date.now(),
      ...data,
      createdAt: new Date().toISOString(),
    };
    items.unshift(newItem);
    writeJSON(PORTFOLIO_FILE, items);
    return newItem;
  },
};
