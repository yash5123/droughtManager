const fs = require('fs');

fetch('https://droughtmanager.onrender.com/api/villages/ranked?limit=1000')
  .then(r => r.json())
  .then(res => {
    let data = res.data;
    let total = data.length;
    let bands = { NoStress:0, Normal:0, LowModerate:0, Moderate:0, HighModerate:0, Severe:0, HighSevere:0, Extreme:0, CriticalExtreme:0, Saturated:0 };
    let minScore = 100, maxScore = 0;
    let minDistrict, maxDistrict;
    let exactly100 = [];
    let moderateDistricts = [];
    let extremeDistricts = [];
    
    data.forEach(d => {
      const s = d.riskScore;
      if (s < minScore) { minScore = s; minDistrict = d; }
      if (s > maxScore) { maxScore = s; maxDistrict = d; }
      
      if (s === 100.0) { bands.Saturated++; exactly100.push(d); }
      else if (s >= 90) bands.CriticalExtreme++;
      else if (s >= 80) { bands.Extreme++; extremeDistricts.push(d); }
      else if (s >= 70) bands.HighSevere++;
      else if (s >= 60) bands.Severe++;
      else if (s >= 50) bands.HighModerate++;
      else if (s >= 35) { bands.Moderate++; moderateDistricts.push(d); }
      else if (s >= 25) { bands.LowModerate++; moderateDistricts.push(d); }
      else if (s >= 10) bands.Normal++;
      else bands.NoStress++;
    });

    console.log('Query 1: Total district documents:', total);
    console.log('Query 2 & 3: Score bands:');
    for (const [band, count] of Object.entries(bands)) {
      let pct = ((count / total) * 100).toFixed(1);
      let flag = pct > 50 ? '⚠️' : '';
      console.log(`  ${band.padEnd(16)} : ${count} (${pct}%) ${flag}`);
    }

    console.log('Query 4: Extremes');
    console.log(`  Lowest: ${minDistrict.name}, ${minDistrict.state} = ${minScore}`);
    console.log(`  Highest: ${maxDistrict.name}, ${maxDistrict.state} = ${maxScore}`);
    let range = maxScore - minScore;
    console.log(`  Range: ${range.toFixed(1)}`);
    if (range < 40) console.log('  CRITICAL FAIL');
    else if (range < 60) console.log('  WARNING');
    else console.log('  PASS');

    console.log('Query 5: Saturated at 100.0');
    if (exactly100.length > 0) {
      console.log('  CRITICAL FAIL: ', exactly100.map(d=>d.name).join(', '));
    } else {
      console.log('  PASS (None found)');
    }

    console.log('Query 6: Comparison');
    if (moderateDistricts.length > 0 && extremeDistricts.length > 0) {
      let mod = moderateDistricts[0];
      let ext = extremeDistricts[0];
      console.log(`  Moderate: ${mod.name} vs Extreme: ${ext.name}`);
      console.log(`    Score: ${mod.riskScore} vs ${ext.riskScore}`);
      console.log(`    Precip(mm): ${mod.totalPrecipitation30d_mm} vs ${ext.totalPrecipitation30d_mm}`);
      console.log(`    SoilMoisture: ${mod.avgSoilMoisturePct} vs ${ext.avgSoilMoisturePct}`);
      console.log(`    Population: ${mod.population} vs ${ext.population}`);
      console.log(`    Level: ${mod.riskLevel} vs ${ext.riskLevel}`);
    }

  }).catch(e => console.error(e));
