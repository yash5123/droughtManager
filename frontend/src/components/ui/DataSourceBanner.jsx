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
    <div className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border"
      style={{
        backgroundColor: dataSource === 'error' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
        borderColor: dataSource === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)',
        color: dataSource === 'error' ? '#ef4444' : '#f59e0b'
      }}
    >
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span>{msg}</span>
    </div>
  );
}
