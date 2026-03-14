import mongoose from 'mongoose';

const groundwaterSchema = new mongoose.Schema({
  village: { type: mongoose.Schema.Types.ObjectId, ref: 'Village', required: true },
  date: { type: Date, required: true },
  levelMeters: { type: Number, required: true }, // depth of water table
}, { timestamps: true });

export default mongoose.model('Groundwater', groundwaterSchema);
