import mongoose from 'mongoose';

const droughtRiskSchema = new mongoose.Schema({
  village: { type: mongoose.Schema.Types.ObjectId, ref: 'Village', required: true },
  date: { type: Date, required: true },
  riskScore: { type: Number, required: true }, // 0-100
  riskLevel: {
    type: String,
    enum: ['Normal', 'Moderate', 'Severe', 'Extreme'],
    required: true
  },
  rainfallDeficit: { type: Number, default: 0 },
  gwDepletion: { type: Number, default: 0 },
  metricsSnapshot: {
    rainfallAvg: Number,
    groundwaterAvg: Number
  }
}, { timestamps: true });

droughtRiskSchema.index({ village: 1, date: -1 });
droughtRiskSchema.index({ riskScore: -1 });

export default mongoose.model('DroughtRisk', droughtRiskSchema);
