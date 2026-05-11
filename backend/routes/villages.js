import express from 'express';
import Village from '../models/Village.js';
import DroughtRisk from '../models/DroughtRisk.js';
import { seedingProgress } from '../jobs/seedDistricts.js';
import { dailyJobStatus } from '../jobs/dailyWeatherJob.js';
import { getForecastWeather } from '../services/weatherCacheService.js';

const router = express.Router();

/**
 * GET /api/villages/ranked?limit=50
 * Primary endpoint: returns top N districts sorted by latest riskScore descending.
 * Aggregates the latest DroughtRisk per village and joins with Village data.
 */
router.get('/ranked', async (req, res) => {
  try {
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit) || 50));
    
    const pipeline = [
      // Get the latest risk record per village
      { $sort: { date: -1 } },
      { $group: {
        _id: '$village',
        riskScore: { $first: '$riskScore' },
        riskLevel: { $first: '$riskLevel' },
        rainfallDeficit: { $first: '$rainfallDeficit' },
        soilMoistureDepletion: { $first: '$soilMoistureDepletion' },
        populationDemandGap: { $first: '$populationDemandGap' },
        totalPrecipitation30d_mm: { $first: '$totalPrecipitation30d_mm' },
        avgSoilMoisturePct: { $first: '$avgSoilMoisturePct' },
        date: { $first: '$date' },
        metricsSnapshot: { $first: '$metricsSnapshot' }
      }},
      { $addFields: {
        avgSoilMoisturePct: {
          $cond: {
            if: { $isNumber: '$metricsSnapshot.soilMoistureFrac' },
            then: { $multiply: ['$metricsSnapshot.soilMoistureFrac', 100] },
            else: { $ifNull: ['$avgSoilMoisturePct', 0] }
          }
        }
      }},
      { $sort: { riskScore: -1, _id: 1 } },
      { $limit: limit },
      // Join with village details
      { $lookup: {
        from: 'villages',
        localField: '_id',
        foreignField: '_id',
        as: 'village'
      }},
      { $unwind: '$village' },
      // Project final shape
      { $project: {
        _id: '$village._id',
        name: '$village.name',
        district: '$village.district',
        state: '$village.state',
        population: '$village.population',
        location: '$village.location',
        lat: '$village.lat',
        lon: '$village.lon',
        riskScore: 1,
        riskLevel: 1,
        rainfallDeficit: 1,
        soilMoistureDepletion: 1,
        populationDemandGap: 1,
        totalPrecipitation30d_mm: 1,
        avgSoilMoisturePct: 1,
        date: 1,
        metricsSnapshot: 1
      }}
    ];
    
    const results = await DroughtRisk.aggregate(pipeline);
    const totalVillages = await Village.countDocuments();
    
    // Include metadata about data freshness
    const latestDate = results.length > 0 ? results[0].date : null;
    const hoursOld = latestDate ? (Date.now() - new Date(latestDate).getTime()) / (1000 * 60 * 60) : null;
    
    res.json({
      data: results,
      meta: {
        total: totalVillages,
        latestDate,
        hoursOld: hoursOld ? Math.round(hoursOld * 10) / 10 : null,
        isStale: hoursOld ? hoursOld > 48 : true,
        dailyJobRunning: dailyJobStatus.running,
        lastJobSuccess: dailyJobStatus.lastSuccess
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/villages/forecasts
 * Returns bulk forecast data for multiple villages.
 */
router.get('/forecasts', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    const villages = await Village.find({
      geocodingStatus: { $ne: 'failed' },
      lat: { $ne: null },
      lon: { $ne: null }
    })
      .sort({ riskScore: -1 })
      .limit(limit)
      .select('_id name state district lat lon riskScore riskLevel population');

    const forecasts = await Promise.all(
      villages.map(async (village) => {
        try {
          const forecast = await getForecastWeather(
            village._id,
            village.lat,
            village.lon
          );
          return {
            villageId: village._id,
            name: village.name,
            state: village.state,
            district: village.district,
            riskScore: village.riskScore,
            riskLevel: village.riskLevel,
            population: village.population,
            lat: village.lat,
            lon: village.lon,
            precipitationForecast: forecast.precipitationForecast,
            probabilityForecast: forecast.probabilityForecast,
            forecastDates: forecast.forecastDates,
            totalPrecip16d_mm: forecast.totalPrecip16d_mm,
            dryDaysCount: forecast.dryDaysCount,
            source: forecast.source
          };
        } catch (err) {
          console.warn(`[Forecasts] Failed for ${village.name}: ${err.message}`);
          return null;
        }
      })
    );

    const validForecasts = forecasts.filter(Boolean);
    res.json({
      count: validForecasts.length,
      cacheDate: new Date().toISOString().split('T')[0],
      forecasts: validForecasts
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/villages/seeding-status
 * Returns current progress of the one-time seeding job.
 */
router.get('/seeding-status', (req, res) => {
  const totalGeocoded = seedingProgress.geocodedCount + seedingProgress.failedGeocode;
  const totalBaselined = seedingProgress.baselinedCount + seedingProgress.failedBaseline;
  
  res.json({
    ...seedingProgress,
    totalProcessedGeocode: totalGeocoded,
    totalProcessedBaseline: totalBaselined,
    dailyJob: {
      running: dailyJobStatus.running,
      lastRun: dailyJobStatus.lastRun,
      lastSuccess: dailyJobStatus.lastSuccess,
      processedCount: dailyJobStatus.processedCount,
      totalToProcess: dailyJobStatus.totalToProcess
    }
  });
});

/**
 * GET /api/villages/:id/detail
 * Full risk breakdown for a single district including precipitation history.
 */
router.get('/:id/detail', async (req, res) => {
  try {
    const village = await Village.findById(req.params.id).lean();
    if (!village) return res.status(404).json({ error: 'Village not found' });
    
    // Get last 7 risk records for trend
    const riskHistory = await DroughtRisk.find({ village: village._id })
      .sort({ date: -1 })
      .limit(7)
      .lean();
    
    const latestRisk = riskHistory[0] || null;
    
    res.json({
      village,
      latestRisk,
      riskHistory,
      precipitationArray: latestRisk?.precipitationArray || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/villages - all villages (for map, search, etc.)
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
