import express from 'express';
import Village from '../models/Village.js';

const router = express.Router();

// GET /api/villages - public list of all villages
router.get('/', async (req, res) => {
  try {
    const villages = await Village.find().lean();
    res.json(villages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/villages/search?q=term
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q.trim()) return res.json([]);

    const villages = await Village.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { district: { $regex: q, $options: 'i' } },
        { state: { $regex: q, $options: 'i' } }
      ]
    }).lean();
    res.json(villages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
