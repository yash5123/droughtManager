import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Village from '../models/Village.js';
import DroughtRisk from '../models/DroughtRisk.js';
import { computeRiskScore } from '../jobs/dailyWeatherJob.js';
import { getArchiveWeather } from '../services/weatherCacheService.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/drought-monitoring';

async function testDistricts() {
  await mongoose.connect(MONGO_URI);
  
  const ids = [
    { name: 'Kachchh', id: '6a005b7d7f30c4c264a571df' },
    { name: 'Longleng', id: '6a005b7e7f30c4c264a572e1' }
  ];

  const totalPopResult = await Village.aggregate([
    { $group: { _id: null, avg: { $avg: '$population' } } }
  ]);
  const avgPopulation = totalPopResult[0]?.avg || 500000;

  for (const item of ids) {
    console.log(`\n--- Testing ${item.name} ---`);
    const village = await Village.findById(item.id).lean();
    const weather = await getArchiveWeather(village._id, village.lat, village.lon);
    const result = await computeRiskScore(village, weather, avgPopulation);
    console.log(JSON.stringify(result.metricsSnapshotAdditions, null, 2));
    console.log(`Live Score: ${result.riskScore}`);
  }

  await mongoose.disconnect();
}

testDistricts();
