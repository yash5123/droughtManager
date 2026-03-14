import express from 'express';
import Groundwater from '../models/Groundwater.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const data = await Groundwater.find().populate('village').sort({ date: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/metrics', async (req, res) => {
  try {
    const data = await Groundwater.aggregate([
      {
         $group: {
           _id: { month: { $month: "$date" }, year: { $year: "$date" } },
           avgLevel: { $avg: "$levelMeters" }
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
