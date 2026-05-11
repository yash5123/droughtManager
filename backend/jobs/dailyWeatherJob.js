/**
 * Daily Weather Job
 * 
 * Fetches last 30 days of precipitation + soil moisture for every geocoded district
 * from Open-Meteo Archive API, then computes and upserts drought risk scores.
 * 
 * Scheduled via node-cron at 02:00 UTC daily.
 * Can also be triggered manually via POST /api/weather/trigger-daily-job
 * 
 * Scoring Architecture (v3 — 5-Component Non-Linear Composite):
 *   RDI  (Rainfall Deficit Index)         — 35%
 *   CDD  (Consecutive Dry Days Index)     — 20%
 *   SMA  (Soil Moisture Anomaly Index)    — 30%
 *   PPA  (Population Pressure Amplifier)  — 10%
 *   TAM  (Trend Acceleration Modifier)    — additive ±4 pts
 *   Final = 100 * (1 - exp(-0.045 * adjustedComposite))
 */

import fetch from 'node-fetch';
import Village from '../models/Village.js';
import DroughtRisk from '../models/DroughtRisk.js';

// ─── Utility helpers ──────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/** Linear interpolation between two points. */
function lerp(x, x0, x1, y0, y1) {
  if (x1 === x0) return y0;
  return y0 + (y1 - y0) * ((x - x0) / (x1 - x0));
}

/** Quadratic (accelerating) interpolation between two points. */
function quadInterp(x, x0, x1, y0, y1) {
  if (x1 === x0) return y0;
  const t = (x - x0) / (x1 - x0);
  return y0 + (y1 - y0) * (t * t);
}

// ─── Weather data fetcher ─────────────────────────────────────────

/**
 * Fetch 30 days of weather data for a single village from Open-Meteo Archive API.
 */
async function fetchWeatherForVillage(village) {
  const end = new Date();
  end.setDate(end.getDate() - 1); // yesterday (today's data may be incomplete)
  const start = new Date();
  start.setDate(start.getDate() - 30);
  
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${village.lat}&longitude=${village.lon}&start_date=${formatDate(start)}&end_date=${formatDate(end)}&daily=precipitation_sum,soil_moisture_0_to_7cm_mean&timezone=Asia/Kolkata`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  let res;
  try {
    res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Timeout after 10s for village: ${village.name}, ${village.state}. Skipping.`);
    }
    throw err;
  }
  
  if (res.status === 429) {
    // Rate limited — retry with exponential backoff
    for (let retry = 1; retry <= 3; retry++) {
      const backoff = Math.pow(2, retry) * 1000; // 2s, 4s, 8s
      console.warn(`[Weather] 429 rate-limited for ${village.name}. Retry ${retry}/3 in ${backoff/1000}s...`);
      await sleep(backoff);
      const retryRes = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (retryRes.ok) {
        res = retryRes;
        break;
      }
      if (retryRes.status !== 429) throw new Error(`Open-Meteo ${retryRes.status}`);
      if (retry === 3) throw new Error(`Open-Meteo 429 after 3 retries`);
    }
  } else if (!res.ok) {
    throw new Error(`Open-Meteo ${res.status}`);
  }
  
  const data = await res.json();
  
  if (!data.daily?.precipitation_sum) {
    throw new Error('No precipitation data in response');
  }
  
  const precip = data.daily.precipitation_sum;
  const totalPrecip = precip.reduce((s, v) => s + (v || 0), 0);
  
  // Average soil moisture across all daily values
  const smDaily = data.daily?.soil_moisture_0_to_7cm_mean || [];
  const validSm = smDaily.filter(v => v != null);
  
  let avgSoilMoisture = null;
  if (validSm.length > 0) {
    avgSoilMoisture = validSm.reduce((s, v) => s + v, 0) / validSm.length;
  } else if (village.state?.includes('Lakshadweep') || (village.lat < 14 && village.lon < 75 && village.lon > 70)) {
    // MARITIME ESTIMATE (Option 1): 
    // Small islands (Lakshadweep) often return null soil moisture from satellite data.
    // We synthesize a realistic value based on current Rainfall Deficit.
    const historical30 = (village.historicalAvgMonthlyRainfall_mm && village.historicalAvgMonthlyRainfall_mm[new Date().getMonth()]) || 30;
    const ratio = totalPrecip / Math.max(1, historical30);
    
    // Baseline 18.5% (Typical for maritime coral/sand soil).
    // Heavy rain pushes it towards 24%. Extreme dryness pulls it towards 14%.
    avgSoilMoisture = 0.185 + (Math.min(2, ratio) - 1) * 0.055;
    avgSoilMoisture = Math.max(0.14, Math.min(0.24, avgSoilMoisture));
  }
  
  return {
    precipitationArray: precip.map(v => v || 0),
    totalPrecipitation_mm: Math.round(totalPrecip * 10) / 10,
    avgSoilMoistureFrac: avgSoilMoisture, // 0 to ~0.5 volumetric fraction or null
    avgSoilMoisturePct: avgSoilMoisture !== null ? Math.round(avgSoilMoisture * 1000) / 10 : null
  };
}

// ─── Sub-Component 1: Rainfall Deficit Index (RDI) — 35% ──────────

function computeRDI(weather, village) {
  const currentMonth = new Date().getMonth(); // 0-11
  let historicalAvg30 = (village.historicalAvgMonthlyRainfall_mm && village.historicalAvgMonthlyRainfall_mm[currentMonth]) || 0;
  
  // Arid floor: prevent tiny denominators for desert districts
  if (historicalAvg30 < 20) historicalAvg30 = 20;
  
  const actual30 = weather.totalPrecipitation_mm;
  const anomalyPct = ((actual30 - historicalAvg30) / historicalAvg30) * 100;
  
  // Positive anomaly (above-average rain) → no drought signal
  if (anomalyPct >= 0) return { score: 0, anomalyPct, historicalAvg30, actual30 };
  
  const deficit = -anomalyPct; // positive value representing depth of deficit
  let score;
  
  if (deficit <= 20)      score = lerp(deficit, 0, 20, 0, 15);
  else if (deficit <= 50) score = quadInterp(deficit, 20, 50, 15, 45);
  else if (deficit <= 75) score = quadInterp(deficit, 50, 75, 45, 72);
  else if (deficit <= 90) score = lerp(deficit, 75, 90, 72, 88);
  else                    score = Math.min(97, lerp(deficit, 90, 100, 88, 97));
  
  return { score: clamp(score, 0, 97), anomalyPct, historicalAvg30, actual30 };
}

// ─── Sub-Component 2: Consecutive Dry Days Index (CDD) — 20% ─────

function computeCDD(precipArray) {
  const dryThreshold = 1.0; // mm
  let maxStreak = 0, currentStreak = 0, totalDryDays = 0;
  
  for (const p of precipArray) {
    if (p < dryThreshold) {
      currentStreak++;
      totalDryDays++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  
  // Streak score — piecewise linear
  let streakScore;
  if (maxStreak <= 4)       streakScore = lerp(maxStreak, 0, 4, 0, 8);
  else if (maxStreak <= 9)  streakScore = lerp(maxStreak, 5, 9, 8, 22);
  else if (maxStreak <= 14) streakScore = lerp(maxStreak, 10, 14, 22, 42);
  else if (maxStreak <= 19) streakScore = lerp(maxStreak, 15, 19, 42, 60);
  else if (maxStreak <= 24) streakScore = lerp(maxStreak, 20, 24, 60, 76);
  else if (maxStreak <= 28) streakScore = lerp(maxStreak, 25, 28, 76, 90);
  else                      streakScore = lerp(Math.min(maxStreak, 30), 29, 30, 90, 96);
  
  // Frequency score — total dry days out of 30
  const frequencyScore = (totalDryDays / 30) * 85;
  
  const score = (streakScore * 0.65) + (frequencyScore * 0.35);
  return { score: clamp(score, 0, 96), maxStreak, totalDryDays, streakScore, frequencyScore };
}

// ─── Sub-Component 3: Soil Moisture Anomaly Index (SMA) — 30% ─────

/**
 * Estimate historical baseline soil moisture from annual rainfall class.
 * Used because the Village schema does not store historical soil moisture.
 */
function estimateHistoricalSoilMoisture(village) {
  // SPECIAL CASE: Maritime/Island regions (Lakshadweep)
  // These have coral-sandy soil with high drainage; "normal" is 18-20%, not 30%.
  if (village.state?.includes('Lakshadweep') || (village.lat < 14 && village.lon < 75 && village.lon > 70)) {
    return 0.185;
  }

  const annualRain = village.historicalAvgAnnualRainfall_mm || 0;
  if (annualRain < 500) return 0.08;   // Arid
  if (annualRain < 1000) return 0.15;  // Semi-arid
  if (annualRain < 1500) return 0.22;  // Sub-humid
  return 0.30;                          // Humid
}

function computeSMA(weather, village) {
  const currentSM = weather.avgSoilMoistureFrac;
  const historicalSM = estimateHistoricalSoilMoisture(village);
  
  // If data is missing (maritime nulls), return missing signal
  if (currentSM === null) {
    return { score: 0, soilAnomalyPct: 0, currentSM: null, historicalSM, absoluteMin: 0, missing: true };
  }
  
  // Absolute thresholds — floor values regardless of anomaly
  let absoluteMin = 0;
  if (currentSM < 0.015)     absoluteMin = 92;
  else if (currentSM < 0.03) absoluteMin = 82;
  else if (currentSM < 0.05) absoluteMin = 70;
  
  // Anomaly-based score
  let anomalyScore = 0;
  let soilAnomalyPct = 0;
  
  if (historicalSM > 0) {
    soilAnomalyPct = ((currentSM - historicalSM) / historicalSM) * 100;
    
    if (soilAnomalyPct < 0) {
      const deficit = -soilAnomalyPct;
      if (deficit <= 15)      anomalyScore = lerp(deficit, 0, 15, 0, 12);
      else if (deficit <= 35) anomalyScore = quadInterp(deficit, 15, 35, 12, 38);
      else if (deficit <= 60) anomalyScore = lerp(deficit, 35, 60, 38, 65);
      else if (deficit <= 80) anomalyScore = lerp(deficit, 60, 80, 65, 83);
      else                    anomalyScore = Math.min(96, lerp(deficit, 80, 100, 83, 96));
    }
  }
  
  const score = Math.max(anomalyScore, absoluteMin);
  return { score: clamp(score, 0, 96), soilAnomalyPct, currentSM, historicalSM, absoluteMin };
}

// ─── Sub-Component 4: Population Pressure Amplifier (PPA) — 10% ───

function computePPA(weather, village) {
  const effectivePopulation = (!village.population || village.population === 0)
    ? 500000
    : village.population;

  if (!village.population || village.population === 0) {
    console.warn(`[ScoreCalc] Village ${village.name} has zero population. Using default 500000 for PPA.`);
  }
  
  const dailyDemand = effectivePopulation * 55; // 55 L/person/day (WHO standard)
  
  // Estimate supply: precip (mm) × 1M L/km² × 3000 km² catchment × 0.08 retention ÷ 30 days
  const catchmentArea = 3000; // km² fallback per district
  const retentionCoeff = 0.08;
  const monthlySupply = weather.totalPrecipitation_mm * 1000000 * catchmentArea * retentionCoeff;
  const dailySupply = monthlySupply / 30;
  
  let supplyRatio = dailyDemand > 0 ? dailySupply / dailyDemand : 0;
  supplyRatio = clamp(supplyRatio, 0, 2);
  
  let score;
  if (supplyRatio >= 2.0)      score = 0;
  else if (supplyRatio >= 1.5) score = lerp(supplyRatio, 2.0, 1.5, 0, 10);
  else if (supplyRatio >= 1.0) score = lerp(supplyRatio, 1.5, 1.0, 10, 30);
  else if (supplyRatio >= 0.5) score = lerp(supplyRatio, 1.0, 0.5, 30, 60);
  else if (supplyRatio >= 0.2) score = lerp(supplyRatio, 0.5, 0.2, 60, 80);
  else                         score = lerp(supplyRatio, 0.2, 0, 80, 95);
  
  return { score: clamp(score, 0, 95), supplyRatio, dailyDemand, dailySupply };
}

// ─── Sub-Component 5: Trend Acceleration Modifier (TAM) — ±4 pts ──

async function computeTAM(villageId, currentRawComposite) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  
  const prevRecord = await DroughtRisk.findOne({
    village: villageId,
    date: { $lte: sevenDaysAgo }
  }).sort({ date: -1 }).lean();
  
  if (!prevRecord) return { adjustment: 0, weeklyDelta: 0, previousScore: null };
  
  const weeklyDelta = currentRawComposite - prevRecord.riskScore;
  
  let adjustment = 0;
  if (weeklyDelta > 15)       adjustment = 4;
  else if (weeklyDelta > 8)   adjustment = 2.5;
  else if (weeklyDelta > 3)   adjustment = 1;
  else if (weeklyDelta >= -3)  adjustment = 0;
  else if (weeklyDelta >= -10) adjustment = -1;
  else                         adjustment = -2.5;
  
  return { adjustment, weeklyDelta, previousScore: prevRecord.riskScore };
}

// ─── Piecewise Linear Compression ─────────────────────────────────

/**
 * Piecewise linear compression — maps raw composite to final score
 * with precise control over each severity band.
 * Raw 0→0, 20→24, 45→50, 70→70, 90→94, 100→99
 */
function applyCompression(adjusted) {
  const x = Math.max(0, adjusted);
  if (x <= 20)  return x * 1.20;
  if (x <= 45)  return 24 + (x - 20) * 1.04;
  if (x <= 70)  return 50 + (x - 45) * 0.80;
  if (x <= 90)  return 70 + (x - 70) * 1.30;
  return 96 + (x - 90) * 0.39;
}

// ─── Composite Score Assembly ─────────────────────────────────────

/**
 * Compute composite drought risk score from weather data + village baselines.
 * Now async because TAM requires a MongoDB lookup.
 *
 * Returns the same field shape as before (riskScore, riskLevel, rainfallDeficit,
 * soilMoistureDepletion, populationDemandGap, metricsSnapshot) so no downstream
 * schema or API changes are needed.
 */
async function computeRiskScore(village, weather, avgPopulation) {
  // 1. Compute all sub-components
  const rdi = computeRDI(weather, village);
  const cdd = computeCDD(weather.precipitationArray);
  const sma = computeSMA(weather, village);
  const ppa = computePPA(weather, village);
  
  // 2. Weighted raw composite (4 main components = 95% of weight)
  let rawComposite = 0;
  if (sma.missing) {
    // Redistribute the 30% SMA weight to others (Factor = 0.95 / (0.35 + 0.20 + 0.10) = 1.4615)
    const factor = 0.95 / 0.65;
    rawComposite = (rdi.score * 0.35 * factor) + (cdd.score * 0.20 * factor) + (ppa.score * 0.10 * factor);
  } else {
    rawComposite = (rdi.score * 0.35) + (cdd.score * 0.20) + (sma.score * 0.30) + (ppa.score * 0.10);
  }
  
  // 3. TAM: trend-based additive modifier (async — reads 7-day-old record)
  const tam = await computeTAM(village._id, rawComposite);
  const adjustedComposite = rawComposite + tam.adjustment;
  
  // 4. Apply compression
  const finalScore = applyCompression(adjustedComposite);
  const riskScore = Math.round(clamp(finalScore, 0, 99.9) * 10) / 10; // 1 decimal, never 100
  
  // 5. Classification (new thresholds)
  let riskLevel = 'Normal';
  if (riskScore >= 70)      riskLevel = 'Extreme';
  else if (riskScore >= 50) riskLevel = 'Severe';
  else if (riskScore >= 25) riskLevel = 'Moderate';
  
  // 6. Structured audit log (permanent)
  console.log(
    `[Score] ${village.name}, ${village.state} | ` +
    `RDI=${rdi.score.toFixed(1)}(${(rdi.score * 0.35).toFixed(1)}) ` +
    `CDD=${cdd.score.toFixed(1)}(${(cdd.score * 0.20).toFixed(1)}) ` +
    `SMA=${sma.score.toFixed(1)}(${(sma.score * 0.30).toFixed(1)}) ` +
    `PPA=${ppa.score.toFixed(1)}(${(ppa.score * 0.10).toFixed(1)}) ` +
    `TAM=${tam.adjustment >= 0 ? '+' : ''}${tam.adjustment} ` +
    `| Raw=${rawComposite.toFixed(1)} Adj=${adjustedComposite.toFixed(1)} ` +
    `| Final=${riskScore} | ${riskLevel.toUpperCase()}`
  );
  
  return {
    riskScore: clamp(riskScore, 0, 100),
    riskLevel,
    // Keep field names identical for downstream compatibility
    rainfallDeficit: clamp(Math.round(rdi.score), 0, 100),
    soilMoistureDepletion: clamp(Math.round(sma.score), 0, 100),
    populationDemandGap: clamp(Math.round(ppa.score), 0, 100),
    metricsSnapshot: {
      historicalMonthlyAvg: rdi.historicalAvg30,
      actualPrecipitation: weather.totalPrecipitation_mm,
      soilMoistureFrac: weather.avgSoilMoistureFrac,
      population: village.population || 0,
      demandLitersPerDay: ppa.dailyDemand,
      supplyLitersPerDay: ppa.dailySupply,
      // Extended audit fields (new keys only, no schema break)
      rdiScore: rdi.score,
      cddScore: cdd.score,
      smaScore: sma.score,
      ppaScore: ppa.score,
      tamAdjustment: tam.adjustment,
      maxDryStreak: cdd.maxStreak,
      totalDryDays: cdd.totalDryDays,
      soilAnomalyPct: sma.soilAnomalyPct,
      supplyRatio: ppa.supplyRatio,
      rawComposite,
      adjustedComposite
    }
  };
}

// ─── Job status tracking ──────────────────────────────────────────

export const dailyJobStatus = {
  running: false,
  lastRun: null,
  lastSuccess: null,
  processedCount: 0,
  totalToProcess: 0,
  failedCount: 0,
  error: null
};

// ─── Main daily job ───────────────────────────────────────────────

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
      geocodingStatus: { $in: ['complete', 'approximate', 'centroid'] },
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
        const risk = await computeRiskScore(village, weather, avgPop);
        
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
      
      // Open-Meteo rate limit — 600ms to avoid 429s on shared hosting (Render)
      await sleep(600);
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

// ─── Exported for unit testing ────────────────────────────────────
export { computeRDI, computeCDD, computeSMA, computePPA, applyCompression };
