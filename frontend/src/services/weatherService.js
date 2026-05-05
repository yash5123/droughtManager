/**
 * Weather Service — Backend-First Architecture
 *
 * ALL weather data requests go through the backend proxy routes:
 *   GET /api/weather/historical?lat=&lon=&days=
 *   GET /api/weather/forecast?lat=&lon=
 *
 * The backend proxies these to Open-Meteo server-side, centralizing
 * rate limit management and preventing direct browser→external API calls.
 *
 * IMPORTANT: If the backend proxy routes return 404 (not yet deployed),
 * the functions below will return { data: null, dataSource: 'unavailable' }.
 * They will NEVER generate fake/random data. Components must handle empty states.
 */

import api from './api.js';

/**
 * Fetch historical weather data for a location.
 * @returns {{ data: object|null, dataSource: 'backend-proxy'|'unavailable' }}
 */
export async function fetchHistoricalWeather(lat, lon, days = 30) {
  try {
    const res = await api.get('/weather/historical', {
      params: { lat, lon, days }
    });
    return { data: res.data, dataSource: 'backend-proxy' };
  } catch (err) {
    console.warn(`Weather historical fetch failed for (${lat}, ${lon}):`, err.message);
    return { data: null, dataSource: 'unavailable' };
  }
}

/**
 * Fetch 16-day forecast for a location.
 * @returns {{ data: object|null, dataSource: 'backend-proxy'|'unavailable' }}
 */
export async function fetchForecast(lat, lon) {
  try {
    const res = await api.get('/weather/forecast', {
      params: { lat, lon }
    });
    return { data: res.data, dataSource: 'backend-proxy' };
  } catch (err) {
    console.warn(`Weather forecast fetch failed for (${lat}, ${lon}):`, err.message);
    return { data: null, dataSource: 'unavailable' };
  }
}

/**
 * Calculate drought risk metrics from raw weather data.
 * This is a READ-ONLY client-side computation for display purposes.
 * The authoritative risk scores come from the backend POST /api/risk/calculate.
 */
export function computeLocalRiskMetrics(weatherData) {
  if (!weatherData?.daily) return null;

  const { precipitation_sum = [], soil_moisture_0_to_7cm_mean = [] } = weatherData.daily;

  const totalPrecip = precipitation_sum.reduce((s, v) => s + (v || 0), 0);
  const avgSoilMoisture = soil_moisture_0_to_7cm_mean.length > 0
    ? soil_moisture_0_to_7cm_mean.reduce((s, v) => s + (v || 0), 0) / soil_moisture_0_to_7cm_mean.length
    : null;

  return {
    totalPrecipitation: Math.round(totalPrecip * 10) / 10,
    avgSoilMoisture: avgSoilMoisture !== null ? Math.round(avgSoilMoisture * 100) / 100 : null,
    daysWithRain: precipitation_sum.filter(v => v > 0.1).length,
    daysTotal: precipitation_sum.length,
  };
}
