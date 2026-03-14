import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import dashboardRoutes from './routes/dashboard.js';
import rainfallRoutes from './routes/rainfall.js';
import groundwaterRoutes from './routes/groundwater.js';
import tankerRoutes from './routes/tanker.js';
import riskRoutes from './routes/risk.js';
import supplyRoutes from './routes/supply.js';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Mongoose Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/drought-monitoring';
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/rainfall', rainfallRoutes);
app.use('/api/groundwater', groundwaterRoutes);
app.use('/api/tanker', tankerRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/supply', supplyRoutes);

app.get('/', (req, res) => {
  res.send('Drought Monitoring Backend is running.');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
