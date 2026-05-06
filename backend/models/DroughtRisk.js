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
  soilMoistureDepletion: { type: Number, default: 0 },
  populationDemandGap: { type: Number, default: 0 },
  totalPrecipitation30d_mm: { type: Number, default: 0 },
  avgSoilMoisturePct: { type: Number, default: 0 },
  precipitationArray: { type: [Number], default: [] }, // 30 daily values for charting
  metricsSnapshot: {
    historicalMonthlyAvg: Number,
    actualPrecipitation: Number,
    soilMoistureFrac: Number,
    population: Number,
    demandLitersPerDay: Number,
    supplyLitersPerDay: Number
  }
}, { timestamps: true });

droughtRiskSchema.index({ village: 1, date: -1 });
droughtRiskSchema.index({ riskScore: -1 });
droughtRiskSchema.index({ date: -1 });

export default mongoose.model('DroughtRisk', droughtRiskSchema);
