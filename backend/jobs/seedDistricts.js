/**
 * One-Time District Seeding Job
 * 
 * Phase 1: Fetch all Indian districts from GitHub + Census 2011 population data
 * Phase 2: Geocode each district via Nominatim (1 req/sec)
 * Phase 3: Fetch 30-year climate baselines from Open-Meteo Climate API
 * 
 * This job is idempotent — it can be re-run safely. Districts already
 * processed (geocoded/baselined) will be skipped.
 */

import fetch from 'node-fetch';
import Village from '../models/Village.js';

const DISTRICTS_URL = 'https://raw.githubusercontent.com/sab99r/Indian-States-And-Districts/master/states-and-districts.json';
const CENSUS_URL = 'https://raw.githubusercontent.com/nishusharma1608/India-Census-2011-Analysis/master/india-districts-census-2011.csv';

// Shared progress object — readable via API
export const seedingProgress = {
  inProgress: false,
  phase: 'idle', // 'importing', 'geocoding', 'baselines', 'complete', 'error'
  totalDistricts: 0,
  importedCount: 0,
  geocodedCount: 0,
  baselinedCount: 0,
  failedGeocode: 0,
  failedBaseline: 0,
  currentDistrict: '',
  startedAt: null,
  completedAt: null,
  error: null
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Normalize district name for fuzzy matching with Census data.
 * Removes parenthetical suffixes, extra whitespace, and lowercases.
 */
function normalizeDistrictName(name) {
  return name
    .replace(/\s*\(.*?\)\s*/g, ' ')  // Remove parentheticals
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Normalize state name for matching (Census uses UPPERCASE, districts JSON uses Title Case)
 */
function normalizeStateName(name) {
  return name
    .replace(/\s*\(.*?\)\s*/g, '')  // Remove (UT), (NCT) etc.
    .trim()
    .toLowerCase();
}

/**
 * Parse Census 2011 CSV and build a lookup map.
 * Returns Map<"normalizedDistrict|normalizedState", population>
 */
async function fetchCensusPopulation() {
  console.log('[Seed] Fetching Census 2011 population data...');
  const res = await fetch(CENSUS_URL);
  if (!res.ok) throw new Error(`Census CSV fetch failed: ${res.status}`);
  
  const text = await res.text();
  const lines = text.split('\n').filter(l => l.trim());
  
  const lookup = new Map();
  
  // Skip header line (first line)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // CSV columns: District code, State name, District name, Population, ...
    // Simple CSV parse — split by comma, handle that district/state names don't contain commas
    const parts = line.split(',');
    if (parts.length < 4) continue;
    
    const stateName = parts[1]?.trim();
    const districtName = parts[2]?.trim();
    const population = parseInt(parts[3]?.trim());
    
    if (!stateName || !districtName || isNaN(population)) continue;
    
    const key = `${normalizeDistrictName(districtName)}|${normalizeStateName(stateName)}`;
    lookup.set(key, population);
  }
  
  console.log(`[Seed] Loaded population data for ${lookup.size} districts from Census 2011`);
  return lookup;
}

/**
 * Try multiple key formats to match Census data.
 */
function lookupPopulation(censusMap, districtName, stateName) {
  const normDist = normalizeDistrictName(districtName);
  const normState = normalizeStateName(stateName);
  
  // Direct match
  const directKey = `${normDist}|${normState}`;
  if (censusMap.has(directKey)) return censusMap.get(directKey);
  
  // Try partial state match (Census may use different state formatting)
  for (const [key, pop] of censusMap) {
    const [cDist, cState] = key.split('|');
    if (cDist === normDist && (cState.includes(normState) || normState.includes(cState))) {
      return pop;
    }
  }
  
  // Try partial district match (first word)
  const firstWord = normDist.split(' ')[0];
  if (firstWord.length >= 4) {
    for (const [key, pop] of censusMap) {
      const [cDist, cState] = key.split('|');
      if (cDist.startsWith(firstWord) && (cState.includes(normState) || normState.includes(cState))) {
        return pop;
      }
    }
  }
  
  return 0; // No match found
}

/**
 * Phase 1: Import all districts from GitHub JSON + Census population
 */
async function importDistricts(censusMap) {
  console.log('[Seed] Phase 1: Importing districts from GitHub...');
  seedingProgress.phase = 'importing';
  
  const res = await fetch(DISTRICTS_URL);
  if (!res.ok) throw new Error(`Districts JSON fetch failed: ${res.status}`);
  
  const data = await res.json();
  
  let imported = 0;
  const allDistricts = [];
  
  for (const stateObj of data.states) {
    const stateName = stateObj.state;
    for (const districtName of stateObj.districts) {
      const cleanName = districtName.trim();
      if (!cleanName) continue;
      
      const population = lookupPopulation(censusMap, cleanName, stateName);
      
      allDistricts.push({
        name: cleanName,
        district: cleanName,
        state: stateName,
        population
      });
    }
  }
  
  seedingProgress.totalDistricts = allDistricts.length;
  console.log(`[Seed] Found ${allDistricts.length} districts across ${data.states.length} states/UTs`);
  
  // Upsert all districts
  for (const d of allDistricts) {
    try {
      await Village.updateOne(
        { name: d.name, state: d.state },
        {
          $setOnInsert: {
            district: d.district,
            geocodingStatus: 'pending',
            climateBaselineStatus: 'pending'
          },
          $set: {
            population: d.population
          }
        },
        { upsert: true }
      );
      imported++;
      seedingProgress.importedCount = imported;
    } catch (err) {
      // Duplicate key errors are fine (already exists)
      if (err.code !== 11000) {
        console.warn(`[Seed] Failed to upsert ${d.name}, ${d.state}: ${err.message}`);
      }
    }
  }
  
  console.log(`[Seed] Phase 1 complete: ${imported} districts imported/updated`);
  return imported;
}

/**
 * Phase 2: Geocode all pending districts via Nominatim
 */
async function geocodeDistricts() {
  console.log('[Seed] Phase 2: Geocoding districts via Nominatim...');
  seedingProgress.phase = 'geocoding';
  
  const pending = await Village.find({ geocodingStatus: 'pending' }).lean();
  console.log(`[Seed] ${pending.length} districts need geocoding`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const v of pending) {
    seedingProgress.currentDistrict = `${v.name}, ${v.state}`;
    
    try {
      // Clean state name for query (remove UT/NCT tags)
      const cleanState = v.state.replace(/\s*\(.*?\)\s*/g, '').trim();
      const query = encodeURIComponent(`${v.name} district ${cleanState} India`);
      const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;
      
      const res = await fetch(url, {
        headers: { 'User-Agent': 'AqvaSense-DroughtMonitor/1.0' }
      });
      
      if (!res.ok) throw new Error(`Nominatim ${res.status}`);
      
      const results = await res.json();
      
      if (results.length > 0) {
        const lat = parseFloat(results[0].lat);
        const lon = parseFloat(results[0].lon);
        
        await Village.updateOne(
          { _id: v._id },
          {
            $set: {
              lat, lon,
              location: { lat, lng: lon },
              geocodingStatus: 'complete'
            }
          }
        );
        successCount++;
      } else {
        await Village.updateOne({ _id: v._id }, { $set: { geocodingStatus: 'failed' } });
        failCount++;
        console.warn(`[Seed] No geocoding result for: ${v.name}, ${v.state}`);
      }
    } catch (err) {
      await Village.updateOne({ _id: v._id }, { $set: { geocodingStatus: 'failed' } });
      failCount++;
      console.warn(`[Seed] Geocoding error for ${v.name}: ${err.message}`);
    }
    
    seedingProgress.geocodedCount = successCount;
    seedingProgress.failedGeocode = failCount;
    
    // Nominatim rate limit: max 1 request per second
    await sleep(1100);
  }
  
  console.log(`[Seed] Phase 2 complete: ${successCount} geocoded, ${failCount} failed`);
}

/**
 * Phase 3: Fetch 30-year climate baselines for all geocoded districts
 */
async function fetchClimateBaselines() {
  console.log('[Seed] Phase 3: Fetching climate baselines from Open-Meteo...');
  seedingProgress.phase = 'baselines';
  
  const pending = await Village.find({
    geocodingStatus: 'complete',
    climateBaselineStatus: 'pending',
    lat: { $ne: null },
    lon: { $ne: null }
  }).lean();
  
  console.log(`[Seed] ${pending.length} districts need climate baselines`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const v of pending) {
    seedingProgress.currentDistrict = `${v.name}, ${v.state}`;
    
    try {
      const url = `https://climate-api.open-meteo.com/v1/climate?latitude=${v.lat}&longitude=${v.lon}&start_date=1991-01-01&end_date=2020-12-31&models=EC_Earth3P_HR&monthly=precipitation_sum`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Climate API ${res.status}`);
      
      const data = await res.json();
      
      if (data.monthly && data.monthly.precipitation_sum) {
        const monthlyPrecip = data.monthly.precipitation_sum;
        
        // Compute 30-year average for each calendar month
        const monthlyAvg = new Array(12).fill(0);
        const monthlyCount = new Array(12).fill(0);
        
        // The API returns monthly data from 1991-01 to 2020-12 = 360 months
        for (let i = 0; i < monthlyPrecip.length; i++) {
          const monthIndex = i % 12;
          if (monthlyPrecip[i] != null) {
            monthlyAvg[monthIndex] += monthlyPrecip[i];
            monthlyCount[monthIndex]++;
          }
        }
        
        for (let m = 0; m < 12; m++) {
          monthlyAvg[m] = monthlyCount[m] > 0 ? Math.round((monthlyAvg[m] / monthlyCount[m]) * 10) / 10 : 0;
        }
        
        const annualTotal = monthlyAvg.reduce((s, v) => s + v, 0);
        
        await Village.updateOne(
          { _id: v._id },
          {
            $set: {
              historicalAvgMonthlyRainfall_mm: monthlyAvg,
              historicalAvgAnnualRainfall_mm: Math.round(annualTotal * 10) / 10,
              climateBaselineStatus: 'complete'
            }
          }
        );
        successCount++;
      } else {
        throw new Error('No monthly precipitation data in response');
      }
    } catch (err) {
      await Village.updateOne({ _id: v._id }, { $set: { climateBaselineStatus: 'failed' } });
      failCount++;
      console.warn(`[Seed] Baseline error for ${v.name}: ${err.message}`);
    }
    
    seedingProgress.baselinedCount = successCount;
    seedingProgress.failedBaseline = failCount;
    
    // Open-Meteo soft rate limit
    await sleep(500);
  }
  
  console.log(`[Seed] Phase 3 complete: ${successCount} baselined, ${failCount} failed`);
}

/**
 * Main seeding entry point. Runs all three phases sequentially.
 * Safe to call multiple times — already-processed districts are skipped.
 */
export async function runSeedDistricts() {
  if (seedingProgress.inProgress) {
    console.log('[Seed] Seeding already in progress, skipping.');
    return;
  }
  
  seedingProgress.inProgress = true;
  seedingProgress.startedAt = new Date();
  seedingProgress.error = null;
  seedingProgress.completedAt = null;
  
  try {
    // Phase 1: Import districts + population
    const censusMap = await fetchCensusPopulation();
    await importDistricts(censusMap);
    
    // Phase 2: Geocode
    await geocodeDistricts();
    
    // Phase 3: Climate baselines
    await fetchClimateBaselines();
    
    seedingProgress.phase = 'complete';
    seedingProgress.completedAt = new Date();
    seedingProgress.currentDistrict = '';
    
    const totalTime = Math.round((seedingProgress.completedAt - seedingProgress.startedAt) / 1000 / 60);
    console.log(`[Seed] All phases complete in ~${totalTime} minutes.`);
    
  } catch (err) {
    seedingProgress.phase = 'error';
    seedingProgress.error = err.message;
    console.error('[Seed] Fatal seeding error:', err);
  } finally {
    seedingProgress.inProgress = false;
  }
}
