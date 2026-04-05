import express from 'express';
import Village from '../models/Village.js';
import Rainfall from '../models/Rainfall.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const villages = await Village.find().lean();

    // Fetch most recent rainfall record per village for supply estimation
    const rainfallByVillage = await Rainfall.aggregate([
      { $sort: { date: -1 } },
      { $group: { _id: '$village', latestRainfall: { $first: '$amountMm' } } }
    ]);

    const rainfallMap = Object.fromEntries(
      rainfallByVillage.map(r => [String(r._id), r.latestRainfall])
    );

    const analysis = villages.map(v => {
      // 135 liters per capita per day — standard Indian MDWS norm
      const demand = Math.round(v.population * 135);

      // Supply = 70% baseline pipeline + 30% adjusted by recent rainfall (mm → % factor)
      const latestRainfall = rainfallMap[String(v._id)] || 0;
      const rainFactor = Math.min(1.2, latestRainfall / 100);
      const supply = Math.round(demand * 0.7 + demand * 0.3 * rainFactor);
      const deficit = Math.max(0, demand - supply);

      return {
        village: v,
        demand,
        supply,
        deficit,
        status: deficit > 0 ? 'Shortage' : 'Sufficient'
      };
    });

    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
