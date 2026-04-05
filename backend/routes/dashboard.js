import express from 'express';
import Village from '../models/Village.js';
import DroughtRisk from '../models/DroughtRisk.js';
import Tanker from '../models/Tanker.js';
import Rainfall from '../models/Rainfall.js';

const router = express.Router();

router.get('/summary', async (req, res) => {
  try {
    const totalVillages = await Village.countDocuments();

    // Use aggregation to get the LATEST risk per village, then count critical ones
    const latestRisks = await DroughtRisk.aggregate([
      { $sort: { date: -1 } },
      { $group: { _id: '$village', riskLevel: { $first: '$riskLevel' }, riskScore: { $first: '$riskScore' } } }
    ]);
    const criticalRegions = latestRisks.filter(r => r.riskLevel === 'Critical').length;

    const activeTankers = await Tanker.countDocuments({ status: { $ne: 'Delivered' } });

    // Aggregate recent rainfall: average amountMm over the last 6 records
    const recentRainfall = await Rainfall.find()
      .sort({ date: -1 })
      .limit(6)
      .populate('village', 'name');

    res.json({
      totalVillagesMonitored: totalVillages,
      criticalRegions,
      activeTankers,
      recentRainfallTrend: recentRainfall,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
