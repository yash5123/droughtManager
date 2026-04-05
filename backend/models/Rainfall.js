import mongoose from 'mongoose';

const rainfallSchema = new mongoose.Schema({
  village: { type: mongoose.Schema.Types.ObjectId, ref: 'Village', required: true },
  date: { type: Date, required: true },
  amountMm: { type: Number, required: true },
}, { timestamps: true });

rainfallSchema.index({ village: 1, date: -1 });

export default mongoose.model('Rainfall', rainfallSchema);
