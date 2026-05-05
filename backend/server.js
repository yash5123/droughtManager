import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authMiddleware from './middleware/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import rainfallRoutes from './routes/rainfall.js';
import groundwaterRoutes from './routes/groundwater.js';
import tankerRoutes from './routes/tanker.js';
import riskRoutes from './routes/risk.js';
import supplyRoutes from './routes/supply.js';
import authRoutes from './routes/auth.js';
import villageRoutes from './routes/villages.js';
import weatherRoutes from './routes/weather.js';

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
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// ── Public routes (no auth required) ──
// Auth endpoints
app.use('/api/auth', authRoutes);
// All data-viewing routes are public per spec: drought data is public interest information
app.use('/api/villages', villageRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/rainfall', rainfallRoutes);
app.use('/api/groundwater', groundwaterRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/supply', supplyRoutes);
app.use('/api/weather', weatherRoutes);

// ── Protected routes (auth required for write operations) ──
app.use('/api/tanker', authMiddleware, tankerRoutes);

app.get('/', (req, res) => {
  res.send('AqvaSense Drought Monitoring Backend is running.');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
