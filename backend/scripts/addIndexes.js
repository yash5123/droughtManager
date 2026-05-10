/**
 * Database Index Migration Script
 * 
 * Adds optimized indexes for the /ranked aggregation pipeline
 * and village query patterns used by the daily weather job.
 * 
 * Run: node scripts/addIndexes.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const INDEXES = [
  {
    collection: 'droughtrisks',
    name: 'village_date_desc',
    keys: { village: 1, date: -1 },
    description: 'Supports $sort + $group in /ranked pipeline'
  },
  {
    collection: 'droughtrisks',
    name: 'date_desc',
    keys: { date: -1 },
    description: 'Supports $sort by date in aggregation first stage'
  },
  {
    collection: 'droughtrisks',
    name: 'riskScore_desc',
    keys: { riskScore: -1 },
    description: 'Supports $sort by riskScore in /ranked pipeline'
  },
  {
    collection: 'droughtrisks',
    name: 'riskLevel_asc',
    keys: { riskLevel: 1 },
    description: 'Supports filtering by risk level'
  },
  {
    collection: 'villages',
    name: 'geocoding_lat_lon',
    keys: { geocodingStatus: 1, lat: 1, lon: 1 },
    description: 'Supports daily job query for geocoded villages'
  },
  {
    collection: 'villages',
    name: 'state_asc',
    keys: { state: 1 },
    description: 'Supports state-based filtering and grouping'
  }
];

async function addIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.\n');

    const db = mongoose.connection.db;

    for (const idx of INDEXES) {
      try {
        const collection = db.collection(idx.collection);
        await collection.createIndex(idx.keys, { name: idx.name, background: true });
        console.log(`  PASS  ${idx.collection}.${idx.name} — ${idx.description}`);
      } catch (err) {
        if (err.codeName === 'IndexOptionsConflict' || err.code === 85) {
          console.log(`  SKIP  ${idx.collection}.${idx.name} — already exists with different options`);
        } else if (err.code === 86) {
          console.log(`  SKIP  ${idx.collection}.${idx.name} — index already exists`);
        } else {
          console.error(`  FAIL  ${idx.collection}.${idx.name} — ${err.message}`);
        }
      }
    }

    console.log('\nDone. Disconnecting...');
    await mongoose.disconnect();
    console.log('Disconnected.');
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
}

addIndexes();
