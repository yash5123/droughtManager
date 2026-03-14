import mongoose from 'mongoose';

const villageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  region: { type: String, required: true },
  population: { type: Number, required: true },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  }
}, { timestamps: true });

export default mongoose.model('Village', villageSchema);
