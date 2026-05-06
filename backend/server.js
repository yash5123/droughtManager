import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import authMiddleware from './middleware/auth.js';
import tankerRoutes from './routes/tanker.js';

import authRoutes from './routes/auth.js';
import villageRoutes from './routes/villages.js';
import weatherRoutes from './routes/weather.js';
import Village from './models/Village.js';
import { runSeedDistricts, seedingProgress } from './jobs/seedDistricts.js';
import { runDailyWeatherJob, dailyJobStatus } from './jobs/dailyWeatherJob.js';

dotenv.config();

// Fail-fast if JWT_SECRET is not set
if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is not set. Exiting.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Restricted CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://aqvasense.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Mongoose Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/drought-monitoring';
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    try {
      const count = await Village.countDocuments();
      if (count < 100) {
        console.log(`Database has ${count} villages. Starting district seeding in background...`);
        // Fire and forget — seeding runs in background
        runSeedDistricts().catch(err => console.error('Seeding error:', err));
      } else {
        console.log(`Database has ${count} villages. Seeding not needed.`);
        
        // Check if there are failed baselines that need retrying
        const failedBaselines = await Village.countDocuments({ climateBaselineStatus: 'failed' });
        if (failedBaselines > 50) {
          console.log(`${failedBaselines} districts have failed baselines. Re-running Phase 3 in background...`);
          runSeedDistricts().catch(err => console.error('Baseline retry error:', err));
        } else {
          seedingProgress.phase = 'complete';
        }
        
        // Check if daily job has run today
        const DroughtRisk = (await import('./models/DroughtRisk.js')).default;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayRiskCount = await DroughtRisk.countDocuments({ date: { $gte: today } });
        
        if (todayRiskCount === 0) {
          console.log('No risk data for today. Triggering daily weather job...');
          runDailyWeatherJob().catch(err => console.error('Daily job error:', err));
        } else {
          console.log(`Found ${todayRiskCount} risk records for today. Daily job not needed.`);
        }
      }
    } catch (seedErr) {
      console.error('Error during startup check:', seedErr);
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

// ── Schedule daily weather job at 02:00 UTC ──
cron.schedule('0 2 * * *', () => {
  console.log('[Cron] Running daily weather job at 02:00 UTC');
  runDailyWeatherJob().catch(err => console.error('[Cron] Daily job error:', err));
}, { timezone: 'UTC' });

// ── Public routes (no auth required) ──
// Auth endpoints
app.use('/api/auth', authRoutes);
// All data-viewing routes are public per spec: drought data is public interest information
app.use('/api/villages', villageRoutes);

app.use('/api/weather', weatherRoutes);

// ── Protected routes (auth required for write operations) ──
app.use('/api/tanker', authMiddleware, tankerRoutes);

app.get('/', (req, res) => {
  res.send('AqvaSense Drought Monitoring Backend is running.');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
