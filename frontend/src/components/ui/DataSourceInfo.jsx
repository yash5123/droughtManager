import React from 'react';
import { Database, Clock, Calendar } from 'lucide-react';

/**
 * Shows data source metadata: provider, time period, last refresh.
 * Use on any page that fetches Open-Meteo data.
 */
export default function DataSourceInfo({ period, periodLabel, lastUpdated, className = '' }) {
  const now = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (period || 30));

  const fmt = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtTime = (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-medium text-slate-400 mt-2 ${className}`}>
      <span className="inline-flex items-center gap-1.5">
        <Database size={11} className="text-blue-400" />
        Source: <span className="text-slate-600 font-semibold">Open-Meteo API</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Calendar size={11} className="text-emerald-400" />
        Period: <span className="text-slate-600 font-semibold">{fmt(start)} — {fmt(now)}</span>
        {periodLabel && <span className="text-slate-400">({periodLabel})</span>}
      </span>
      {lastUpdated && (
        <span className="inline-flex items-center gap-1.5">
          <Clock size={11} className="text-amber-400" />
          Refreshed: <span className="text-slate-600 font-semibold">{fmtTime(lastUpdated)}</span>
        </span>
      )}
    </div>
  );
}

/**
 * Forecast variant — shows future date range
 */
export function ForecastInfo({ days = 16, lastUpdated, className = '' }) {
  const now = new Date();
  const end = new Date();
  end.setDate(end.getDate() + days);

  const fmt = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtTime = (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-medium text-slate-400 mt-2 ${className}`}>
      <span className="inline-flex items-center gap-1.5">
        <Database size={11} className="text-blue-400" />
        Source: <span className="text-slate-600 font-semibold">Open-Meteo Forecast API</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Calendar size={11} className="text-purple-400" />
        Forecast: <span className="text-slate-600 font-semibold">{fmt(now)} → {fmt(end)}</span>
        <span className="text-slate-400">({days} days ahead)</span>
      </span>
      {lastUpdated && (
        <span className="inline-flex items-center gap-1.5">
          <Clock size={11} className="text-amber-400" />
          Refreshed: <span className="text-slate-600 font-semibold">{fmtTime(lastUpdated)}</span>
        </span>
      )}
    </div>
  );
}
