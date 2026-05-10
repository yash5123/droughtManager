/**
 * Score Audit — Controlled Unit Tests
 * 
 * Copies the pure math functions from dailyWeatherJob.js and mocks
 * the MongoDB TAM lookup so all 9 test cases can run standalone.
 */

// ─── Copied helpers ───────────────────────────────────────────────
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
function lerp(x, x0, x1, y0, y1) { if (x1 === x0) return y0; return y0 + (y1 - y0) * ((x - x0) / (x1 - x0)); }
function quadInterp(x, x0, x1, y0, y1) { if (x1 === x0) return y0; const t = (x - x0) / (x1 - x0); return y0 + (y1 - y0) * (t * t); }

function computeRDI(weather, village) {
  const currentMonth = new Date().getMonth();
  let historicalAvg30 = (village.historicalAvgMonthlyRainfall_mm && village.historicalAvgMonthlyRainfall_mm[currentMonth]) || 0;
  if (historicalAvg30 < 20) historicalAvg30 = 20;
  const actual30 = weather.totalPrecipitation_mm;
  const anomalyPct = ((actual30 - historicalAvg30) / historicalAvg30) * 100;
  if (anomalyPct >= 0) return { score: 0, anomalyPct, historicalAvg30, actual30 };
  const deficit = -anomalyPct;
  let score;
  if (deficit <= 20) score = lerp(deficit, 0, 20, 0, 15);
  else if (deficit <= 50) score = quadInterp(deficit, 20, 50, 15, 45);
  else if (deficit <= 75) score = quadInterp(deficit, 50, 75, 45, 72);
  else if (deficit <= 90) score = lerp(deficit, 75, 90, 72, 88);
  else score = Math.min(97, lerp(deficit, 90, 100, 88, 97));
  return { score: clamp(score, 0, 97), anomalyPct, historicalAvg30, actual30 };
}

function computeCDD(precipArray) {
  const dryThreshold = 1.0;
  let maxStreak = 0, currentStreak = 0, totalDryDays = 0;
  for (const p of precipArray) {
    if (p < dryThreshold) { currentStreak++; totalDryDays++; maxStreak = Math.max(maxStreak, currentStreak); }
    else currentStreak = 0;
  }
  let streakScore;
  if (maxStreak <= 4) streakScore = lerp(maxStreak, 0, 4, 0, 8);
  else if (maxStreak <= 9) streakScore = lerp(maxStreak, 5, 9, 8, 22);
  else if (maxStreak <= 14) streakScore = lerp(maxStreak, 10, 14, 22, 42);
  else if (maxStreak <= 19) streakScore = lerp(maxStreak, 15, 19, 42, 60);
  else if (maxStreak <= 24) streakScore = lerp(maxStreak, 20, 24, 60, 76);
  else if (maxStreak <= 28) streakScore = lerp(maxStreak, 25, 28, 76, 90);
  else streakScore = lerp(Math.min(maxStreak, 30), 29, 30, 90, 96);
  const frequencyScore = (totalDryDays / 30) * 85;
  const score = (streakScore * 0.65) + (frequencyScore * 0.35);
  return { score: clamp(score, 0, 96), maxStreak, totalDryDays, streakScore, frequencyScore };
}

function estimateHistoricalSoilMoisture(village) {
  const annualRain = village.historicalAvgAnnualRainfall_mm || 0;
  if (annualRain < 500) return 0.08;
  if (annualRain < 1000) return 0.15;
  if (annualRain < 1500) return 0.22;
  return 0.30;
}

function computeSMA(weather, village) {
  const currentSM = weather.avgSoilMoistureFrac;
  const historicalSM = estimateHistoricalSoilMoisture(village);
  let absoluteMin = 0;
  if (currentSM < 0.015) absoluteMin = 92;
  else if (currentSM < 0.03) absoluteMin = 82;
  else if (currentSM < 0.05) absoluteMin = 70;
  let anomalyScore = 0, soilAnomalyPct = 0;
  if (historicalSM > 0) {
    soilAnomalyPct = ((currentSM - historicalSM) / historicalSM) * 100;
    if (soilAnomalyPct < 0) {
      const deficit = -soilAnomalyPct;
      if (deficit <= 15) anomalyScore = lerp(deficit, 0, 15, 0, 12);
      else if (deficit <= 35) anomalyScore = quadInterp(deficit, 15, 35, 12, 38);
      else if (deficit <= 60) anomalyScore = lerp(deficit, 35, 60, 38, 65);
      else if (deficit <= 80) anomalyScore = lerp(deficit, 60, 80, 65, 83);
      else anomalyScore = Math.min(96, lerp(deficit, 80, 100, 83, 96));
    }
  }
  const score = Math.max(anomalyScore, absoluteMin);
  return { score: clamp(score, 0, 96), soilAnomalyPct, currentSM, historicalSM, absoluteMin };
}

function computePPAFromRatio(supplyRatio) {
  supplyRatio = clamp(supplyRatio, 0, 2);
  let score;
  if (supplyRatio >= 2.0) score = 0;
  else if (supplyRatio >= 1.5) score = lerp(supplyRatio, 2.0, 1.5, 0, 10);
  else if (supplyRatio >= 1.0) score = lerp(supplyRatio, 1.5, 1.0, 10, 30);
  else if (supplyRatio >= 0.5) score = lerp(supplyRatio, 1.0, 0.5, 30, 60);
  else if (supplyRatio >= 0.2) score = lerp(supplyRatio, 0.5, 0.2, 60, 80);
  else score = lerp(supplyRatio, 0.2, 0, 80, 95);
  return clamp(score, 0, 95);
}

function computeTAM(currentRaw, previousScore) {
  if (previousScore == null) return 0;
  const delta = currentRaw - previousScore;
  if (delta > 15) return 4;
  if (delta > 8) return 2.5;
  if (delta > 3) return 1;
  if (delta >= -3) return 0;
  if (delta >= -10) return -1;
  return -2.5;
}

// ─── Build precipitation array from spec inputs ───────────────────
function buildPrecipArray(totalMm, maxStreak, totalDryDays) {
  // Create a 30-day array that produces the desired streak and dry day count
  const arr = new Array(30).fill(0);
  const wetDays = 30 - totalDryDays;
  const perWetDay = wetDays > 0 ? totalMm / wetDays : 0;
  // Place wet days outside the streak
  let placed = 0;
  for (let i = 0; i < 30 && placed < wetDays; i++) {
    // Keep the streak area dry (place streak at end of array)
    if (i >= (30 - maxStreak)) continue;
    // Also skip some dry days that aren't in the streak
    const extraDry = totalDryDays - maxStreak;
    if (i < extraDry) continue;
    arr[i] = perWetDay;
    placed++;
  }
  return arr;
}

// ─── Test runner ──────────────────────────────────────────────────
function runTest(label, opts, expectedMin, expectedMax) {
  const { rainfallAnomalyPct, maxDryStreak, totalDryDays, soilAnomalyPct,
          currentSoilMoisture, population, supplyRatio, previousWeekScore,
          annualRain } = opts;

  // Derive actual rainfall from anomaly
  const hist = 100; // use 100mm as reference baseline
  const actual = hist * (1 + rainfallAnomalyPct / 100);
  
  const village = {
    historicalAvgMonthlyRainfall_mm: new Array(12).fill(hist),
    historicalAvgAnnualRainfall_mm: annualRain || 1000,
    population: population || 0,
    _id: 'test'
  };

  const precipArr = buildPrecipArray(actual, maxDryStreak, totalDryDays);
  const weather = {
    totalPrecipitation_mm: actual,
    avgSoilMoistureFrac: currentSoilMoisture,
    avgSoilMoisturePct: Math.round(currentSoilMoisture * 100),
    precipitationArray: precipArr
  };

  const rdi = computeRDI(weather, village);
  const cdd = computeCDD(precipArr);
  const sma = computeSMA(weather, village);
  const ppaScore = computePPAFromRatio(supplyRatio);

  const rawComposite = (rdi.score * 0.35) + (cdd.score * 0.20) + (sma.score * 0.30) + (ppaScore * 0.10);
  const tamAdj = computeTAM(rawComposite, previousWeekScore);
  const adjusted = rawComposite + tamAdj;
  const adj = Math.max(0, adjusted);
  let compressed;
  if (adj <= 20) compressed = adj * 1.20;
  else if (adj <= 45) compressed = 24 + (adj - 20) * 1.04;
  else if (adj <= 70) compressed = 50 + (adj - 45) * 0.80;
  else if (adj <= 90) compressed = 70 + (adj - 70) * 1.30;
  else compressed = 96 + (adj - 90) * 0.39;
  const finalScore = Math.round(clamp(compressed, 0, 99.9) * 10) / 10;

  const pass = finalScore >= expectedMin && finalScore <= expectedMax;
  const status = pass ? 'PASS ✓' : 'FAIL ✗';

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`${status}  ${label}`);
  console.log(`${'─'.repeat(70)}`);
  console.log(`  RDI = ${rdi.score.toFixed(2).padStart(6)}  (weighted: ${(rdi.score*0.35).toFixed(2).padStart(6)})  anomaly: ${rdi.anomalyPct.toFixed(1)}%`);
  console.log(`  CDD = ${cdd.score.toFixed(2).padStart(6)}  (weighted: ${(cdd.score*0.20).toFixed(2).padStart(6)})  streak: ${cdd.maxStreak}d, dryDays: ${cdd.totalDryDays}/30`);
  console.log(`  SMA = ${sma.score.toFixed(2).padStart(6)}  (weighted: ${(sma.score*0.30).toFixed(2).padStart(6)})  soilMoisture: ${currentSoilMoisture}, absMin: ${sma.absoluteMin}`);
  console.log(`  PPA = ${ppaScore.toFixed(2).padStart(6)}  (weighted: ${(ppaScore*0.10).toFixed(2).padStart(6)})  supplyRatio: ${supplyRatio}`);
  console.log(`  TAM = ${tamAdj >= 0 ? '+' : ''}${tamAdj.toFixed(1).padStart(5)}  (prevScore: ${previousWeekScore})`);
  console.log(`  Raw Composite  = ${rawComposite.toFixed(2)}`);
  console.log(`  Adjusted       = ${adjusted.toFixed(2)}`);
  console.log(`  Final Score    = ${finalScore}`);
  console.log(`  Expected Range = [${expectedMin}, ${expectedMax}]`);
  if (!pass) console.log(`  *** FAILURE: Score ${finalScore} is outside expected range ***`);

  return { label, finalScore, pass, rdi: rdi.score, cdd: cdd.score, sma: sma.score, ppa: ppaScore, tam: tamAdj, raw: rawComposite };
}

// ─── Run all 9 test cases ─────────────────────────────────────────
console.log('\n' + '▓'.repeat(70));
console.log('  DROUGHT RISK SCORING ALGORITHM — CONTROLLED AUDIT');
console.log('▓'.repeat(70));

const results = [];

results.push(runTest('TC1: Well-Watered District', {
  rainfallAnomalyPct: 20, maxDryStreak: 2, totalDryDays: 4,
  soilAnomalyPct: 15, currentSoilMoisture: 0.28, population: 500000,
  supplyRatio: 1.8, previousWeekScore: 5, annualRain: 1000
}, 0, 12));

results.push(runTest('TC2: Early Warning District', {
  rainfallAnomalyPct: -18, maxDryStreak: 6, totalDryDays: 9,
  soilAnomalyPct: -12, currentSoilMoisture: 0.18, population: 800000,
  supplyRatio: 1.3, previousWeekScore: 18, annualRain: 1000
}, 15, 30));

results.push(runTest('TC3: Moderate Stress District', {
  rainfallAnomalyPct: -38, maxDryStreak: 12, totalDryDays: 16,
  soilAnomalyPct: -28, currentSoilMoisture: 0.13, population: 1500000,
  supplyRatio: 0.9, previousWeekScore: 35, annualRain: 1000
}, 35, 52));

results.push(runTest('TC4: Tipping Point District', {
  rainfallAnomalyPct: -52, maxDryStreak: 17, totalDryDays: 20,
  soilAnomalyPct: -42, currentSoilMoisture: 0.09, population: 2000000,
  supplyRatio: 0.65, previousWeekScore: 48, annualRain: 1200
}, 52, 65));

results.push(runTest('TC5: Severe Drought District', {
  rainfallAnomalyPct: -68, maxDryStreak: 22, totalDryDays: 25,
  soilAnomalyPct: -58, currentSoilMoisture: 0.06, population: 3000000,
  supplyRatio: 0.4, previousWeekScore: 60, annualRain: 1200
}, 63, 76));

results.push(runTest('TC6: Extreme Drought District', {
  rainfallAnomalyPct: -82, maxDryStreak: 27, totalDryDays: 29,
  soilAnomalyPct: -72, currentSoilMoisture: 0.04, population: 5000000,
  supplyRatio: 0.2, previousWeekScore: 72, annualRain: 1500
}, 76, 88));

results.push(runTest('TC7: Near-Total Failure District', {
  rainfallAnomalyPct: -95, maxDryStreak: 30, totalDryDays: 30,
  soilAnomalyPct: -88, currentSoilMoisture: 0.02, population: 7000000,
  supplyRatio: 0.05, previousWeekScore: 85, annualRain: 1500
}, 88, 96));

results.push(runTest('TC8: Complete Drought Catastrophe', {
  rainfallAnomalyPct: -100, maxDryStreak: 30, totalDryDays: 30,
  soilAnomalyPct: -100, currentSoilMoisture: 0.008, population: 10000000,
  supplyRatio: 0, previousWeekScore: 95, annualRain: 2000
}, 94, 99.5));

// TC9: Differentiation Test
const r9a = runTest('TC9a: Differentiation — District A', {
  rainfallAnomalyPct: -60, maxDryStreak: 18, totalDryDays: 21,
  soilAnomalyPct: -45, currentSoilMoisture: 0.07, population: 2000000,
  supplyRatio: 0.45, previousWeekScore: 55, annualRain: 1200
}, 0, 100);

const r9b = runTest('TC9b: Differentiation — District B', {
  rainfallAnomalyPct: -75, maxDryStreak: 25, totalDryDays: 28,
  soilAnomalyPct: -70, currentSoilMoisture: 0.035, population: 4000000,
  supplyRatio: 0.18, previousWeekScore: 70, annualRain: 1500
}, 0, 100);

results.push(r9a);
results.push(r9b);

const diffGap = r9b.finalScore - r9a.finalScore;
const diffPass = diffGap >= 8;

// ─── Summary ──────────────────────────────────────────────────────
console.log('\n' + '▓'.repeat(70));
console.log('  AUDIT SUMMARY');
console.log('▓'.repeat(70));
console.log('\n  Test Case Results:');
for (const r of results) {
  console.log(`    ${r.pass ? '✓' : '✗'}  ${r.label.padEnd(45)} Score: ${r.finalScore}`);
}
console.log(`\n  TC9 Differentiation Gap: ${diffGap.toFixed(1)} points (need ≥8)  ${diffPass ? 'PASS ✓' : 'FAIL ✗'}`);

const passCount = results.filter(r => r.pass).length + (diffPass ? 1 : 0);
const totalTests = results.length + 1;
console.log(`\n  Overall: ${passCount}/${totalTests} checks passed`);
console.log('▓'.repeat(70) + '\n');
