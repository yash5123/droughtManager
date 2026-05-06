import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, Droplets, Truck, Activity, ArrowUp, ArrowDown, Loader2, Database, MapPin } from 'lucide-react';
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

function RiskLeaderboard({ villages, newlyEnteredIds, villageCount, setVillageCount }) {
  return (
    <div className="card flex flex-col border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] lg:h-[658px] h-[500px]">
      <div className="p-4 border-b border-[var(--color-outline-variant)] flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold text-display text-[var(--color-on-surface)]">Critical Regions</h3>
          <p className="text-xs text-[var(--color-on-surface-variant)]">Districts sorted by drought risk severity</p>
        </div>
        <div className="flex items-center gap-1 px-1 py-0.5 rounded-lg bg-[var(--color-surface-container-highest)]">
          {[10, 25, 50].map(c => (
            <button key={c} onClick={() => setVillageCount(c)}
              className="px-2 py-1 rounded text-[10px] font-semibold transition-all"
              style={{ backgroundColor: villageCount===c ? 'var(--color-primary)' : 'transparent', color: villageCount===c ? 'var(--color-on-primary)' : 'var(--color-on-surface-variant)' }}>
              Top {c}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-[var(--color-outline-variant)] scrollbar-track-transparent">
        {villages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--color-on-surface-variant)]">
            <Database className="w-8 h-8 opacity-40" />
            <p className="text-sm font-medium">No risk data yet</p>
            <p className="text-xs opacity-60">Waiting for daily weather job to complete</p>
          </div>
        )}
        {villages.map((v, i) => {
          const risk = getRiskLevel(v.riskScore);
          const isNew = newlyEnteredIds.has(v._id);
          const popFormatted = v.population > 0 ? `Pop: ${(v.population / 1000).toFixed(0)}K` : '';
          return (
            <div key={v._id || i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] ${isNew ? 'animate-slide-right' : ''}`}
              style={{ borderLeft: `4px solid ${risk.color}` }}>
              <span className="text-xs font-mono w-6 text-center text-[var(--color-outline)]">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-[var(--color-on-surface)]">{v.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wide">{v.state}</p>
                  {popFormatted && (
                    <span className="text-[9px] text-[var(--color-outline)] font-mono">{popFormatted}</span>
                  )}
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-0.5">
                <span className="text-sm font-bold font-mono" style={{ color: risk.color }}>{v.riskScore}</span>
                <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: risk.color }}>{v.riskLevel}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Seeding Overlay — shown when the backend is still building the district database.
 */
function SeedingOverlay({ seedingStatus }) {
  const phase = seedingStatus?.phase || 'importing';
  const total = seedingStatus?.totalDistricts || 0;
  const geocoded = seedingStatus?.geocodedCount || 0;
  const baselined = seedingStatus?.baselinedCount || 0;
  const current = seedingStatus?.currentDistrict || '';

  const phases = [
    { key: 'importing', label: 'Importing Districts', icon: Database },
    { key: 'geocoding', label: 'Geocoding Coordinates', icon: MapPin },
    { key: 'baselines', label: 'Climate Baselines', icon: Droplets },
  ];

  const currentPhaseIdx = phases.findIndex(p => p.key === phase);

  return (
    <div className="card p-8 border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]">
      <div className="flex flex-col items-center text-center max-w-md mx-auto">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center border border-orange-500/30">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-[var(--color-on-surface)] mb-2">
          Initializing AqvaSense
        </h2>
        <p className="text-sm text-[var(--color-on-surface-variant)] mb-6">
          Building the district database for the first time. This takes ~40 minutes and only happens once.
        </p>

        {/* Phase steps */}
        <div className="w-full space-y-3 mb-6">
          {phases.map((p, idx) => {
            const isActive = p.key === phase;
            const isDone = idx < currentPhaseIdx;
            const Icon = p.icon;
            
            let detail = '';
            if (p.key === 'importing') detail = `${seedingStatus?.importedCount || 0} districts`;
            if (p.key === 'geocoding') detail = `${geocoded} of ${total}`;
            if (p.key === 'baselines') detail = `${baselined} of ${total}`;

            return (
              <div key={p.key} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-orange-500/10 border border-orange-500/30' : isDone ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-[var(--color-surface-container-high)] border border-transparent'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-orange-500/20' : isDone ? 'bg-emerald-500/20' : 'bg-[var(--color-surface-container-highest)]'}`}>
                  {isActive ? (
                    <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                  ) : isDone ? (
                    <span className="text-emerald-400 text-sm">✓</span>
                  ) : (
                    <Icon className="w-4 h-4 text-[var(--color-outline)]" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-medium ${isActive ? 'text-orange-300' : isDone ? 'text-emerald-400' : 'text-[var(--color-on-surface-variant)]'}`}>{p.label}</p>
                  {(isActive || isDone) && detail && (
                    <p className="text-[10px] font-mono text-[var(--color-outline)]">{detail}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {current && (
          <p className="text-xs font-mono text-[var(--color-outline)] truncate max-w-full">
            Processing: {current}
          </p>
        )}
      </div>
    </div>
  );
}

export default function Overview() {
  const { activeVillages, riskData, dataSource, seedingStatus, loading, newlyEnteredIds, villageCount, setVillageCount, meta } = useVillageData();
  const [activeTankers, setActiveTankers] = useState(0);

  useEffect(() => {
    api.get('/tanker?limit=1000')
      .then(r => {
        const active = (r.data.data || []).filter(t => t.status === 'Pending' || t.status === 'Enroute').length;
        setActiveTankers(active);
      })
      .catch(() => {});
  }, []);

  // Compute KPI stats from backend data
  const extremeCount = riskData.filter(v => v.riskScore >= 76).length;
  const avgScore = riskData.length > 0 ? Math.round(riskData.reduce((s, v) => s + (v.riskScore || 0), 0) / riskData.length) : 0;
  const totalMonitored = meta?.total || riskData.length;

  const chartData = activeVillages.slice(0, 50).map(v => ({
    name: v.name.length > 8 ? v.name.slice(0, 8) + '…' : v.name,
    score: v.riskScore || 0,
    color: getRiskLevel(v.riskScore).color,
  }));

  if (loading && riskData.length === 0) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin border-[var(--color-primary)]" style={{ borderTopColor: 'transparent' }} /></div>;
  }

  // Show seeding overlay when database is being built for the first time
  if (dataSource === 'seeding' && riskData.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto">
        <SeedingOverlay seedingStatus={seedingStatus} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      <DataSourceBanner dataSource={dataSource} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Activity} label="Districts Monitored" value={totalMonitored} color="var(--color-primary)" />
        <KPICard icon={AlertTriangle} label="Extreme Risk" value={extremeCount} color="var(--color-error)" trend={extremeCount > 0 ? 12 : undefined} />
        <KPICard icon={Droplets} label="Avg Risk Score" value={avgScore} color="var(--color-tertiary)" />
        <KPICard icon={Truck} label="Active Tankers" value={activeTankers} color="var(--color-success)" />
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
                  const lat = v.lat || v.location?.lat;
                  const lon = v.lon || v.location?.lng;
                  return lat && lon ? (
                    <CircleMarker key={v._id || i} center={[lat, lon]}
                      radius={Math.max(4, (v.riskScore || 0) / 10)}
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
          <RiskLeaderboard villages={activeVillages} newlyEnteredIds={newlyEnteredIds} villageCount={villageCount} setVillageCount={setVillageCount} />
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
