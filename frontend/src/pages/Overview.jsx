import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, Droplets, Truck, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import { useVillageData } from '../context/VillageDataContext.jsx';
import { useCountUp } from '../hooks/useCountUp.js';
import RiskBadge from '../components/ui/RiskBadge.jsx';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { getRiskLevel } from '../utils/riskLevels.js';
import { formatNumber } from '../utils/formatters.js';
import api from '../services/api.js';
import 'leaflet/dist/leaflet.css';

const INDIA_CENTER = [22.5, 78.5];
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

function KPICard({ icon: Icon, label, value, suffix = '', color, trend }) {
  const animatedValue = useCountUp(value, 1000);
  return (
    <div className="card p-5 card-hover relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity" style={{ backgroundColor: color }} />
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-lg border" style={{ backgroundColor: color + '15', borderColor: color + '30' }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-mono font-bold px-2 py-1 rounded-md ${trend > 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            {trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-display tracking-tight text-[var(--color-on-surface)]">{formatNumber(animatedValue)}{suffix}</p>
      <p className="text-sm font-medium text-[var(--color-on-surface-variant)] mt-1">{label}</p>
    </div>
  );
}

function RiskLeaderboard({ villages, newlyEnteredIds }) {
  return (
    <div className="card flex flex-col h-full border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]">
      <div className="p-4 border-b border-[var(--color-outline-variant)]">
        <h3 className="text-base font-semibold text-display text-[var(--color-on-surface)]">Critical Regions</h3>
        <p className="text-xs text-[var(--color-on-surface-variant)]">Villages sorted by risk severity</p>
      </div>
      <div className="flex-1 overflow-y-auto hide-scrollbar p-2 space-y-1.5" style={{ maxHeight: '400px' }}>
        {villages.map((v, i) => {
          const risk = getRiskLevel(v.riskScore);
          const isNew = newlyEnteredIds.has(v._id);
          return (
            <div key={v._id || i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] ${isNew ? 'animate-slide-right' : ''}`}
              style={{ borderLeft: `4px solid ${risk.color}` }}>
              <span className="text-xs font-mono w-6 text-center text-[var(--color-outline)]">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-[var(--color-on-surface)]">{v.name}</p>
                <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wide">{v.district || v.region}, {v.state}</p>
              </div>
              <div className="text-right flex items-center gap-3">
                <span className="text-sm font-bold font-mono" style={{ color: risk.color }}>{v.riskScore}</span>
              </div>
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
  const avgScore = riskData.length > 0 ? Math.round(riskData.reduce((s, v) => s + v.riskScore, 0) / riskData.length) : 0;

  const chartData = activeVillages.slice(0, 50).map(v => ({
    name: v.name.length > 8 ? v.name.slice(0, 8) + '…' : v.name,
    score: v.riskScore,
    color: getRiskLevel(v.riskScore).color,
  }));

  if (loading && riskData.length === 0) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin border-[var(--color-primary)]" style={{ borderTopColor: 'transparent' }} /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      <DataSourceBanner dataSource={dataSource} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Activity} label="Villages Monitored" value={summary.totalVillagesMonitored || riskData.length} color="var(--color-primary)" />
        <KPICard icon={AlertTriangle} label="Extreme Risk" value={extremeCount} color="var(--color-error)" trend={extremeCount > 0 ? 12 : undefined} />
        <KPICard icon={Droplets} label="Avg Risk Score" value={avgScore} color="var(--color-tertiary)" />
        <KPICard icon={Truck} label="Active Tankers" value={summary.activeTankers} color="var(--color-success)" />
      </div>

      {/* Dual Zone: Map + Chart + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Map & Chart */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Map Zone */}
          <div className="card border-[var(--color-outline-variant)] overflow-hidden bg-[var(--color-surface-container)] flex flex-col" style={{ height: '350px' }}>
            <div className="px-4 py-3 border-b border-[var(--color-outline-variant)] flex justify-between items-center bg-[var(--color-surface-container-high)] z-10 relative">
              <h3 className="text-sm font-semibold text-display text-[var(--color-on-surface)]">Live Geospatial Overview</h3>
              <span className="text-xs font-mono px-2 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded">Active Nodes: {activeVillages.length}</span>
            </div>
            <div className="flex-1 relative bg-[var(--color-background)] z-0">
              <MapContainer center={INDIA_CENTER} zoom={4} zoomControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} className="w-full h-full">
                <TileLayer url={DARK_TILES} />
                {activeVillages.map((v, i) => {
                  const risk = getRiskLevel(v.riskScore);
                  return v.location ? (
                    <CircleMarker key={v._id || i} center={[v.location.lat, v.location.lng]}
                      radius={Math.max(4, v.riskScore / 10)}
                      pathOptions={{ color: risk.color, fillColor: risk.color, fillOpacity: 0.6, weight: 1 }}
                    />
                  ) : null;
                })}
              </MapContainer>
            </div>
          </div>

          {/* Chart Zone */}
          <div className="card p-5 border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]">
            <h3 className="text-sm font-semibold text-display text-[var(--color-on-surface)] mb-4">Risk Distribution (Top {chartData.length})</h3>
            {chartData.length === 0 ? (
              <EmptyState title="No risk data" description="Run a risk calculation to populate scores." />
            ) : (
              <div className="w-full h-[200px] overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-[var(--color-outline-variant)] scrollbar-track-transparent pb-2">
                <div style={{ minWidth: `${Math.max(100, chartData.length * 45)}px`, height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                      <XAxis dataKey="name" tick={{ fill: 'var(--color-outline)', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'var(--color-outline)', fontSize: 10 }} axisLine={{ stroke: 'var(--color-outline-variant)' }} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--color-surface-container-highest)', border: '1px solid var(--color-outline-variant)', borderRadius: 8, color: 'var(--color-on-surface)', fontSize: 12 }}
                        cursor={{ fill: 'var(--color-on-surface)', opacity: 0.05 }}
                      />
                      <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Leaderboard */}
        <div className="lg:col-span-4">
          <RiskLeaderboard villages={activeVillages} newlyEnteredIds={newlyEnteredIds} />
        </div>
      </div>

      {/* Ticker */}
      {activeVillages.length > 0 && (
        <div className="overflow-hidden rounded-xl py-2.5 px-4 border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] shadow-inner">
          <div className="flex gap-12 animate-ticker whitespace-nowrap items-center">
            {[...activeVillages, ...activeVillages, ...activeVillages].map((v, i) => (
              <span key={i} className="text-[11px] font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: getRiskLevel(v.riskScore).color, boxShadow: `0 0 8px ${getRiskLevel(v.riskScore).color}` }} />
                <span className="font-semibold text-[var(--color-on-surface)] uppercase tracking-wider">{v.name}</span>
                <span className="text-[var(--color-outline)]">|</span>
                <span style={{ color: getRiskLevel(v.riskScore).color }}>{v.riskScore}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
