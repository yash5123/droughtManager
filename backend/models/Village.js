import mongoose from 'mongoose';

const villageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  region: { type: String, required: true },
  district: { type: String, default: '' },
  state: { type: String, default: '' },
  population: { type: Number, required: true },
  avgAnnualRainfall: { type: Number, default: 0 },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  }
}, { timestamps: true });

villageSchema.index({ state: 1 });
villageSchema.index({ name: 'text', district: 'text' });

export default mongoose.model('Village', villageSchema);
