import mongoose from 'mongoose';

const villageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  district: { type: String, default: '' },
  state: { type: String, required: true },
  population: { type: Number, default: 0 },
  lat: { type: Number, default: null },
  lon: { type: Number, default: null },
  historicalAvgMonthlyRainfall_mm: {
    type: [Number],
    default: []  // 12 monthly values (Jan-Dec)
  },
  historicalAvgAnnualRainfall_mm: { type: Number, default: 0 },
  geocodingStatus: {
    type: String,
    enum: ['pending', 'complete', 'approximate', 'centroid', 'failed'],
    default: 'pending'
  },
  climateBaselineStatus: {
    type: String,
    enum: ['pending', 'complete', 'failed'],
    default: 'pending'
  }
}, { timestamps: true });

villageSchema.index({ state: 1 });
villageSchema.index({ geocodingStatus: 1 });
villageSchema.index({ climateBaselineStatus: 1 });
villageSchema.index({ name: 'text', district: 'text' });
// Unique constraint: one doc per district+state combo
villageSchema.index({ name: 1, state: 1 }, { unique: true });
// Compound index for daily job: find geocoded villages with coordinates
villageSchema.index({ geocodingStatus: 1, lat: 1, lon: 1 });

export default mongoose.model('Village', villageSchema);
