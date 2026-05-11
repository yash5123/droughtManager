import React from 'react';
import { getRiskLevel } from '../../utils/riskLevels.js';

export default function RiskBadge({ level, score, size = 'sm' }) {
  const riskDef = typeof score === 'number' ? getRiskLevel(score) : getRiskLevel(
    level === 'Extreme' ? 80 : level === 'Severe' ? 60 : level === 'Moderate' ? 40 : 10
  );

  const fontSize = size === 'sm' ? '11px' : '13px';
  const padding = size === 'sm' ? '4px 12px' : '6px 16px';

  let color = 'var(--accent-green)';
  let bgTint = 'var(--risk-normal-tint)';
  if (riskDef.label === 'Extreme') { color = 'var(--accent-red)'; bgTint = 'var(--risk-extreme-tint)'; }
  else if (riskDef.label === 'Severe') { color = 'var(--accent-amber)'; bgTint = 'var(--risk-severe-tint)'; }
  else if (riskDef.label === 'Moderate') { color = '#eab308'; bgTint = 'var(--risk-moderate-tint)'; }

  return (
    <span className="glass-pill" style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontSize,
      fontWeight: 600,
      textTransform: 'uppercase',
      color,
      background: bgTint,
      border: `1px solid ${color}40`,
      padding,
      filter: `drop-shadow(0 0 4px ${color}40)`,
      whiteSpace: 'nowrap'
    }}>
      <span style={{
        width: size === 'sm' ? '6px' : '8px',
        height: size === 'sm' ? '6px' : '8px',
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: `0 0 8px ${color}`
      }} />
      <span style={{ fontWeight: 800 }}>{riskDef.label}</span>
      {typeof score === 'number' && (
        <>
          <div style={{ width: '1px', height: '10px', background: color, opacity: 0.3, margin: '0 2px' }} />
          <span style={{ fontSize: size === 'sm' ? '11px' : '13px', fontWeight: 900, opacity: 0.9 }}>{Math.round(score)}</span>
        </>
      )}
    </span>
  );
}
