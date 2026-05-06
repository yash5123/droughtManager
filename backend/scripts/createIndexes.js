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

  console.log('\nAll indexes created successfully.');
  await mongoose.disconnect();
  process.exit(0);
}

createIndexes().catch((err) => {
  console.error('Index creation failed:', err);
  process.exit(1);
});
