import fetch from 'node-fetch';
import { DailyWeatherCache, ForecastCache, SimulationCache } from '../models/WeatherCache.js';

const OPEN_METEO_ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';
const OPEN_METEO_FORECAST = 'https://api.open-meteo.com/v1/forecast';
const BATCH_SIZE = 50;
const today = () => new Date().toISOString().split('T')[0];

/**
 * 2A — Implement the archive data reader
 */
export async function getArchiveWeather(villageId, lat, lon) {
  const cacheDate = today();

  const cached = await DailyWeatherCache.findOne({ villageId, cacheDate });
  let precipitationArray, soilMoistureArray, totalPrecipitation30d_mm, avgSoilMoistureFrac;

  if (cached) {
    precipitationArray = cached.precipitationArray;
    soilMoistureArray = cached.soilMoistureArray;
    totalPrecipitation30d_mm = cached.totalPrecipitation30d_mm;
    avgSoilMoistureFrac = cached.avgSoilMoistureFrac;
  } else {
    // Cache miss — fetch from API
    const endDate = cacheDate;
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const url = `${OPEN_METEO_ARCHIVE}`
      + `?latitude=${lat}&longitude=${lon}`
      + `&start_date=${startDate}&end_date=${endDate}`
      + `&daily=precipitation_sum,soil_moisture_0_to_7cm_mean`
      + `&timezone=Asia%2FKolkata`;

    const data = await fetchWithBackoff(url);
    precipitationArray = data.daily?.precipitation_sum || [];
    soilMoistureArray = data.daily?.soil_moisture_0_to_7cm_mean || [];
    totalPrecipitation30d_mm = precipitationArray.reduce((a, b) => a + (b || 0), 0);
    avgSoilMoistureFrac = soilMoistureArray.length 
      ? soilMoistureArray.reduce((a, b) => a + (b || 0), 0) / soilMoistureArray.length
      : 0;

    await DailyWeatherCache.findOneAndUpdate(
      { villageId, cacheDate },
      {
        precipitationArray,
        soilMoistureArray,
        totalPrecipitation30d_mm,
        avgSoilMoistureFrac,
        fetchedAt: new Date()
      },
      { upsert: true }
    );
  }

  return {
    daily: {
      time: Array.from({ length: 31 }, (_, i) => {
        const d = new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000);
        return d.toISOString().split('T')[0];
      }),
      precipitation_sum: precipitationArray,
      soil_moisture_0_to_7cm_mean: soilMoistureArray
    },
    totalPrecipitation30d_mm,
    avgSoilMoistureFrac,
    source: cached ? 'cache' : 'api'
  };
}

/**
 * 2B — Implement the batch archive pre-loader
 */
export async function preloadArchiveCacheForAllVillages(villages) {
  const cacheDate = today();
  const endDate = cacheDate;
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  const uncached = [];
  for (const village of villages) {
    const exists = await DailyWeatherCache.exists({ villageId: village._id, cacheDate });
    if (!exists) uncached.push(village);
  }

  console.log(`[Cache] ${villages.length - uncached.length} cache hits, ${uncached.length} need fetching`);

  for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
    const batch = uncached.slice(i, i + BATCH_SIZE);
    const lats = batch.map(v => v.lat).join(',');
    const lons = batch.map(v => v.lon).join(',');

    const url = `${OPEN_METEO_ARCHIVE}`
      + `?latitude=${lats}&longitude=${lons}`
      + `&start_date=${startDate}&end_date=${endDate}`
      + `&daily=precipitation_sum,soil_moisture_0_to_7cm_mean`
      + `&timezone=Asia%2FKolkata`;

    const results = await fetchWithBackoff(url);
    // Open-Meteo returns an array of daily objects if multiple lats/lons are provided
    const dataArray = Array.isArray(results) ? results : [results];

    const bulkOps = dataArray.map((data, index) => {
      const village = batch[index];
      const precipitationArray = data.daily?.precipitation_sum || [];
      const soilMoistureArray = data.daily?.soil_moisture_0_to_7cm_mean || [];
      const totalPrecipitation30d_mm = precipitationArray.reduce((a, b) => a + (b || 0), 0);
      const avgSoilMoistureFrac = soilMoistureArray.length
        ? soilMoistureArray.reduce((a, b) => a + (b || 0), 0) / soilMoistureArray.length
        : 0;

      return {
        updateOne: {
          filter: { villageId: village._id, cacheDate },
          update: {
            $set: {
              precipitationArray,
              soilMoistureArray,
              totalPrecipitation30d_mm,
              avgSoilMoistureFrac,
              fetchedAt: new Date()
            }
          },
          upsert: true
        }
      };
    });

    if (bulkOps.length > 0) {
      await DailyWeatherCache.bulkWrite(bulkOps);
    }
    console.log(`[Cache] Batch ${Math.floor(i / BATCH_SIZE) + 1} written to cache`);
    await sleep(2000);
  }

  console.log(`[Cache] Preload complete. All ${villages.length} villages cached for ${cacheDate}`);
}

/**
 * 2C — Implement the forecast cache reader
 */
export async function getForecastWeather(villageId, lat, lon) {
  const cacheDate = today();

  const cached = await ForecastCache.findOne({ villageId, cacheDate });
  let precipitationForecast, probabilityForecast, forecastDates, totalPrecip16d_mm, dryDaysCount;

  if (cached) {
    precipitationForecast = cached.precipitationForecast;
    probabilityForecast = cached.probabilityForecast;
    forecastDates = cached.forecastDates;
    totalPrecip16d_mm = cached.totalPrecip16d_mm;
    dryDaysCount = cached.dryDaysCount;
  } else {
    const url = `${OPEN_METEO_FORECAST}`
      + `?latitude=${lat}&longitude=${lon}`
      + `&daily=precipitation_sum,precipitation_probability_max`
      + `&forecast_days=16`
      + `&timezone=Asia%2FKolkata`;

    const data = await fetchWithBackoff(url);
    precipitationForecast = data.daily?.precipitation_sum || [];
    probabilityForecast = data.daily?.precipitation_probability_max || [];
    forecastDates = data.daily?.time || [];
    totalPrecip16d_mm = precipitationForecast.reduce((a, b) => a + (b || 0), 0);
    dryDaysCount = precipitationForecast.filter(d => (d || 0) < 1).length;

    await ForecastCache.findOneAndUpdate(
      { villageId, cacheDate },
      {
        precipitationForecast,
        probabilityForecast,
        forecastDates,
        totalPrecip16d_mm,
        dryDaysCount,
        fetchedAt: new Date()
      },
      { upsert: true }
    );
  }

  return {
    daily: {
      time: forecastDates,
      precipitation_sum: precipitationForecast,
      precipitation_probability_max: probabilityForecast
    },
    totalPrecip16d_mm,
    dryDaysCount,
    source: cached ? 'cache' : 'api'
  };
}

/**
 * 2D — Implement the simulation cache reader
 */
export async function getSimulationWeather(lat, lon, timeHorizonDays) {
  const cacheKey = `${lat.toFixed(4)}_${lon.toFixed(4)}_${timeHorizonDays}d_${today()}`;

  const cached = await SimulationCache.findOne({ cacheKey });
  if (cached) {
    return {
      precipitationArray: cached.precipitationArray,
      soilMoistureArray: cached.soilMoistureArray,
      forecastArray: cached.forecastArray,
      source: 'cache'
    };
  }

  const endDate = today();
  const startDate = new Date(Date.now() - timeHorizonDays * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  const archiveUrl = `${OPEN_METEO_ARCHIVE}`
    + `?latitude=${lat}&longitude=${lon}`
    + `&start_date=${startDate}&end_date=${endDate}`
    + `&daily=precipitation_sum,soil_moisture_0_to_7cm_mean`
    + `&timezone=Asia%2FKolkata`;

  const forecastUrl = `${OPEN_METEO_FORECAST}`
    + `?latitude=${lat}&longitude=${lon}`
    + `&daily=precipitation_sum`
    + `&forecast_days=16`
    + `&timezone=Asia%2FKolkata`;

  const [archiveData, forecastData] = await Promise.all([
    fetchWithBackoff(archiveUrl),
    fetchWithBackoff(forecastUrl)
  ]);

  const precipitationArray = archiveData.daily?.precipitation_sum || [];
  const soilMoistureArray = archiveData.daily?.soil_moisture_0_to_7cm_mean || [];
  const forecastArray = forecastData.daily?.precipitation_sum || [];

  await SimulationCache.create({
    cacheKey,
    latitude: lat,
    longitude: lon,
    timeHorizonDays,
    precipitationArray,
    soilMoistureArray,
    forecastArray,
    fetchedAt: new Date()
  });

  return { precipitationArray, soilMoistureArray, forecastArray, source: 'api' };
}

/**
 * 2E — Shared fetch utility
 */
async function fetchWithBackoff(url, maxRetries = 5) {
  const delays = [5000, 15000, 30000, 60000, 120000];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.status === 429) {
        const wait = delays[attempt] || 120000;
        console.warn(`[Cache] Rate limited. Waiting ${wait / 1000}s (attempt ${attempt + 1})`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      return await res.json();

    } catch (err) {
      clearTimeout(timeoutId);
      if (attempt === maxRetries - 1) throw err;
      const wait = delays[attempt] || 120000;
      console.warn(`[Cache] Fetch failed: ${err.message}. Retrying in ${wait / 1000}s`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
