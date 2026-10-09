import express from 'express';
import { dbService } from '../services/dbFallback.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/portfolio
 * Public: list portfolio projects with optional category filter
 */
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const items = await dbService.getPortfolio(category);
    res.json({ success: true, count: items.length, portfolio: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/portfolio
 * Admin Protected: add new portfolio project
 */
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const { title, category, material, description, imageUrl, featured } = req.body;
    if (!title || !category || !material || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, category, material, and imageUrl.',
      });
    }

    const created = await dbService.createPortfolioItem({
      title,
      category,
      material,
      description: description || '',
      imageUrl,
      featured: Boolean(featured),
    });

    res.status(201).json({ success: true, item: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
