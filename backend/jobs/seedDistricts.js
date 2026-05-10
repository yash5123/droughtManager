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
  
  const pending = await Village.find({
    $or: [
      { geocodingStatus: 'pending' },
      { geocodingStatus: 'failed' },
      { lat: null },
      { lon: null }
    ]
  }).lean();
  console.log(`[Seed] ${pending.length} districts need geocoding`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const v of pending) {
    seedingProgress.currentDistrict = `${v.name}, ${v.state}`;
    
    try {
      // Clean state name for query (remove UT/NCT tags)
      const cleanState = v.state.replace(/\s*\(.*?\)\s*/g, '').trim();
      const queryAttempts = [
        encodeURIComponent(`${v.name}, ${cleanState}, India`),
        encodeURIComponent(`${v.name}, India`),
        encodeURIComponent(`${cleanState}, India`)
      ];

      let attemptSuccess = 0;
      let finalLat = null;
      let finalLon = null;
      let finalStatus = 'failed';

      for (let i = 0; i < queryAttempts.length; i++) {
        const query = queryAttempts[i];
        const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;
        
        let res;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          res = await fetch(url, {
            headers: { 'User-Agent': 'AqvaSense-DroughtMonitor/1.0' },
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (res.status === 429) {
            await sleep(5000);
            const controller2 = new AbortController();
            const timeoutId2 = setTimeout(() => controller2.abort(), 8000);
            res = await fetch(url, {
              headers: { 'User-Agent': 'AqvaSense-DroughtMonitor/1.0' },
              signal: controller2.signal
            });
            clearTimeout(timeoutId2);
          }
          
          if (!res.ok) throw new Error(`Nominatim ${res.status}`);
          
          const results = await res.json();
          if (results.length > 0) {
            finalLat = parseFloat(results[0].lat);
            finalLon = parseFloat(results[0].lon);
            attemptSuccess = i + 1;
            if (attemptSuccess === 1) finalStatus = 'complete';
            else if (attemptSuccess === 2) finalStatus = 'approximate';
            else finalStatus = 'centroid';
            
            await Village.updateOne(
              { _id: v._id },
              {
                $set: {
                  lat: finalLat, lon: finalLon,
                  location: { lat: finalLat, lng: finalLon },
                  geocodingStatus: finalStatus
                }
              }
            );
            break;
          }
        } catch (err) {
          console.warn(`[Seed] Network/Timeout error for ${v.name} (Attempt ${i + 1}): ${err.message}`);
        }
        
        await sleep(1100);
      }

      if (finalStatus !== 'failed') {
        successCount++;
      } else {
        await Village.updateOne({ _id: v._id }, { $set: { geocodingStatus: 'failed', lat: null, lon: null } });
        failCount++;
      }

      console.log(`[Seed] ${v.name}, ${v.state} - ${finalStatus === 'failed' ? 'FAILED' : 'Attempt ' + attemptSuccess} - ${finalStatus}`);
    } catch (err) {
      await Village.updateOne({ _id: v._id }, { $set: { geocodingStatus: 'failed', lat: null, lon: null } });
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
    climateBaselineStatus: { $in: ['pending', 'failed'] },
    lat: { $ne: null },
    lon: { $ne: null }
  }).lean();
  
  console.log(`[Seed] ${pending.length} districts need climate baselines`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const v of pending) {
    seedingProgress.currentDistrict = `${v.name}, ${v.state}`;
    
    try {
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${v.lat}&longitude=${v.lon}&start_date=2013-01-01&end_date=2023-12-31&daily=precipitation_sum`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Archive API ${res.status}`);
      
      const data = await res.json();
      
      if (data.daily && data.daily.precipitation_sum && data.daily.time) {
        const dailyPrecip = data.daily.precipitation_sum;
        const dailyTime = data.daily.time;
        
        // Accumulate sum for each calendar month across all 11 years
        const monthlySumAcrossAllYears = new Array(12).fill(0);
        
        for (let i = 0; i < dailyPrecip.length; i++) {
          if (dailyPrecip[i] == null) continue;
          // Parse "YYYY-MM-DD" and get the month index (0-11)
          const monthIndex = parseInt(dailyTime[i].substring(5, 7)) - 1;
          monthlySumAcrossAllYears[monthIndex] += dailyPrecip[i];
        }
        
        // Compute the 11-year average for each calendar month
        const monthlyAvg = new Array(12).fill(0);
        for (let m = 0; m < 12; m++) {
          monthlyAvg[m] = Math.round((monthlySumAcrossAllYears[m] / 11) * 10) / 10;
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
