import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DataSourceBanner({ dataSource }) {
  if (dataSource === 'backend' || dataSource === 'backend-proxy' || dataSource === 'pending') return null;

  const messages = {
    'seed-data': 'Displaying seed data — backend village database is empty or unreachable.',
    'unavailable': 'Weather data unavailable — backend proxy is not responding.',
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border"
      style={{
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        borderColor: 'rgba(245, 158, 11, 0.3)',
        color: '#f59e0b'
      }}
    >
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span>{messages[dataSource] || `Data source: ${dataSource}`}</span>
    </div>
  );
}
