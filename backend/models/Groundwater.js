import mongoose from 'mongoose';

const groundwaterSchema = new mongoose.Schema({
  village: { type: mongoose.Schema.Types.ObjectId, ref: 'Village', required: true },
  date: { type: Date, required: true },
  levelMeters: { type: Number, required: true }, // depth of water table
}, { timestamps: true });

groundwaterSchema.index({ village: 1, date: -1 });

export default mongoose.model('Groundwater', groundwaterSchema);
