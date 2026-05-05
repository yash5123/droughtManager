import mongoose from 'mongoose';

const tankerSchema = new mongoose.Schema({
  village: { type: String, required: true },
  tankerNumber: { type: String, default: '' },
  driverName: { type: String, default: '' },
  driverContact: { type: String, default: '' },
  dispatchDate: { type: Date, required: true },
  estimatedArrival: { type: Date },
  status: { type: String, enum: ['Pending', 'Enroute', 'Delivered', 'Maintenance'], default: 'Pending' },
  capacityLiters: { type: Number, required: true },
}, { timestamps: true });

tankerSchema.index({ status: 1 });
tankerSchema.index({ village: 1 });

export default mongoose.model('Tanker', tankerSchema);
