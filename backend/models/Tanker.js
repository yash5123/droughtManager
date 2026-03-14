import mongoose from 'mongoose';

const tankerSchema = new mongoose.Schema({
  village: { type: mongoose.Schema.Types.ObjectId, ref: 'Village', required: true },
  dispatchDate: { type: Date, required: true },
  status: { type: String, enum: ['Pending', 'Enroute', 'Delivered'], default: 'Pending' },
  capacityLiters: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.model('Tanker', tankerSchema);
