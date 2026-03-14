import express from 'express';
import Village from '../models/Village.js';
import DroughtRisk from '../models/DroughtRisk.js';
import Tanker from '../models/Tanker.js';
import Rainfall from '../models/Rainfall.js';
import Groundwater from '../models/Groundwater.js';

const router = express.Router();

router.get('/summary', async (req, res) => {
  try {
    const totalVillages = await Village.countDocuments();
    const latestRisks = await DroughtRisk.find().sort({ date: -1 }).limit(totalVillages); 
    const criticalRegions = latestRisks.filter(r => r.riskLevel === 'Critical').length;
    
    const activeTankers = await Tanker.countDocuments({ status: { $ne: 'Delivered' } });
    
    // basic mock data for chart trends
    const recentRainfall = await Rainfall.find().sort({date: -1}).limit(6);

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
