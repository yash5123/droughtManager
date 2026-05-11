import mongoose from 'mongoose';

const DailyWeatherCacheSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  cacheDate: {
    type: String,
    required: true
  },
  precipitationArray: [Number],
  soilMoistureArray: [Number],
  totalPrecipitation30d_mm: Number,
  avgSoilMoistureFrac: Number,
  fetchedAt: {
    type: Date,
    default: Date.now
  }
});

DailyWeatherCacheSchema.index(
  { villageId: 1, cacheDate: 1 },
  { unique: true }
);
DailyWeatherCacheSchema.index(
  { fetchedAt: 1 },
  { expireAfterSeconds: 172800 }
);

const ForecastCacheSchema = new mongoose.Schema({
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  cacheDate: {
    type: String,
    required: true
  },
  precipitationForecast: [Number],
  probabilityForecast: [Number],
  forecastDates: [String],
  totalPrecip16d_mm: Number,
  dryDaysCount: Number,
  fetchedAt: {
    type: Date,
    default: Date.now
  }
});

ForecastCacheSchema.index(
  { villageId: 1, cacheDate: 1 },
  { unique: true }
);
ForecastCacheSchema.index(
  { fetchedAt: 1 },
  { expireAfterSeconds: 21600 }
);

const SimulationCacheSchema = new mongoose.Schema({
  cacheKey: {
    type: String,
    required: true,
    unique: true
  },
  latitude: Number,
  longitude: Number,
  timeHorizonDays: Number,
  precipitationArray: [Number],
  soilMoistureArray: [Number],
  forecastArray: [Number],
  fetchedAt: {
    type: Date,
    default: Date.now
  }
});

SimulationCacheSchema.index(
  { fetchedAt: 1 },
  { expireAfterSeconds: 86400 }
);

export const DailyWeatherCache = mongoose.model('DailyWeatherCache', DailyWeatherCacheSchema);
export const ForecastCache = mongoose.model('ForecastCache', ForecastCacheSchema);
export const SimulationCache = mongoose.model('SimulationCache', SimulationCacheSchema);
