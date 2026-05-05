import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, Droplets, Truck, Activity, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { useVillageData } from '../context/VillageDataContext.jsx';
import { useCountUp } from '../hooks/useCountUp.js';
import RiskBadge from '../components/ui/RiskBadge.jsx';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { getRiskLevel, RISK_LEVELS } from '../utils/riskLevels.js';
import { formatNumber } from '../utils/formatters.js';
import api from '../services/api.js';

function KPICard({ icon: Icon, label, value, suffix = '', color, trend }) {
  const animatedValue = useCountUp(value, 1000);
  return (
    <div className="card p-4 card-hover">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: color + '15' }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-mono ${trend > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-display tracking-tight">{formatNumber(animatedValue)}{suffix}</p>
      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{label}</p>
    </div>
  );
}

function RiskLeaderboard({ villages, newlyEnteredIds }) {
  return (
    <div className="card p-4 flex-1">
      <h3 className="text-sm font-semibold text-display mb-3">Risk Leaderboard</h3>
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto hide-scrollbar">
        {villages.map((v, i) => {
          const risk = getRiskLevel(v.riskScore);
          const isNew = newlyEnteredIds.has(v._id);
          return (
            <div key={v._id || i} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${isNew ? 'animate-slide-right' : ''}`}
              style={{ backgroundColor: 'var(--color-bg-surface)', borderLeft: `3px solid ${risk.color}` }}>
              <span className="text-xs font-mono w-6 text-center" style={{ color: 'var(--color-text-muted)' }}>#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{v.name}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">{v.district || v.region}, {v.state}</p>
              </div>
              <div className="text-right flex items-center gap-2">
                <span className="text-sm font-bold font-mono" style={{ color: risk.color }}>{v.riskScore}</span>
                <RiskBadge score={v.riskScore} />
              </div>
              {isNew && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(6,182,212,0.15)', color: 'var(--color-cyan)' }}>NEW</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Overview() {
  const { activeVillages, riskData, dataSource, loading, newlyEnteredIds } = useVillageData();
  const [summary, setSummary] = useState({ totalVillagesMonitored: 0, criticalRegions: 0, activeTankers: 0 });

  useEffect(() => {
    api.get('/dashboard/summary').then(r => setSummary(r.data)).catch(() => {});
  }, []);

  const extremeCount = riskData.filter(v => v.riskScore > 70).length;
  const severeCount = riskData.filter(v => v.riskScore > 50 && v.riskScore <= 70).length;
  const avgScore = riskData.length > 0 ? Math.round(riskData.reduce((s, v) => s + v.riskScore, 0) / riskData.length) : 0;

  const chartData = activeVillages.slice(0, 15).map(v => ({
    name: v.name.length > 8 ? v.name.slice(0, 8) + '…' : v.name,
    score: v.riskScore,
    color: getRiskLevel(v.riskScore).color,
  }));

  if (loading && riskData.length === 0) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-cyan)', borderTopColor: 'transparent' }} /></div>;
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <DataSourceBanner dataSource={dataSource} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard icon={Activity} label="Villages Monitored" value={summary.totalVillagesMonitored || riskData.length} color="#06b6d4" />
        <KPICard icon={AlertTriangle} label="Extreme Risk" value={extremeCount} color="#ef4444" trend={extremeCount > 0 ? 12 : undefined} />
        <KPICard icon={Droplets} label="Avg Risk Score" value={avgScore} color="#f97316" />
        <KPICard icon={Truck} label="Active Tankers" value={summary.activeTankers} color="#22c55e" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Chart */}
        <div className="card p-4 lg:col-span-3">
          <h3 className="text-sm font-semibold text-display mb-3">Risk Score Distribution</h3>
          {chartData.length === 0 ? (
            <EmptyState title="No risk data" description="Run a risk calculation to populate scores." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#556380', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#556380', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111a2e', border: '1px solid #1e2d4a', borderRadius: 8, color: '#e8edf5', fontSize: 12 }}
                  cursor={{ fill: 'rgba(6,182,212,0.05)' }}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={32}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Leaderboard */}
        <div className="lg:col-span-2">
          <RiskLeaderboard villages={activeVillages} newlyEnteredIds={newlyEnteredIds} />
        </div>
      </div>

      {/* Ticker */}
      {activeVillages.length > 0 && (
        <div className="overflow-hidden rounded-lg py-2 px-4" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          <div className="flex gap-8 animate-ticker whitespace-nowrap">
            {[...activeVillages, ...activeVillages].map((v, i) => (
              <span key={i} className="text-xs text-[var(--color-text-muted)] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getRiskLevel(v.riskScore).color }} />
                <span className="font-medium text-[var(--color-text-secondary)]">{v.name}</span>
                <span className="font-mono">{v.riskScore}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
