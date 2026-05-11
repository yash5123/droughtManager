import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Village from '../models/Village.js';
import DroughtRisk from '../models/DroughtRisk.js';
import { computeRiskScore } from '../jobs/dailyWeatherJob.js';
import { getArchiveWeather } from '../services/weatherCacheService.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/drought-monitoring';

async function run() {
  try {
    console.log('--- Drought Risk Audit & Backfill Tool ---');
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB');

    const villages = await Village.find({
      geocodingStatus: { $in: ['complete', 'approximate', 'centroid'] },
      lat: { $ne: null }, 
      lon: { $ne: null }
    }).lean();

    console.log(`✓ Found ${villages.length} geocoded districts to audit.`);

    const totalPopResult = await Village.aggregate([
      { $group: { _id: null, avg: { $avg: '$population' } } }
    ]);
    const avgPopulation = totalPopResult[0]?.avg || 500000;
    console.log(`✓ National Avg Population: ${Math.round(avgPopulation).toLocaleString()}`);

    let count = 0;
    let errors = 0;

    console.log('\nStarting sequential audit...');

    for (const village of villages) {
      try {
        const weather = await getArchiveWeather(village._id, village.lat, village.lon);
        const result = await computeRiskScore(village, weather, avgPopulation);

        await DroughtRisk.updateOne(
          { village: village._id },
          { 
            $set: { 
              'metricsSnapshot.rdiScore': result.metricsSnapshotAdditions.rdiScore,
              'metricsSnapshot.cddScore': result.metricsSnapshotAdditions.cddScore,
              'metricsSnapshot.smaScore': result.metricsSnapshotAdditions.smaScore,
              'metricsSnapshot.ppaScore': result.metricsSnapshotAdditions.ppaScore,
              'metricsSnapshot.rdiWeighted': result.metricsSnapshotAdditions.rdiWeighted,
              'metricsSnapshot.cddWeighted': result.metricsSnapshotAdditions.cddWeighted,
              'metricsSnapshot.smaWeighted': result.metricsSnapshotAdditions.smaWeighted,
              'metricsSnapshot.ppaWeighted': result.metricsSnapshotAdditions.ppaWeighted,
              'metricsSnapshot.smaWasMissing': result.metricsSnapshotAdditions.smaWasMissing,
              'metricsSnapshot.rawComposite': result.metricsSnapshotAdditions.rawComposite,
              'metricsSnapshot.tamAdjustment': result.metricsSnapshotAdditions.tamAdjustment,
              'metricsSnapshot.adjustedComposite': result.metricsSnapshotAdditions.adjustedComposite,
              'metricsSnapshot.compressionBand': result.metricsSnapshotAdditions.compressionBand,
              'metricsSnapshot.calculatedAt': result.metricsSnapshotAdditions.calculatedAt
            }
          }
        );
        
        count++;
        if (count % 50 === 0 || count === villages.length) {
          process.stdout.write(`\rProgress: ${count}/${villages.length} districts processed...`);
        }
      } catch (villageErr) {
        errors++;
        console.error(`\n[Error] ${village.name}:`, villageErr.message);
      }
    }

    console.log(`\n\n--- Final Summary ---`);
    console.log(`Total Records Updated: ${count}`);
    console.log(`Total Failures: ${errors}`);
    console.log(`Audit complete. Mathematical transparency backfilled for all records.`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n[FATAL] Audit failed:', err);
    process.exit(1);
  }
}

run();
