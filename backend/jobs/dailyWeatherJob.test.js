/**
 * Unit tests for dailyWeatherJob.js scoring functions
 * 
 * Covers: applyCompression, computeRDI, computeCDD, computeSMA, computePPA
 * Plus integration tests for end-to-end score differentiation.
 */

import { describe, test, expect } from '@jest/globals';
import { computeRDI, computeCDD, computeSMA, computePPA, applyCompression } from './dailyWeatherJob.js';

// ─── Suite 1: applyCompression ────────────────────────────────────

describe('applyCompression', () => {
  test('input 0 returns exactly 0', () => {
    expect(applyCompression(0)).toBe(0);
  });

  test('input 10 returns a value between 10 and 14', () => {
    const result = applyCompression(10);
    expect(result).toBeGreaterThanOrEqual(10);
    expect(result).toBeLessThanOrEqual(14);
  });

  test('input 20 returns exactly 24', () => {
    expect(applyCompression(20)).toBe(24);
  });

  test('input 45 returns exactly 50', () => {
    // 24 + (45 - 20) * 1.04 = 24 + 26 = 50
    expect(applyCompression(45)).toBe(50);
  });

  test('input 70 returns exactly 70', () => {
    // 50 + (70 - 45) * 0.80 = 50 + 20 = 70
    expect(applyCompression(70)).toBe(70);
  });

  test('input 100 returns a value between 94 and 100 and never reaches 100', () => {
    const result = applyCompression(100);
    expect(result).toBeGreaterThanOrEqual(94);
    expect(result).toBeLessThan(100);
  });

  test('negative input returns 0 (Math.max guard clamps negatives)', () => {
    expect(applyCompression(-10)).toBe(0);
    expect(applyCompression(-50)).toBe(0);
  });
});

// ─── Suite 2: computeRDI ──────────────────────────────────────────

describe('computeRDI', () => {
  const makeVillage = (historicalAvg) => ({
    historicalAvgMonthlyRainfall_mm: Array(12).fill(historicalAvg),
  });

  test('zero anomaly (actual equals historical) returns score 0', () => {
    const weather = { totalPrecipitation_mm: 100 };
    const village = makeVillage(100);
    const result = computeRDI(weather, village);
    expect(result.score).toBe(0);
  });

  test('10% deficit returns score between 5 and 15', () => {
    const weather = { totalPrecipitation_mm: 90 };
    const village = makeVillage(100);
    const result = computeRDI(weather, village);
    expect(result.score).toBeGreaterThanOrEqual(5);
    expect(result.score).toBeLessThanOrEqual(15);
  });

  test('60% deficit returns score between 45 and 75', () => {
    const weather = { totalPrecipitation_mm: 40 };
    const village = makeVillage(100);
    const result = computeRDI(weather, village);
    expect(result.score).toBeGreaterThanOrEqual(45);
    expect(result.score).toBeLessThanOrEqual(75);
  });

  test('95% deficit returns score between 85 and 97', () => {
    const weather = { totalPrecipitation_mm: 5 };
    const village = makeVillage(100);
    const result = computeRDI(weather, village);
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.score).toBeLessThanOrEqual(97);
  });

  test('arid district floor: historicalAvg=5mm uses 20mm denominator, score <= 97', () => {
    const weather = { totalPrecipitation_mm: 0 };
    const village = makeVillage(5); // Below 20mm floor
    const result = computeRDI(weather, village);
    // With floor of 20mm: anomaly = (0 - 20)/20 * 100 = -100%, deficit = 100
    // Score capped at 97
    expect(result.score).toBeLessThanOrEqual(97);
    expect(result.score).toBeGreaterThan(0);
  });
});

// ─── Suite 3: computeCDD ──────────────────────────────────────────

describe('computeCDD', () => {
  test('all 30 days with precipitation above 1mm produces score 0', () => {
    const precip = Array(30).fill(5.0); // All wet days
    const result = computeCDD(precip);
    expect(result.score).toBe(0);
  });

  test('5-day dry streak with 6 total dry days produces score between 8 and 20', () => {
    // 24 wet days followed by 5 dry days, plus 1 isolated dry day at start
    const precip = [0.5, ...Array(24).fill(3.0), ...Array(5).fill(0.2)];
    const result = computeCDD(precip);
    expect(result.score).toBeGreaterThanOrEqual(8);
    expect(result.score).toBeLessThanOrEqual(20);
  });

  test('20-day dry streak with 22 total dry days produces score between 60 and 80', () => {
    // 8 wet days, then 2 dry, then 20 dry consecutive
    const precip = [
      ...Array(8).fill(5.0),
      0.2, 0.3,
      ...Array(20).fill(0.1)
    ];
    const result = computeCDD(precip);
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.score).toBeLessThanOrEqual(80);
  });

  test('all 30 days dry produces score between 90 and 96', () => {
    const precip = Array(30).fill(0.0);
    const result = computeCDD(precip);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.score).toBeLessThanOrEqual(96);
  });
});

// ─── Suite 4: computeSMA ──────────────────────────────────────────

describe('computeSMA', () => {
  const makeVillage = (annualRain) => ({
    historicalAvgAnnualRainfall_mm: annualRain,
  });

  test('no anomaly (current equals historical) returns score 0', () => {
    // annualRain 1000 => falls in <1500 bucket => historicalSM = 0.22
    const weather = { avgSoilMoistureFrac: 0.22 };
    const village = makeVillage(1000);
    const result = computeSMA(weather, village);
    expect(result.score).toBe(0);
  });

  test('40% below historical returns score between 35 and 65', () => {
    // annualRain 1000 => historicalSM ~0.15, 40% below => 0.09
    const weather = { avgSoilMoistureFrac: 0.09 };
    const village = makeVillage(1000);
    const result = computeSMA(weather, village);
    expect(result.score).toBeGreaterThanOrEqual(35);
    expect(result.score).toBeLessThanOrEqual(65);
  });

  test('absolute floor: currentSM=0.04 gives minimum score 70', () => {
    const weather = { avgSoilMoistureFrac: 0.04 };
    const village = makeVillage(1000);
    const result = computeSMA(weather, village);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  test('critical floor: currentSM=0.025 gives minimum score 82', () => {
    const weather = { avgSoilMoistureFrac: 0.025 };
    const village = makeVillage(1000);
    const result = computeSMA(weather, village);
    expect(result.score).toBeGreaterThanOrEqual(82);
  });

  test('catastrophic floor: currentSM=0.012 gives minimum score 92', () => {
    const weather = { avgSoilMoistureFrac: 0.012 };
    const village = makeVillage(1000);
    const result = computeSMA(weather, village);
    expect(result.score).toBeGreaterThanOrEqual(92);
  });
});

// ─── Suite 5: computePPA ──────────────────────────────────────────

describe('computePPA', () => {
  test('supply far exceeds demand (supplyRatio > 2.0) returns score 0', () => {
    // High precipitation + low population => high supply ratio
    const weather = { totalPrecipitation_mm: 500 };
    const village = { population: 10000 };
    const result = computePPA(weather, village);
    expect(result.score).toBe(0);
  });

  test('supplyRatio ~0.7 returns score between 30 and 60', () => {
    // Need to engineer a supplyRatio around 0.7
    // dailyDemand = pop * 55
    // dailySupply = (precip * 1000000 * 3000 * 0.08) / 30
    // supplyRatio = dailySupply / dailyDemand
    // For pop=500000: dailyDemand = 27,500,000
    // For supplyRatio=0.7: dailySupply = 19,250,000
    // 19,250,000 = (precip * 1000000 * 3000 * 0.08) / 30
    // precip = 19,250,000 * 30 / (1000000 * 3000 * 0.08) = 2.40625
    const weather = { totalPrecipitation_mm: 2.4 };
    const village = { population: 500000 };
    const result = computePPA(weather, village);
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.score).toBeLessThanOrEqual(60);
  });

  test('zero/null population does not throw, returns numeric 0-100', () => {
    const weather = { totalPrecipitation_mm: 50 };

    // Test with population = 0
    const result1 = computePPA(weather, { population: 0 });
    expect(typeof result1.score).toBe('number');
    expect(result1.score).toBeGreaterThanOrEqual(0);
    expect(result1.score).toBeLessThanOrEqual(100);
    expect(Number.isNaN(result1.score)).toBe(false);
    expect(Number.isFinite(result1.score)).toBe(true);

    // Test with population = null
    const result2 = computePPA(weather, { population: null });
    expect(typeof result2.score).toBe('number');
    expect(result2.score).toBeGreaterThanOrEqual(0);
    expect(result2.score).toBeLessThanOrEqual(100);
    expect(Number.isNaN(result2.score)).toBe(false);
    expect(Number.isFinite(result2.score)).toBe(true);
  });
});

// ─── Suite 6: Integration - End-to-End Score Differentiation ──────

describe('Integration: End-to-End Score Differentiation', () => {
  test('raw composite 15 vs 65: gap is at least 35 points', () => {
    const low = applyCompression(15);
    const high = applyCompression(65);
    expect(high - low).toBeGreaterThanOrEqual(35);
  });

  test('raw composite 33 vs 79: gap is at least 25 points', () => {
    const low = applyCompression(33);
    const high = applyCompression(79);
    expect(high - low).toBeGreaterThanOrEqual(25);
  });
});
