/**
 * Daily Weather Job
 * 
 * Fetches last 30 days of precipitation + soil moisture for every geocoded district
 * from Open-Meteo Archive API, then computes and upserts drought risk scores.
 * 
 * Scheduled via node-cron at 02:00 UTC daily.
 * Can also be triggered manually via POST /api/weather/trigger-daily-job
 * 
 * Scoring Architecture (v3 - 5-Component Non-Linear Composite):
 *   RDI  (Rainfall Deficit Index) - 35%
 *   CDD  (Consecutive Dry Days Index) - 20%
 *   SMA  (Soil Moisture Anomaly Index) - 30%
 *   PPA  (Population Pressure Amplifier) - 10%
 *   TAM  (Trend Acceleration Modifier) - additive ±4 pts
 *   Final = 100 * (1 - exp(-0.045 * adjustedComposite))
 */

import fetch from 'node-fetch';
import Village from '../models/Village.js';
import DroughtRisk from '../models/DroughtRisk.js';
import { preloadArchiveCacheForAllVillages, getArchiveWeather, getForecastWeather } from '../services/weatherCacheService.js';

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

// Caching service handles individual village weather fetching

// ─── Sub-Component 1: Rainfall Deficit Index (RDI) - 35% ──────────

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

// ─── Sub-Component 2: Consecutive Dry Days Index (CDD) - 20% ─────

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
  
  // Streak score - piecewise linear
  let streakScore;
  if (maxStreak <= 4)       streakScore = lerp(maxStreak, 0, 4, 0, 8);
  else if (maxStreak <= 9)  streakScore = lerp(maxStreak, 5, 9, 8, 22);
  else if (maxStreak <= 14) streakScore = lerp(maxStreak, 10, 14, 22, 42);
  else if (maxStreak <= 19) streakScore = lerp(maxStreak, 15, 19, 42, 60);
  else if (maxStreak <= 24) streakScore = lerp(maxStreak, 20, 24, 60, 76);
  else if (maxStreak <= 28) streakScore = lerp(maxStreak, 25, 28, 76, 90);
  else                      streakScore = lerp(Math.min(maxStreak, 30), 29, 30, 90, 96);
  
  // Frequency score - total dry days out of 30
  const frequencyScore = (totalDryDays / 30) * 85;
  
  const score = (streakScore * 0.65) + (frequencyScore * 0.35);
  return { score: clamp(score, 0, 96), maxStreak, totalDryDays, streakScore, frequencyScore };
}

// ─── Sub-Component 3: Soil Moisture Anomaly Index (SMA) - 30% ─────

/**
 * Estimate historical baseline soil moisture from annual rainfall class.
 * Used because the Village schema does not store historical soil moisture.
 */
function estimateHistoricalSoilMoisture(village) {
  // Universal rainfall-class-based estimation - no location-specific overrides.
  // Uses annual rainfall as the sole determinant of expected soil moisture.
  const annualRain = village.historicalAvgAnnualRainfall_mm || 0;
  if (annualRain < 200)  return 0.05;   // Hyper-arid (Thar)
  if (annualRain < 500)  return 0.08;   // Arid
  if (annualRain < 800)  return 0.14;   // Semi-arid
  if (annualRain < 1200) return 0.20;   // Sub-humid
  if (annualRain < 1800) return 0.26;   // Humid
  return 0.32;                           // Very humid (Western Ghats, NE India)
}

function computeSMA(weather, village) {
  const currentSM = weather.avgSoilMoistureFrac;
  const historicalSM = estimateHistoricalSoilMoisture(village);
  
  // If data is missing (maritime nulls), return missing signal
  if (currentSM === null) {
    return { score: 0, soilAnomalyPct: 0, currentSM: null, historicalSM, absoluteMin: 0, missing: true };
  }
  
  // Absolute thresholds - floor values regardless of anomaly
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

// ─── Sub-Component 4: Population Pressure Amplifier (PPA) - 10% ───

function computePPA(weather, village) {
  const effectivePopulation = (!village.population || village.population === 0)
    ? 500000
    : village.population;

  if (!village.population || village.population === 0) {
    console.warn(`[ScoreCalc] Village ${village.name || 'Unknown'} has zero population. Using default 500000 for PPA.`);
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

// ─── Sub-Component 5: Trend Acceleration Modifier (TAM) - ±4 pts ──

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
 * Piecewise linear compression - maps raw composite to final score
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

// Determine which compression band was active
function getCompressionBand(x) {
  if (x <= 20)  return '0–20: Sensitivity Boost (×1.20)';
  if (x <= 45)  return '20–45: Linear Growth (×1.04)';
  if (x <= 70)  return '45–70: Gradual Taper (×0.80)';
  if (x <= 90)  return '70–90: Extreme Saturation (×1.30)';
  return '90–100: Hard Cap (×0.39)';
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
export async function computeRiskScore(village, weather, avgPopulation) {
  // Normalize weather object fields if coming from getArchiveWeather
  const normalizedWeather = {
    ...weather,
    totalPrecipitation_mm: weather.totalPrecipitation_mm || weather.totalPrecipitation30d_mm || 0,
    precipitationArray: weather.precipitationArray || weather.daily?.precipitation_sum || [],
    avgSoilMoistureFrac: weather.avgSoilMoistureFrac || 0
  };

  // 1. Compute all sub-components
  const rdi = computeRDI(normalizedWeather, village);
  const cdd = computeCDD(normalizedWeather.precipitationArray);
  const sma = computeSMA(normalizedWeather, village);
  const ppa = computePPA(normalizedWeather, village);
  
  // 2. Weighted raw composite (4 main components = 95% of weight)
  let rawComposite = 0;
  if (sma.missing) {
    // Redistribute the 30% SMA weight to others (Factor = 0.95 / (0.35 + 0.20 + 0.10) = 1.4615)
    const factor = 0.95 / 0.65;
    rawComposite = (rdi.score * 0.35 * factor) + (cdd.score * 0.20 * factor) + (ppa.score * 0.10 * factor);
  } else {
    rawComposite = (rdi.score * 0.35) + (cdd.score * 0.20) + (sma.score * 0.30) + (ppa.score * 0.10);
  }
  
  // 3. TAM: trend-based additive modifier (async - reads 7-day-old record)
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

  // Weighted contributions (handle SMA missing case)
  const scaleFactor = sma.missing ? (0.95 / 0.65) : 1;
  const rdiWeighted  = rdi.score * 0.35 * scaleFactor;
  const cddWeighted  = cdd.score * 0.20 * scaleFactor;
  const smaWeighted  = sma.missing ? 0 : sma.score * 0.30;
  const ppaWeighted  = ppa.score  * (sma.missing ? 0.10 * scaleFactor : 0.10);
  
  return {
    riskScore: clamp(riskScore, 0, 100),
    riskLevel,
    // Keep field names identical for downstream compatibility
    rainfallDeficit: clamp(Math.round(rdi.score), 0, 100),
    soilMoistureDepletion: clamp(Math.round(sma.score), 0, 100),
    populationDemandGap: clamp(Math.round(ppa.score), 0, 100),
    metricsSnapshot: {
      historicalMonthlyAvg: Math.round((rdi.historicalAvg30 || 0) * 10) / 10,
      actualPrecipitation: Math.round((weather.totalPrecipitation_mm || 0) * 10) / 10,
      soilMoistureFrac: Math.round((weather.avgSoilMoistureFrac || 0) * 1000) / 1000,
      historicalSoilMoisture: Math.round((sma.historicalSM || 0) * 1000) / 1000,
      population: village.population || 0,
      demandLitersPerDay: Math.round((ppa.dailyDemand || 0) / 1000) * 1000, // Round to nearest 1k for readability
      supplyLitersPerDay: Math.round((ppa.dailySupply || 0) / 1000) * 1000,
      maxDryStreak: cdd.maxStreak || 0
    },
    metricsSnapshotAdditions: {
      rdiScore:           Math.round(rdi.score * 100) / 100,
      cddScore:           Math.round(cdd.score * 100) / 100,
      smaScore:           sma.missing ? null : Math.round(sma.score * 100) / 100,
      ppaScore:           Math.round(ppa.score * 100) / 100,
      rdiWeighted:        Math.round(rdiWeighted * 100) / 100,
      cddWeighted:        Math.round(cddWeighted * 100) / 100,
      smaWeighted:        Math.round(smaWeighted * 100) / 100,
      ppaWeighted:        Math.round(ppaWeighted * 100) / 100,
      smaWasMissing:      sma.missing || false,
      rawComposite:       Math.round(rawComposite * 100) / 100,
      tamAdjustment:      Math.round(tam.adjustment * 100) / 100,
      adjustedComposite:  Math.round(adjustedComposite * 100) / 100,
      compressionBand:    getCompressionBand(adjustedComposite),
      calculatedAt:       new Date()
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
  error: null,
  currentDistrict: null
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
    }); // Not lean(), because we need to save updates

    // --- Self-healing: Retry failed/missing climate baselines ---
    const pendingBaselines = villages.filter(v => 
      v.climateBaselineStatus === 'failed' || 
      v.climateBaselineStatus === 'pending' ||
      !v.historicalAvgMonthlyRainfall_mm || 
      v.historicalAvgMonthlyRainfall_mm.length === 0
    ).slice(0, 5); // Recover 5 per day to respect Open-Meteo rate limits

    if (pendingBaselines.length > 0) {
      console.log(`[DailyJob] Self-healing: Retrying baselines for ${pendingBaselines.length} districts...`);
      for (const v of pendingBaselines) {
        dailyJobStatus.currentDistrict = `Recovering climate baseline for ${v.name}...`;
        try {
          const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${v.lat}&longitude=${v.lon}&start_date=2013-01-01&end_date=2023-12-31&daily=precipitation_sum`;
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          
          if (data.daily?.precipitation_sum) {
            const monthlyRainfall = Array(12).fill(0);
            const monthlyCounts = Array(12).fill(0);
            data.daily.time.forEach((t, i) => {
              const month = new Date(t).getMonth();
              monthlyRainfall[month] += (data.daily.precipitation_sum[i] || 0);
              monthlyCounts[month]++;
            });
            const monthlyAvgs = monthlyRainfall.map((sum, i) => 
              Math.round((sum / (monthlyCounts[i] / 30.44)) * 10) / 10
            );
            
            await Village.updateOne({ _id: v._id }, { 
              $set: { 
                historicalAvgMonthlyRainfall_mm: monthlyAvgs,
                historicalAvgAnnualRainfall_mm: Math.round(monthlyAvgs.reduce((s, a) => s + a, 0)),
                climateBaselineStatus: 'complete'
              } 
            });
            // Update the local object so the risk calculation can use it immediately
            v.historicalAvgMonthlyRainfall_mm = monthlyAvgs;
            v.climateBaselineStatus = 'complete';
            console.log(`[DailyJob] Successfully recovered baseline for ${v.name}`);
          }
        } catch (err) {
          console.error(`[DailyJob] Baseline recovery failed for ${v.name}:`, err.message);
        }
        await new Promise(r => setTimeout(r, 2000)); // Rate limit safety
      }
    }
    
    dailyJobStatus.totalToProcess = villages.length;
    console.log(`[DailyJob] Processing ${villages.length} geocoded districts...`);
    
    // Batch preload into cache first
    await preloadArchiveCacheForAllVillages(villages, (processed, total, msg) => {
      dailyJobStatus.currentDistrict = msg;
    });
    
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
      dailyJobStatus.currentDistrict = village.name;
      try {
        const weather = await getArchiveWeather(village._id, village.lat, village.lon);
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
              metricsSnapshot: {
                ...risk.metricsSnapshot,
                ...risk.metricsSnapshotAdditions
              }
            }
          },
          { upsert: true }
        );
        
        dailyJobStatus.processedCount++;
      } catch (err) {
        dailyJobStatus.failedCount++;
        console.warn(`[DailyJob] Failed for ${village.name}: ${err.message}`);
      }
      
      // Open-Meteo rate limit - 600ms to avoid 429s on shared hosting (Render)
      await sleep(600);
    }
    
    dailyJobStatus.lastSuccess = new Date();
    dailyJobStatus.running = false;
    dailyJobStatus.currentDistrict = null;
    console.log(`[DailyJob] Complete: ${dailyJobStatus.processedCount} processed, ${dailyJobStatus.failedCount} failed`);

    // 7. Add a nightly forecast preload for the top 100 highest-risk districts
    // This runs AFTER marking the job as done so the UI transitions to LIVE immediately
    const topRiskVillages = villages
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 100);

    console.log('[DailyJob] Preloading forecast cache for top 100 risk districts');
    for (const v of topRiskVillages) {
      await getForecastWeather(v._id, v.lat, v.lon);
      await sleep(500);
    }
    console.log('[DailyJob] Forecast preload complete');
    
  } catch (err) {
    dailyJobStatus.error = err.message;
    console.error('[DailyJob] Fatal error:', err);
  } finally {
    dailyJobStatus.running = false;
    dailyJobStatus.currentDistrict = null;
  }
}

// ─── Exported for unit testing ────────────────────────────────────
export { computeRDI, computeCDD, computeSMA, computePPA, applyCompression };
