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
    <div
     }
    >
      <AlertTriangle />
      <span>{msg}</span>
    </div>
  );
}
