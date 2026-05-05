/**
 * Seeds 50 drought-prone Indian villages across 8 states.
 * Run: node scripts/seedVillages.js
 * Data sourced from public IMD records and Census of India.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Village from '../models/Village.js';

dotenv.config();

const villages = [
  // ── Rajasthan (10) ──
  { name: 'Barmer', district: 'Barmer', state: 'Rajasthan', region: 'Western Rajasthan', population: 26040, location: { lat: 25.7521, lng: 71.3967 }, avgAnnualRainfall: 277 },
  { name: 'Jaisalmer', district: 'Jaisalmer', state: 'Rajasthan', region: 'Western Rajasthan', population: 65471, location: { lat: 26.9157, lng: 70.9083 }, avgAnnualRainfall: 209 },
  { name: 'Jodhpur', district: 'Jodhpur', state: 'Rajasthan', region: 'Western Rajasthan', population: 1033918, location: { lat: 26.2389, lng: 73.0243 }, avgAnnualRainfall: 360 },
  { name: 'Bikaner', district: 'Bikaner', state: 'Rajasthan', region: 'Northern Rajasthan', population: 647804, location: { lat: 28.0229, lng: 73.3119 }, avgAnnualRainfall: 277 },
  { name: 'Churu', district: 'Churu', state: 'Rajasthan', region: 'Northern Rajasthan', population: 303027, location: { lat: 28.3254, lng: 74.9691 }, avgAnnualRainfall: 350 },
  { name: 'Jalore', district: 'Jalore', state: 'Rajasthan', region: 'Western Rajasthan', population: 54081, location: { lat: 25.3457, lng: 72.6158 }, avgAnnualRainfall: 400 },
  { name: 'Nagaur', district: 'Nagaur', state: 'Rajasthan', region: 'Central Rajasthan', population: 100618, location: { lat: 27.2024, lng: 73.7350 }, avgAnnualRainfall: 340 },
  { name: 'Phalodi', district: 'Jodhpur', state: 'Rajasthan', region: 'Western Rajasthan', population: 44834, location: { lat: 27.1310, lng: 72.3622 }, avgAnnualRainfall: 200 },
  { name: 'Pokhran', district: 'Jaisalmer', state: 'Rajasthan', region: 'Western Rajasthan', population: 30305, location: { lat: 26.9200, lng: 71.9170 }, avgAnnualRainfall: 215 },
  { name: 'Sanchore', district: 'Jalore', state: 'Rajasthan', region: 'Western Rajasthan', population: 52637, location: { lat: 24.7560, lng: 71.7750 }, avgAnnualRainfall: 380 },

  // ── Maharashtra (8) ──
  { name: 'Latur', district: 'Latur', state: 'Maharashtra', region: 'Marathwada', population: 382754, location: { lat: 18.4088, lng: 76.5604 }, avgAnnualRainfall: 725 },
  { name: 'Osmanabad', district: 'Dharashiv', state: 'Maharashtra', region: 'Marathwada', population: 110378, location: { lat: 18.1860, lng: 76.0410 }, avgAnnualRainfall: 650 },
  { name: 'Beed', district: 'Beed', state: 'Maharashtra', region: 'Marathwada', population: 139803, location: { lat: 18.9890, lng: 75.7580 }, avgAnnualRainfall: 600 },
  { name: 'Jalna', district: 'Jalna', state: 'Maharashtra', region: 'Marathwada', population: 285349, location: { lat: 19.8347, lng: 75.8816 }, avgAnnualRainfall: 650 },
  { name: 'Ahmednagar', district: 'Ahmednagar', state: 'Maharashtra', region: 'Western Maharashtra', population: 350859, location: { lat: 19.0948, lng: 74.7480 }, avgAnnualRainfall: 540 },
  { name: 'Solapur', district: 'Solapur', state: 'Maharashtra', region: 'Western Maharashtra', population: 951118, location: { lat: 17.6599, lng: 75.9064 }, avgAnnualRainfall: 545 },
  { name: 'Satara', district: 'Satara', state: 'Maharashtra', region: 'Western Maharashtra', population: 120981, location: { lat: 17.6805, lng: 74.0183 }, avgAnnualRainfall: 700 },
  { name: 'Parbhani', district: 'Parbhani', state: 'Maharashtra', region: 'Marathwada', population: 307128, location: { lat: 19.2610, lng: 76.7748 }, avgAnnualRainfall: 780 },

  // ── Gujarat (7) ──
  { name: 'Bhuj', district: 'Kutch', state: 'Gujarat', region: 'Kutch', population: 150531, location: { lat: 23.2420, lng: 69.6669 }, avgAnnualRainfall: 340 },
  { name: 'Rapar', district: 'Kutch', state: 'Gujarat', region: 'Kutch', population: 38892, location: { lat: 23.5735, lng: 70.6425 }, avgAnnualRainfall: 300 },
  { name: 'Surendranagar', district: 'Surendranagar', state: 'Gujarat', region: 'Saurashtra', population: 184880, location: { lat: 22.7280, lng: 71.6480 }, avgAnnualRainfall: 450 },
  { name: 'Morbi', district: 'Morbi', state: 'Gujarat', region: 'Saurashtra', population: 194947, location: { lat: 22.8173, lng: 70.8370 }, avgAnnualRainfall: 470 },
  { name: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', region: 'Central Gujarat', population: 5633927, location: { lat: 23.0225, lng: 72.5714 }, avgAnnualRainfall: 782 },
  { name: 'Banaskantha', district: 'Banaskantha', state: 'Gujarat', region: 'North Gujarat', population: 50472, location: { lat: 24.1745, lng: 72.4348 }, avgAnnualRainfall: 500 },
  { name: 'Patan', district: 'Patan', state: 'Gujarat', region: 'North Gujarat', population: 112038, location: { lat: 23.8493, lng: 72.1266 }, avgAnnualRainfall: 550 },

  // ── Andhra Pradesh (5) ──
  { name: 'Anantapur', district: 'Anantapur', state: 'Andhra Pradesh', region: 'Rayalaseema', population: 340613, location: { lat: 14.6819, lng: 77.6006 }, avgAnnualRainfall: 553 },
  { name: 'Kurnool', district: 'Kurnool', state: 'Andhra Pradesh', region: 'Rayalaseema', population: 484327, location: { lat: 15.8281, lng: 78.0373 }, avgAnnualRainfall: 640 },
  { name: 'Kadapa', district: 'YSR Kadapa', state: 'Andhra Pradesh', region: 'Rayalaseema', population: 344078, location: { lat: 14.4674, lng: 78.8241 }, avgAnnualRainfall: 680 },
  { name: 'Prakasam', district: 'Prakasam', state: 'Andhra Pradesh', region: 'Coastal AP', population: 130520, location: { lat: 15.3500, lng: 79.5600 }, avgAnnualRainfall: 750 },
  { name: 'Chittoor', district: 'Chittoor', state: 'Andhra Pradesh', region: 'Rayalaseema', population: 153000, location: { lat: 13.2172, lng: 79.1003 }, avgAnnualRainfall: 860 },

  // ── Telangana (5) ──
  { name: 'Mahabubnagar', district: 'Mahabubnagar', state: 'Telangana', region: 'Southern Telangana', population: 231036, location: { lat: 16.7488, lng: 77.9853 }, avgAnnualRainfall: 590 },
  { name: 'Nalgonda', district: 'Nalgonda', state: 'Telangana', region: 'Central Telangana', population: 170009, location: { lat: 17.0583, lng: 79.2671 }, avgAnnualRainfall: 680 },
  { name: 'Medak', district: 'Medak', state: 'Telangana', region: 'Northern Telangana', population: 90167, location: { lat: 18.0481, lng: 78.2641 }, avgAnnualRainfall: 780 },
  { name: 'Nizamabad', district: 'Nizamabad', state: 'Telangana', region: 'Northern Telangana', population: 311152, location: { lat: 18.6725, lng: 78.0940 }, avgAnnualRainfall: 950 },
  { name: 'Adilabad', district: 'Adilabad', state: 'Telangana', region: 'Northern Telangana', population: 117167, location: { lat: 19.6641, lng: 78.5320 }, avgAnnualRainfall: 1050 },

  // ── Karnataka (5) ──
  { name: 'Bellary', district: 'Ballari', state: 'Karnataka', region: 'North Karnataka', population: 410440, location: { lat: 15.1394, lng: 76.9214 }, avgAnnualRainfall: 544 },
  { name: 'Raichur', district: 'Raichur', state: 'Karnataka', region: 'North Karnataka', population: 232456, location: { lat: 16.2160, lng: 77.3566 }, avgAnnualRainfall: 620 },
  { name: 'Bijapur', district: 'Vijayapura', state: 'Karnataka', region: 'North Karnataka', population: 326360, location: { lat: 16.8302, lng: 75.7100 }, avgAnnualRainfall: 592 },
  { name: 'Gulbarga', district: 'Kalaburagi', state: 'Karnataka', region: 'North Karnataka', population: 543654, location: { lat: 17.3297, lng: 76.8343 }, avgAnnualRainfall: 750 },
  { name: 'Chitradurga', district: 'Chitradurga', state: 'Karnataka', region: 'Central Karnataka', population: 145853, location: { lat: 14.2305, lng: 76.3987 }, avgAnnualRainfall: 546 },

  // ── Madhya Pradesh (5) ──
  { name: 'Tikamgarh', district: 'Tikamgarh', state: 'Madhya Pradesh', region: 'Bundelkhand', population: 120441, location: { lat: 24.7395, lng: 78.8296 }, avgAnnualRainfall: 900 },
  { name: 'Chhatarpur', district: 'Chhatarpur', state: 'Madhya Pradesh', region: 'Bundelkhand', population: 144842, location: { lat: 24.9162, lng: 79.5931 }, avgAnnualRainfall: 950 },
  { name: 'Damoh', district: 'Damoh', state: 'Madhya Pradesh', region: 'Bundelkhand', population: 112153, location: { lat: 23.8362, lng: 79.4415 }, avgAnnualRainfall: 1100 },
  { name: 'Mandla', district: 'Mandla', state: 'Madhya Pradesh', region: 'Eastern MP', population: 88138, location: { lat: 22.5988, lng: 80.3719 }, avgAnnualRainfall: 1300 },
  { name: 'Shivpuri', district: 'Shivpuri', state: 'Madhya Pradesh', region: 'Gwalior', population: 185325, location: { lat: 25.4238, lng: 77.6631 }, avgAnnualRainfall: 950 },

  // ── Uttar Pradesh (5) ──
  { name: 'Banda', district: 'Banda', state: 'Uttar Pradesh', region: 'Bundelkhand UP', population: 164072, location: { lat: 25.4762, lng: 80.3355 }, avgAnnualRainfall: 850 },
  { name: 'Hamirpur', district: 'Hamirpur', state: 'Uttar Pradesh', region: 'Bundelkhand UP', population: 89100, location: { lat: 25.9569, lng: 80.1514 }, avgAnnualRainfall: 820 },
  { name: 'Mahoba', district: 'Mahoba', state: 'Uttar Pradesh', region: 'Bundelkhand UP', population: 77803, location: { lat: 25.2926, lng: 79.8726 }, avgAnnualRainfall: 830 },
  { name: 'Jhansi', district: 'Jhansi', state: 'Uttar Pradesh', region: 'Bundelkhand UP', population: 507293, location: { lat: 25.4484, lng: 78.5685 }, avgAnnualRainfall: 880 },
  { name: 'Lalitpur', district: 'Lalitpur', state: 'Uttar Pradesh', region: 'Bundelkhand UP', population: 132931, location: { lat: 24.6900, lng: 78.4164 }, avgAnnualRainfall: 870 },
];

async function seed() {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/drought-monitoring';
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding.');

    // Upsert each village by name + state to avoid duplicates
    let created = 0, updated = 0;
    for (const v of villages) {
      const result = await Village.updateOne(
        { name: v.name, state: v.state },
        { $set: v },
        { upsert: true }
      );
      if (result.upsertedCount > 0) created++;
      else if (result.modifiedCount > 0) updated++;
    }

    console.log(`Seeding complete: ${created} created, ${updated} updated, ${villages.length} total.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
