import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DataSourceBanner({ dataSource }) {
  if (dataSource === 'backend' || dataSource === 'pending') return null;

  const messages = {
    'stale': 'Risk data may be outdated — the daily update job has not run recently.',
    'seeding': 'Database initialization in progress — district data is being loaded.',
    'error': 'Backend unreachable — unable to fetch risk data.',
  };

  const msg = messages[dataSource];
  if (!msg) return null;

  return (
    <div style={{ padding: '16px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--risk-severe-tint)', borderLeft: '3px solid var(--accent-amber)', marginBottom: '24px' }}>
      <AlertTriangle size={24} style={{ color: 'var(--accent-amber)', filter: 'drop-shadow(var(--accent-amber-glow))' }} />
      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{msg}</span>
    </div>
  );
}
