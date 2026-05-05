import React from 'react';
import { getRiskLevel } from '../../utils/riskLevels.js';

export default function RiskBadge({ level, score, size = 'sm' }) {
  const riskDef = typeof score === 'number' ? getRiskLevel(score) : getRiskLevel(
    level === 'Extreme' ? 80 : level === 'Severe' ? 60 : level === 'Moderate' ? 40 : 10
  );

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizeClasses}`}
      style={{ backgroundColor: riskDef.color + '20', color: riskDef.color, border: `1px solid ${riskDef.color}40` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: riskDef.color }} />
      {riskDef.label}
    </span>
  );
}
