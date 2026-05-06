/**
 * Weather Service — Thin Backend Wrapper
 *
 * The frontend no longer fetches weather data or calculates risk scores.
 * All risk computation happens on the backend via the daily weather job.
 * This service provides wrappers for the remaining frontend-facing endpoints.
 */

import api from './api.js';

/**
 * Fetch full risk detail for a single village.
 * Returns village info + latest risk breakdown + precipitation history.
 */
export async function fetchVillageDetail(villageId) {
  try {
    const res = await api.get(`/villages/${villageId}/detail`);
    return res.data;
  } catch (err) {
    console.error('Failed to fetch village detail:', err.message);
    return null;
  }
}

/**
 * Fetch 16-day weather forecast for a village's coordinates.
 * Used by the Predictions page.
 */
export async function fetchVillageForecast(lat, lon) {
  try {
    const res = await api.get('/weather/forecast', {
      params: { lat, lon }
    });
    return res.data;
  } catch (err) {
    console.error('Failed to fetch forecast:', err.message);
    return null;
  }
}

/**
 * Fetch historical weather data for a village's coordinates.
 * Used by RainfallAnalysis, GroundwaterAnalysis, and RiskCalculator.
 * Returns { data, dataSource } for backward compatibility.
 */
export async function fetchHistoricalWeather(lat, lon, days = 30) {
  try {
    const res = await api.get('/weather/historical', {
      params: { lat, lon, days }
    });
    return { data: res.data, dataSource: res.data?.source || 'backend_proxy' };
  } catch (err) {
    console.error('Failed to fetch historical weather:', err.message);
    return { data: null, dataSource: 'error' };
  }
}

/**
 * Backward-compatible alias for FuturePrediction page.
 */
export async function fetchForecast(lat, lon) {
  return fetchVillageForecast(lat, lon);
}

/**
 * Compute local risk metrics from raw Open-Meteo weather data.
 * Used by RiskCalculator for on-demand scenario simulation.
 */
export function computeLocalRiskMetrics(data) {
  if (!data?.daily) {
    return { totalPrecipitation: 0, daysWithRain: 0, daysTotal: 0, avgSoilMoisture: null };
  }
  
  const precip = data.daily.precipitation_sum || [];
  const totalPrecipitation = Math.round(precip.reduce((s, v) => s + (v || 0), 0) * 10) / 10;
  const daysWithRain = precip.filter(v => (v || 0) > 0.1).length;
  const daysTotal = precip.length;
  
  // Soil moisture: try daily first, then compute from source
  const soilMoisture = data.daily.soil_moisture_0_to_7cm_mean || [];
  let avgSoilMoisture = null;
  if (soilMoisture.length > 0) {
    const validValues = soilMoisture.filter(v => v != null);
    avgSoilMoisture = validValues.length > 0
      ? Math.round((validValues.reduce((s, v) => s + v, 0) / validValues.length) * 1000) / 1000
      : null;
  }
  
  return { totalPrecipitation, daysWithRain, daysTotal, avgSoilMoisture };
}
