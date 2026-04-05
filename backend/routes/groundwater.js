import express from 'express';
import Groundwater from '../models/Groundwater.js';

const router = express.Router();

// Get paginated groundwater data
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Groundwater.find().populate('village', 'name region').sort({ date: -1 }).skip(skip).limit(limit),
      Groundwater.countDocuments()
    ]);

    res.json({ data, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get monthly average groundwater level metrics for charts
router.get('/metrics', async (req, res) => {
  try {
    const data = await Groundwater.aggregate([
      {
        $group: {
          _id: { month: { $month: '$date' }, year: { $year: '$date' } },
          avgLevel: { $avg: '$levelMeters' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
