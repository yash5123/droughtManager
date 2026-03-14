import mongoose from 'mongoose';

const droughtRiskSchema = new mongoose.Schema({
  village: { type: mongoose.Schema.Types.ObjectId, ref: 'Village', required: true },
  date: { type: Date, required: true },
  riskScore: { type: Number, required: true }, // e.g., 0-100
  riskLevel: { type: String, enum: ['Normal', 'Moderate Risk', 'Critical'], required: true },
  metricsSnapshot: {
    rainfallAvg: Number,
    groundwaterAvg: Number
  }
}, { timestamps: true });

export default mongoose.model('DroughtRisk', droughtRiskSchema);
