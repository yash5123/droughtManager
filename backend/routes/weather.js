import express from 'express';
import fetch from 'node-fetch';
import { runDailyWeatherJob, dailyJobStatus } from '../jobs/dailyWeatherJob.js';

const router = express.Router();

/**
 * GET /api/weather/historical
 * Server-side proxy to Open-Meteo Archive API.
 * Query params: lat, lon, days (default 30)
 * Returns daily precipitation_sum, temperature_2m_mean, soil_moisture_0_to_7cm_mean
 */
router.get('/historical', async (req, res) => {
  try {
    const { lat, lon, days = 30 } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'lat and lon query parameters are required' });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const fmt = (d) => d.toISOString().split('T')[0];

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${fmt(startDate)}&end_date=${fmt(endDate)}&daily=precipitation_sum,temperature_2m_mean,soil_moisture_0_to_7cm_mean&timezone=Asia/Kolkata`;

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: `Open-Meteo returned ${response.status}` });
    }

    const data = await response.json();
    res.json({ source: 'open-meteo-proxy', ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/weather/forecast
 * Server-side proxy to Open-Meteo Forecast API.
 * Query params: lat, lon
 * Returns 16-day forecast: precipitation_sum, temperature_2m_max/min, soil_moisture_0_to_7cm_mean
 */
router.get('/forecast', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'lat and lon query parameters are required' });
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min,soil_moisture_0_to_7cm_mean&forecast_days=16&timezone=Asia/Kolkata`;

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: `Open-Meteo returned ${response.status}` });
    }

    const data = await response.json();
    res.json({ source: 'open-meteo-proxy', ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/weather/trigger-daily-job
 * Manually triggers the daily weather fetch + risk scoring job.
 * Returns immediately with job status.
 */
router.post('/trigger-daily-job', async (req, res) => {
  if (dailyJobStatus.running) {
    return res.json({ message: 'Daily job already running', status: dailyJobStatus });
  }
  
  // Fire and forget — don't block the response
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

export default router;
