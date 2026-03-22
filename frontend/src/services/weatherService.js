/**
 * Open-Meteo Weather Service
 * Fetches real-time weather, historical, and forecast data for drought monitoring.
 * No API key required — completely free.
 * Docs: https://open-meteo.com/en/docs
 */

import { villages } from '../utils/villageData';

const BASE_URL = 'https://api.open-meteo.com/v1';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';

// Simple in-memory cache to avoid redundant API calls within the same session
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCacheKey(url) {
  return url;
}

function getFromCache(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

async function fetchWithCache(url) {
  const key = getCacheKey(url);
  const cached = getFromCache(key);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo API error: ${res.status}`);
  const data = await res.json();
  setCache(key, data);
  return data;
}

// ─── Helper: Get today's date and past date in YYYY-MM-DD ───
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function getDateRange(daysBack) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  return { start: formatDate(start), end: formatDate(end) };
}

// ─────────────────────────────────────────────
// 1. CURRENT WEATHER for a single village
// ─────────────────────────────────────────────
export async function getCurrentWeather(lat, lng) {
  const url = `${BASE_URL}/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m,soil_moisture_0_to_7cm&timezone=Asia/Kolkata`;
  return fetchWithCache(url);
}

// ─────────────────────────────────────────────
// 2. 7-DAY FORECAST (daily) for a single village
// ─────────────────────────────────────────────
export async function getDailyForecast(lat, lng) {
  const url = `${BASE_URL}/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,rain_sum,et0_fao_evapotranspiration&timezone=Asia/Kolkata&forecast_days=16`;
  return fetchWithCache(url);
}

// ─────────────────────────────────────────────
// 3. HISTORICAL WEATHER (past N days)
// ─────────────────────────────────────────────
export async function getHistoricalWeather(lat, lng, daysBack = 90) {
  const { start, end } = getDateRange(daysBack);
  const url = `${ARCHIVE_URL}?latitude=${lat}&longitude=${lng}&start_date=${start}&end_date=${end}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,rain_sum,et0_fao_evapotranspiration&timezone=Asia/Kolkata`;
  return fetchWithCache(url);
}

// ─────────────────────────────────────────────
// 4. SOIL MOISTURE (proxy for groundwater)
// ─────────────────────────────────────────────
export async function getSoilMoisture(lat, lng) {
  const url = `${BASE_URL}/forecast?latitude=${lat}&longitude=${lng}&hourly=soil_moisture_0_to_7cm,soil_moisture_7_to_28cm,soil_moisture_28_to_100cm&timezone=Asia/Kolkata&forecast_days=7&past_days=7`;
  return fetchWithCache(url);
}

// ─────────────────────────────────────────────
// 5. BATCH: Fetch current weather for ALL villages
// ─────────────────────────────────────────────
export async function getAllVillagesCurrentWeather() {
  const results = await Promise.allSettled(
    villages.map(async (v) => {
      const data = await getCurrentWeather(v.latitude, v.longitude);
      return { ...v, weather: data.current };
    })
  );
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}

// ─────────────────────────────────────────────
// 6. BATCH: Fetch historical rainfall for ALL villages (past 30 days)
// ─────────────────────────────────────────────
export async function getAllVillagesRainfall(daysBack = 30) {
  const results = await Promise.allSettled(
    villages.map(async (v) => {
      const data = await getHistoricalWeather(v.latitude, v.longitude, daysBack);
      const totalRainfall = (data.daily?.precipitation_sum || []).reduce((sum, val) => sum + (val || 0), 0);
      const avgRainfall = totalRainfall / (daysBack || 1);
      return {
        ...v,
        totalRainfall: Math.round(totalRainfall * 10) / 10,
        avgDailyRainfall: Math.round(avgRainfall * 100) / 100,
        dailyData: data.daily
      };
    })
  );
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}

// ─────────────────────────────────────────────
// 7. BATCH: Fetch soil moisture for ALL villages
// ─────────────────────────────────────────────
export async function getAllVillagesSoilMoisture() {
  const results = await Promise.allSettled(
    villages.map(async (v) => {
      const data = await getSoilMoisture(v.latitude, v.longitude);
      // Get the latest non-null soil moisture reading
      const hourly = data.hourly || {};
      const shallow = hourly.soil_moisture_0_to_7cm || [];
      const mid = hourly.soil_moisture_7_to_28cm || [];
      const deep = hourly.soil_moisture_28_to_100cm || [];

      // Get latest valid readings
      const latestShallow = shallow.filter(v => v !== null).slice(-1)[0] || 0;
      const latestMid = mid.filter(v => v !== null).slice(-1)[0] || 0;
      const latestDeep = deep.filter(v => v !== null).slice(-1)[0] || 0;

      // Convert soil moisture (m³/m³) to an approximate depth scale (meters)
      // Lower moisture = deeper water table (inverse relationship)
      const avgMoisture = (latestShallow + latestMid + latestDeep) / 3;
      const estimatedDepth = Math.round(Math.max(5, 50 - (avgMoisture * 200)) * 10) / 10;

      return {
        ...v,
        soilMoisture: {
          shallow: Math.round(latestShallow * 1000) / 10, // convert to %
          mid: Math.round(latestMid * 1000) / 10,
          deep: Math.round(latestDeep * 1000) / 10,
        },
        estimatedDepth,
        avgMoisture: Math.round(avgMoisture * 1000) / 10
      };
    })
  );
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}

// ─────────────────────────────────────────────
// 8. BATCH: 16-day forecast for ALL villages
// ─────────────────────────────────────────────
export async function getAllVillagesForecast() {
  const results = await Promise.allSettled(
    villages.map(async (v) => {
      const data = await getDailyForecast(v.latitude, v.longitude);
      return { ...v, forecast: data.daily };
    })
  );
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}

// ─────────────────────────────────────────────
// 9. DROUGHT RISK SCORE calculation from real data
// ─────────────────────────────────────────────
export async function calculateDroughtRisk() {
  const [rainfallData, soilData] = await Promise.all([
    getAllVillagesRainfall(90), // 90-day rainfall
    getAllVillagesSoilMoisture()
  ]);

  return villages.map((v) => {
    const rain = rainfallData.find(r => r.id === v.id);
    const soil = soilData.find(s => s.id === v.id);

    // Normal monsoon rainfall for Maharashtra: ~150-200mm per month
    // 90-day normal: ~450-600mm total
    const NORMAL_90DAY_RAINFALL_MM = 500;
    const totalRain = rain?.totalRainfall || 0;
    const rainfallDeficit = Math.max(0, Math.min(100,
      Math.round(((NORMAL_90DAY_RAINFALL_MM - totalRain) / NORMAL_90DAY_RAINFALL_MM) * 100)
    ));

    // Soil moisture depletion (lower moisture = higher depletion)
    const avgMoisture = soil?.avgMoisture || 0;
    const NORMAL_MOISTURE_PCT = 25; // ~25% is healthy
    const moistureDepletion = Math.max(0, Math.min(100,
      Math.round(((NORMAL_MOISTURE_PCT - avgMoisture) / NORMAL_MOISTURE_PCT) * 100)
    ));

    // Risk Score = 0.40(R) + 0.35(GW) + 0.25(P)
    // P (population demand gap) stays at a baseline since we don't have live demand
    const popDemandGap = 50; // baseline estimate
    const riskScore = Math.round(
      (rainfallDeficit * 0.40) + (moistureDepletion * 0.35) + (popDemandGap * 0.25)
    );

    let riskLevel = 'Normal';
    if (riskScore > 70) riskLevel = 'Critical';
    else if (riskScore > 40) riskLevel = 'Moderate Risk';

    return {
      ...v,
      riskScore,
      riskLevel,
      rainfallDeficit,
      moistureDepletion,
      totalRainfall90d: totalRain,
      avgMoisture
    };
  });
}

// ─────────────────────────────────────────────
// 10. DASHBOARD SUMMARY from real data
// ─────────────────────────────────────────────
export async function getDashboardSummary() {
  const [weatherData, riskData] = await Promise.all([
    getAllVillagesCurrentWeather(),
    calculateDroughtRisk()
  ]);

  const criticalCount = riskData.filter(r => r.riskLevel === 'Critical').length;
  const avgRainfall = weatherData.length > 0
    ? Math.round(weatherData.reduce((sum, v) => sum + (v.weather?.precipitation || 0), 0) / weatherData.length * 10) / 10
    : 0;

  return {
    villages: villages.length,
    critical: criticalCount,
    avgRainfall,
    weatherData,
    riskData
  };
}

// ─────────────────────────────────────────────
// 11. SUPPLY VS DEMAND with real weather context
// ─────────────────────────────────────────────
export async function getSupplyDemandAnalysis() {
  const rainfallData = await getAllVillagesRainfall(30);

  return villages.map((v, i) => {
    const rain = rainfallData.find(r => r.id === v.id);
    // Base demand: 135 liters per person per day (Indian standard)
    const population = [2400, 2100, 5800, 4200, 3500][i] || 3000;
    const demand = population * 135;

    // Supply estimation: based on rainwater harvesting potential + pipeline
    // More rainfall = more supply
    const rainFactor = Math.min(1.2, (rain?.totalRainfall || 50) / 100);
    const baseSupply = demand * 0.7; // baseline pipeline supply
    const rainSupply = demand * 0.3 * rainFactor; // rain-dependent supply
    const supply = Math.round(baseSupply + rainSupply);

    return {
      ...v,
      population,
      demand,
      supply,
      deficit: Math.max(0, demand - supply),
      status: supply >= demand ? 'Sufficient' : 'Shortage',
      rainfallContext: rain?.totalRainfall || 0
    };
  });
}
