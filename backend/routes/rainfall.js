import express from 'express';
import Rainfall from '../models/Rainfall.js';
import Village from '../models/Village.js';

const router = express.Router();

// Get all rainfall data
router.get('/', async (req, res) => {
  try {
    const data = await Rainfall.find().populate('village');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get rainfall metrics for dashboard charts
router.get('/metrics', async (req, res) => {
  try {
    // Generate some generic metrics simulating history
    const data = await Rainfall.aggregate([
      {
         $group: {
           _id: { month: { $month: "$date" }, year: { $year: "$date" } },
           avgAmount: { $avg: "$amountMm" }
         }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
