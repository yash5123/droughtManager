import express from 'express';
import DroughtRisk from '../models/DroughtRisk.js';
import Village from '../models/Village.js';
import Rainfall from '../models/Rainfall.js';
import Groundwater from '../models/Groundwater.js';

const router = express.Router();

// GET /api/risk - paginated list of risk records
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      DroughtRisk.find().populate('village').sort({ date: -1, riskScore: -1 }).skip(skip).limit(limit),
      DroughtRisk.countDocuments()
    ]);

    res.json({ data, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/risk/latest - latest risk score per village, sorted by riskScore desc
router.get('/latest', async (req, res) => {
  try {
    const data = await DroughtRisk.aggregate([
      { $sort: { date: -1 } },
      { $group: {
        _id: '$village',
        riskScore: { $first: '$riskScore' },
        riskLevel: { $first: '$riskLevel' },
        rainfallDeficit: { $first: '$rainfallDeficit' },
        gwDepletion: { $first: '$gwDepletion' },
        date: { $first: '$date' },
        metricsSnapshot: { $first: '$metricsSnapshot' }
      }},
      { $sort: { riskScore: -1 } },
      { $lookup: { from: 'villages', localField: '_id', foreignField: '_id', as: 'village' } },
      { $unwind: '$village' }
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/risk/calculate - compute and upsert drought risk for all villages
router.post('/calculate', async (req, res) => {
  try {
    const villages = await Village.find().lean();

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const NORMAL_90DAY_RAINFALL_MM = 200; // Baseline for semi-arid regions
    const NORMAL_GW_LEVEL_M = 5;         // Healthy water table depth in meters

    const results = await Promise.all(
      villages.map(async (village) => {
        // Aggregate average rainfall over last 90 days
        const rainfallAgg = await Rainfall.aggregate([
          { $match: { village: village._id, date: { $gte: ninetyDaysAgo } } },
          { $group: { _id: null, avgAmountMm: { $avg: '$amountMm' }, totalAmountMm: { $sum: '$amountMm' } } }
        ]);
        const rainfallAvg = rainfallAgg[0]?.avgAmountMm || 0;
        const totalRainfall90d = rainfallAgg[0]?.totalAmountMm || 0;

        // Aggregate average groundwater level over last 90 days
        const gwAgg = await Groundwater.aggregate([
          { $match: { village: village._id, date: { $gte: ninetyDaysAgo } } },
          { $group: { _id: null, avgLevel: { $avg: '$levelMeters' } } }
        ]);
        const gwAvg = gwAgg[0]?.avgLevel || NORMAL_GW_LEVEL_M;

        // Calculate rainfall deficit (0-100 scale, higher = worse)
        const rainfallDeficit = Math.max(0, Math.min(100,
          Math.round(((NORMAL_90DAY_RAINFALL_MM - totalRainfall90d) / NORMAL_90DAY_RAINFALL_MM) * 100)
        ));

        // Calculate groundwater depletion (deeper = more depleted)
        const gwDepletion = Math.max(0, Math.min(100,
          Math.round(((gwAvg - NORMAL_GW_LEVEL_M) / NORMAL_GW_LEVEL_M) * 100)
        ));

        // Weighted risk score: 40% rainfall, 35% groundwater, 25% population demand gap
        const popDemandGap = 50;
        const riskScore = Math.round(
          (rainfallDeficit * 0.40) + (gwDepletion * 0.35) + (popDemandGap * 0.25)
        );

        // Four-level classification
        let riskLevel = 'Normal';
        if (riskScore > 70) riskLevel = 'Extreme';
        else if (riskScore > 50) riskLevel = 'Severe';
        else if (riskScore > 25) riskLevel = 'Moderate';

        // Upsert: one record per village per day
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await DroughtRisk.updateOne(
          { village: village._id, date: today },
          {
            $set: {
              riskScore,
              riskLevel,
              rainfallDeficit,
              gwDepletion,
              metricsSnapshot: { rainfallAvg, groundwaterAvg: gwAvg }
            }
          },
          { upsert: true }
        );

        return {
          village: { _id: village._id, name: village.name, district: village.district, state: village.state },
          riskScore,
          riskLevel,
          rainfallDeficit,
          gwDepletion,
          totalRainfall90d: Math.round(totalRainfall90d * 10) / 10
        };
      })
    );

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
