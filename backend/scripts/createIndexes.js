/**
 * createIndexes.js - Task 20
 * Run with: npm run create-indexes
 *
 * Creates compound and unique indexes on MongoDB collections to optimise
 * the most common query patterns in the drought monitoring platform.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/drought-monitoring';

async function createIndexes() {
  console.log('Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('Connected. Creating indexes…\n');

  const db = mongoose.connection.db;



  // ── DroughtRisk ───────────────────────────────────────────────────────────
  // Speeds up: latest-risk-per-village aggregation in dashboard
  await db.collection('droughtrisks').createIndex(
    { village: 1, date: -1 },
    { name: 'droughtrisk_village_date', background: true }
  );
  console.log('✓ DroughtRisk(village, date) compound index');

  // ── Tanker ────────────────────────────────────────────────────────────────
  // Speeds up: filtering by status (Pending/Enroute/Delivered)
  await db.collection('tankers').createIndex(
    { status: 1 },
    { name: 'tanker_status', background: true }
  );
  console.log('✓ Tanker(status) index');

  // ── User ──────────────────────────────────────────────────────────────────
  // Enforces uniqueness on email and speeds up login lookups
  await db.collection('users').createIndex(
    { email: 1 },
    { name: 'user_email_unique', unique: true, background: true }
  );
  console.log('✓ User(email) unique index');

  // ── Village ───────────────────────────────────────────────────────────────
  // Enforces uniqueness on village name
  await db.collection('villages').createIndex(
    { name: 1 },
    { name: 'village_name_unique', unique: true, background: true }
  );
  console.log('✓ Village(name) unique index');

  // ── Weather Cache ────────────────────────────────────────────────────────
  await db.collection('dailyweathercaches').createIndex(
    { villageId: 1, cacheDate: 1 },
    { name: 'daily_weather_lookup', unique: true, background: true }
  );
  await db.collection('dailyweathercaches').createIndex(
    { fetchedAt: 1 },
    { name: 'daily_weather_ttl', expireAfterSeconds: 172800 } // 48h
  );

  await db.collection('forecastcaches').createIndex(
    { villageId: 1, cacheDate: 1 },
    { name: 'forecast_lookup', unique: true, background: true }
  );
  await db.collection('forecastcaches').createIndex(
    { fetchedAt: 1 },
    { name: 'forecast_ttl', expireAfterSeconds: 21600 } // 6h
  );

  await db.collection('simulationcaches').createIndex(
    { cacheKey: 1 },
    { name: 'simulation_lookup', unique: true, background: true }
  );
  await db.collection('simulationcaches').createIndex(
    { fetchedAt: 1 },
    { name: 'simulation_ttl', expireAfterSeconds: 86400 } // 24h
  );
  console.log('✓ Weather Cache indexes created');

  console.log('\nAll indexes created successfully.');
  await mongoose.disconnect();
  process.exit(0);
}

createIndexes().catch((err) => {
  console.error('Index creation failed:', err);
  process.exit(1);
});
