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



  const safeCreateIndex = async (collection, keys, options) => {
    try {
      await db.collection(collection).createIndex(keys, options);
      console.log(`✓ ${collection} index created: ${options.name}`);
    } catch (err) {
      if (err.code === 85 || err.message.includes('IndexOptionsConflict')) {
        console.log(`⚠ ${collection} index already exists with different options/name: ${options.name}. Skipping.`);
      } else {
        throw err;
      }
    }
  };

  // ── DroughtRisk ───────────────────────────────────────────────────────────
  // Speeds up: latest-risk-per-village aggregation in dashboard
  await safeCreateIndex('droughtrisks',
    { village: 1, date: -1 },
    { name: 'droughtrisk_village_date', background: true }
  );

  // ── Tanker ────────────────────────────────────────────────────────────────
  // Speeds up: filtering by status (Pending/Enroute/Delivered)
  await safeCreateIndex('tankers',
    { status: 1 },
    { name: 'tanker_status', background: true }
  );

  // ── User ──────────────────────────────────────────────────────────────────
  // Enforces uniqueness on email and speeds up login lookups
  await safeCreateIndex('users',
    { email: 1 },
    { name: 'user_email_unique', unique: true, background: true }
  );

  // ── Village ───────────────────────────────────────────────────────────────
  // Enforces uniqueness on compound village name and state
  try {
    await db.collection('villages').dropIndex('village_name_unique');
    console.log('Dropped old village_name_unique index');
  } catch (err) {
    // Index might not exist, ignore error
  }
  await safeCreateIndex('villages',
    { name: 1, state: 1 },
    { name: 'village_name_state_unique', unique: true, background: true }
  );

  // ── Weather Cache ────────────────────────────────────────────────────────
  await safeCreateIndex('dailyweathercaches',
    { villageId: 1, cacheDate: 1 },
    { name: 'daily_weather_lookup', unique: true, background: true }
  );
  await safeCreateIndex('dailyweathercaches',
    { fetchedAt: 1 },
    { name: 'daily_weather_ttl', expireAfterSeconds: 172800 } // 48h
  );

  await safeCreateIndex('forecastcaches',
    { villageId: 1, cacheDate: 1 },
    { name: 'forecast_lookup', unique: true, background: true }
  );
  await safeCreateIndex('forecastcaches',
    { fetchedAt: 1 },
    { name: 'forecast_ttl', expireAfterSeconds: 21600 } // 6h
  );

  await safeCreateIndex('simulationcaches',
    { cacheKey: 1 },
    { name: 'simulation_lookup', unique: true, background: true }
  );
  await safeCreateIndex('simulationcaches',
    { fetchedAt: 1 },
    { name: 'simulation_ttl', expireAfterSeconds: 86400 } // 24h
  );
  console.log('✓ Weather Cache indexes processed');

  console.log('\nAll indexes created successfully.');
  await mongoose.disconnect();
  process.exit(0);
}

createIndexes().catch((err) => {
  console.error('Index creation failed:', err);
  process.exit(1);
});
