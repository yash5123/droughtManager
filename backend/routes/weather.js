import express from 'express';
import fetch from 'node-fetch';
import authMiddleware from '../middleware/auth.js';
import { runDailyWeatherJob, dailyJobStatus } from '../jobs/dailyWeatherJob.js';
import { getForecastWeather, getSimulationWeather, getArchiveWeather } from '../services/weatherCacheService.js';
import Village from '../models/Village.js';

const router = express.Router();

/**
 * GET /api/weather/forecasts/:villageId
 * Cache-first 16-day forecast.
 */
router.get('/forecasts/:villageId', async (req, res) => {
  try {
    const village = await Village.findById(req.params.villageId);
    if (!village) return res.status(404).json({ error: 'Village not found' });

    const forecast = await getForecastWeather(village._id, village.lat, village.lon);
    res.json(forecast);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/weather/simulate
 * Cache-first simulation data fetcher.
 */
router.post('/simulate', async (req, res) => {
  try {
    const { lat, lon, timeHorizonDays = 30 } = req.body;
    if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });

    const data = await getSimulationWeather(lat, lon, timeHorizonDays);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/weather/archive/:villageId
 * Cache-first 30-day historical data.
 */
router.get('/archive/:villageId', async (req, res) => {
  try {
    const village = await Village.findById(req.params.villageId);
    if (!village) return res.status(404).json({ error: 'Village not found' });

    const archive = await getArchiveWeather(village._id, village.lat, village.lon);
    res.json(archive);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/weather/trigger-daily-job
 * Manually triggers the daily weather fetch + risk scoring job.
 * Returns immediately with job status.
 */
router.post('/trigger-daily-job', authMiddleware, async (req, res) => {
  if (dailyJobStatus.running) {
    return res.json({ message: 'Daily job already running', status: dailyJobStatus });
  }
  
  // Fire and forget - don't block the response
  runDailyWeatherJob().catch(err => console.error('[API] Daily job trigger error:', err));
  
  res.json({
    message: 'Daily weather job triggered',
    status: dailyJobStatus
  });
});

/**
 * GET /api/weather/job-status
 * Returns current status of the daily weather job.
 */
router.get('/job-status', (req, res) => {
  res.json(dailyJobStatus);
});

/**
 * GET /api/weather/cache-status
 * Returns cache statistics.
 */
router.get('/cache-status', async (req, res) => {
  try {
    const { DailyWeatherCache, ForecastCache, SimulationCache } = await import('../models/WeatherCache.js');
    const [daily, forecast, sim] = await Promise.all([
      DailyWeatherCache.countDocuments(),
      ForecastCache.countDocuments(),
      SimulationCache.countDocuments()
    ]);
    res.json({
      dailyRecords: daily,
      forecastRecords: forecast,
      simulationRecords: sim,
      lastUpdate: dailyJobStatus.lastSuccess
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;
