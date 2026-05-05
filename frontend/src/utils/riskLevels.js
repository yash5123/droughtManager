/**
 * Risk level definitions — single source of truth for colors, labels, thresholds.
 * Used across every component that displays risk information.
 */

export const RISK_LEVELS = {
  Extreme: { label: 'Extreme', color: '#ef4444', bgClass: 'bg-red-500', textClass: 'text-red-400', borderClass: 'risk-border-extreme', min: 71 },
  Severe:  { label: 'Severe',  color: '#f97316', bgClass: 'bg-orange-500', textClass: 'text-orange-400', borderClass: 'risk-border-severe', min: 51 },
  Moderate:{ label: 'Moderate',color: '#eab308', bgClass: 'bg-yellow-500', textClass: 'text-yellow-400', borderClass: 'risk-border-moderate', min: 26 },
  Normal:  { label: 'Normal',  color: '#22c55e', bgClass: 'bg-emerald-500', textClass: 'text-emerald-400', borderClass: 'risk-border-normal', min: 0 },
};

export function getRiskLevel(score) {
  if (score > 70) return RISK_LEVELS.Extreme;
  if (score > 50) return RISK_LEVELS.Severe;
  if (score > 25) return RISK_LEVELS.Moderate;
  return RISK_LEVELS.Normal;
}

export function getRiskLevelName(score) {
  return getRiskLevel(score).label;
}

export const RISK_CHART_COLORS = {
  Extreme: '#ef4444',
  Severe: '#f97316',
  Moderate: '#eab308',
  Normal: '#22c55e',
};

export const SOIL_MOISTURE_LEVELS = {
  critical: { label: 'Critical', max: 10, color: '#ef4444' },
  low:      { label: 'Low',      max: 20, color: '#f97316' },
  moderate: { label: 'Moderate', max: 35, color: '#eab308' },
  adequate: { label: 'Adequate', max: 100, color: '#22c55e' },
};

export function getSoilMoistureLevel(pct) {
  if (pct < 10) return SOIL_MOISTURE_LEVELS.critical;
  if (pct < 20) return SOIL_MOISTURE_LEVELS.low;
  if (pct < 35) return SOIL_MOISTURE_LEVELS.moderate;
  return SOIL_MOISTURE_LEVELS.adequate;
}
