import React from 'react';
import { AlertTriangle, Activity } from 'lucide-react';
import { useSeedingStatus } from '../../hooks/useRiskData.js';

export default function DataSourceBanner({ dataSource }) {
  const { data: seedingStatus } = useSeedingStatus();
  
  if (dataSource === 'backend' || dataSource === 'pending') return null;

  if (dataSource === 'updating') {
    const job = seedingStatus?.dailyJob || {};
    const currentDistrict = job.currentDistrict || 'Initializing...';
    const processed = job.processedCount || 0;
    const total = job.totalToProcess || 732;
    const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

    return (
      <div style={{ padding: '16px 20px', borderRadius: '12px', display: 'flex', gap: '20px', background: 'var(--risk-moderate-tint)', borderLeft: '3px solid var(--accent-amber)', marginBottom: '24px', alignItems: 'center' }}>
        <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '50%' }}>
          <Activity size={24} className="spinning" style={{ color: 'var(--accent-amber)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Daily AI Risk Assessment in Progress</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{pct}% Complete</span>
          </div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent-amber)', transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Currently processing: <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{currentDistrict}</span>
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
              {processed} / {total} Regions Updated
            </span>
          </div>
        </div>
      </div>
    );
  }

  const messages = {
    'stale': 'Risk data may be outdated - the daily update job has not run recently.',
    'seeding': 'Database initialization in progress - district data is being loaded.',
    'error': 'Backend unreachable - unable to fetch risk data.',
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
