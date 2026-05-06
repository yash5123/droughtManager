/**
 * Daily Weather Job
 * 
 * Fetches last 30 days of precipitation + soil moisture for every geocoded district
 * from Open-Meteo Archive API, then computes and upserts drought risk scores.
 * 
 * Scheduled via node-cron at 02:00 UTC daily.
 * Can also be triggered manually via POST /api/weather/trigger-daily-job
 */

import fetch from 'node-fetch';
import Village from '../models/Village.js';
import DroughtRisk from '../models/DroughtRisk.js';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Fetch 30 days of weather data for a single village from Open-Meteo Archive API.
 */
async function fetchWeatherForVillage(village) {
  const end = new Date();
  end.setDate(end.getDate() - 1); // yesterday (today's data may be incomplete)
  const start = new Date();
  start.setDate(start.getDate() - 30);
  
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${village.lat}&longitude=${village.lon}&start_date=${formatDate(start)}&end_date=${formatDate(end)}&daily=precipitation_sum&hourly=soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm&timezone=Asia/Kolkata`;
  
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  
  const data = await res.json();
  
  if (!data.daily?.precipitation_sum) {
    throw new Error('No precipitation data in response');
  }
  
  const precip = data.daily.precipitation_sum;
  const totalPrecip = precip.reduce((s, v) => s + (v || 0), 0);
  
  // Average soil moisture across all hourly values and depth layers
  const sm0 = data.hourly?.soil_moisture_0_to_1cm || [];
  const sm1 = data.hourly?.soil_moisture_1_to_3cm || [];
  const sm3 = data.hourly?.soil_moisture_3_to_9cm || [];
  
  let avgSoilMoisture = 0;
  if (sm0.length > 0) {
    const allValues = [];
    for (let i = 0; i < sm0.length; i++) {
      const vals = [sm0[i], sm1[i], sm3[i]].filter(v => v != null);
      if (vals.length > 0) {
        allValues.push(vals.reduce((a, b) => a + b, 0) / vals.length);
      }
    }
    avgSoilMoisture = allValues.length > 0
      ? allValues.reduce((a, b) => a + b, 0) / allValues.length
      : 0;
  }
  
  return {
    precipitationArray: precip.map(v => v || 0),
    totalPrecipitation_mm: Math.round(totalPrecip * 10) / 10,
    avgSoilMoistureFrac: avgSoilMoisture, // 0 to ~0.5 volumetric fraction
    avgSoilMoisturePct: Math.round(avgSoilMoisture * 100)
  };
}

/**
 * Compute composite drought risk score from weather data + village baselines.
 * 
 * Formula:
 *   riskScore = (rainfallDeficit * 0.40) + (soilMoistureDepletion * 0.35) + (populationDemandGap * 0.25)
 */
function computeRiskScore(village, weather, avgPopulation) {
  // 1. Rainfall Deficit (40%)
  //    Compare actual 30d precipitation to historical monthly average for current month
  const currentMonth = new Date().getMonth(); // 0-11
  const historicalMonthlyAvg = (village.historicalAvgMonthlyRainfall_mm && village.historicalAvgMonthlyRainfall_mm[currentMonth]) || 0;
  
  let rainfallDeficit = 0;
  if (historicalMonthlyAvg > 0) {
    rainfallDeficit = ((historicalMonthlyAvg - weather.totalPrecipitation_mm) / historicalMonthlyAvg) * 100;
  } else {
    // No historical data — use a moderate default
    rainfallDeficit = weather.totalPrecipitation_mm < 10 ? 70 : 30;
  }
  rainfallDeficit = clamp(rainfallDeficit, 0, 100);
  
  // 2. Soil Moisture Depletion (35%)
  //    Lower soil moisture = higher depletion stress
  const soilMoistureDepletion = clamp((1 - weather.avgSoilMoistureFrac * 3) * 100, 0, 100);
  // Multiplied by 3 because typical volumetric soil moisture is 0.1-0.4
  // At 0.33 => depletion = 0%, at 0 => depletion = 100%
  
  // 3. Population Demand Gap (25%)
  //    Uses REAL Census 2011 population
  const population = village.population || 0;
  const demandLitersPerDay = population * 55; // 55 L/person/day WHO standard
  // Estimate supply from precipitation: 1 sq km catchment per district as rough estimate
  const supplyLitersPerDay = (weather.totalPrecipitation_mm * 1000000) / 30;
  
  let populationDemandGap = 0;
  if (demandLitersPerDay > 0) {
    populationDemandGap = ((demandLitersPerDay - supplyLitersPerDay) / demandLitersPerDay) * 100;
  }
  // Also factor in relative population size
  if (avgPopulation > 0 && population > 0) {
    const popFactor = population / avgPopulation;
    populationDemandGap = populationDemandGap * Math.min(popFactor, 2); // cap at 2x
  }
  populationDemandGap = clamp(populationDemandGap, 0, 100);
  
  // Composite
  const riskScore = Math.round(
    (rainfallDeficit * 0.40) +
    (soilMoistureDepletion * 0.35) +
    (populationDemandGap * 0.25)
  );
  
  // Classification
  let riskLevel = 'Normal';
  if (riskScore >= 76) riskLevel = 'Extreme';
  else if (riskScore >= 56) riskLevel = 'Severe';
  else if (riskScore >= 31) riskLevel = 'Moderate';
  
  return {
    riskScore: clamp(riskScore, 0, 100),
    riskLevel,
    rainfallDeficit: Math.round(rainfallDeficit * 10) / 10,
    soilMoistureDepletion: Math.round(soilMoistureDepletion * 10) / 10,
    populationDemandGap: Math.round(populationDemandGap * 10) / 10,
    metricsSnapshot: {
      historicalMonthlyAvg,
      actualPrecipitation: weather.totalPrecipitation_mm,
      soilMoistureFrac: weather.avgSoilMoistureFrac,
      population,
      demandLitersPerDay,
      supplyLitersPerDay
    }
  };
}

// Job status tracking
export const dailyJobStatus = {
  running: false,
  lastRun: null,
  lastSuccess: null,
  processedCount: 0,
  totalToProcess: 0,
  failedCount: 0,
  error: null
};

/**
 * Run the daily weather job for all geocoded districts.
 */
export async function runDailyWeatherJob() {
  if (dailyJobStatus.running) {
    console.log('[DailyJob] Already running, skipping.');
    return;
  }
  
  dailyJobStatus.running = true;
  dailyJobStatus.lastRun = new Date();
  dailyJobStatus.processedCount = 0;
  dailyJobStatus.failedCount = 0;
  dailyJobStatus.error = null;
  
  try {
    const villages = await Village.find({
      geocodingStatus: 'complete',
      lat: { $ne: null },
      lon: { $ne: null }
    }).lean();
    
    dailyJobStatus.totalToProcess = villages.length;
    console.log(`[DailyJob] Processing ${villages.length} geocoded districts...`);
    
    if (villages.length === 0) {
      console.log('[DailyJob] No geocoded districts found. Skipping.');
      return;
    }
    
    // Compute average population for demand gap normalization
    const totalPop = villages.reduce((s, v) => s + (v.population || 0), 0);
    const avgPop = totalPop / villages.length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const village of villages) {
      try {
        const weather = await fetchWeatherForVillage(village);
        const risk = computeRiskScore(village, weather, avgPop);
        
        await DroughtRisk.updateOne(
          { village: village._id, date: today },
          {
            $set: {
              riskScore: risk.riskScore,
              riskLevel: risk.riskLevel,
              rainfallDeficit: risk.rainfallDeficit,
              soilMoistureDepletion: risk.soilMoistureDepletion,
              populationDemandGap: risk.populationDemandGap,
              totalPrecipitation30d_mm: weather.totalPrecipitation_mm,
              avgSoilMoisturePct: weather.avgSoilMoisturePct,
              precipitationArray: weather.precipitationArray,
              metricsSnapshot: risk.metricsSnapshot
            }
          },
          { upsert: true }
        );
        
        dailyJobStatus.processedCount++;
      } catch (err) {
        dailyJobStatus.failedCount++;
        console.warn(`[DailyJob] Failed for ${village.name}: ${err.message}`);
      }
      
      // Open-Meteo soft rate limit
      await sleep(200);
    }
    
    dailyJobStatus.lastSuccess = new Date();
    console.log(`[DailyJob] Complete: ${dailyJobStatus.processedCount} processed, ${dailyJobStatus.failedCount} failed`);
    
  } catch (err) {
    dailyJobStatus.error = err.message;
    console.error('[DailyJob] Fatal error:', err);
  } finally {
    dailyJobStatus.running = false;
  }
}
