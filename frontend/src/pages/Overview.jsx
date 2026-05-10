import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, Droplets, Truck, Activity, ArrowUp, ArrowDown, Loader2, Database, MapPin, CheckCircle, Circle } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import { useVillageData } from '../context/VillageDataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCountUp } from '../hooks/useCountUp.js';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { getRiskLevel } from '../utils/riskLevels.js';
import { formatNumber } from '../utils/formatters.js';
import api from '../services/api.js';
import { useTheme } from '../context/ThemeContext.jsx';

const INDIA_CENTER = [22.5, 78.5];
const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

function KPICard({ icon: Icon, label, value, suffix = '', accentColor, tintColor, trend }) {
  const animatedValue = useCountUp(value, 1000);
  return (
    <div className="glass-card kpi-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden', backgroundColor: tintColor || 'var(--glass-bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <Icon size={20} style={{ color: accentColor, filter: `drop-shadow(0 0 20px ${accentColor}80)` }} />
        {trend && (
          <span className="glass-pill" style={{ display: 'flex', alignItems: 'center', padding: '2px 8px', fontSize: '11px', color: accentColor, border: `1px solid ${accentColor}40` }}>
            {trend > 0 ? <ArrowUp size={12} style={{ marginRight: '4px' }} /> : <ArrowDown size={12} style={{ marginRight: '4px' }} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <div className="card-label" style={{ color: 'var(--text-secondary)' }}>{label}</div>
        <div className="data-value" style={{ color: 'var(--text-primary)', marginTop: '4px' }}>{formatNumber(animatedValue)}{suffix}</div>
      </div>
      <Icon size={80} style={{ position: 'absolute', bottom: '-10px', right: '-10px', color: accentColor, opacity: 0.06 }} />
    </div>
  );
}

function MapUpdater({ theme }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [theme, map]);
  return null;
}

export default function Overview() {
  const { activeVillages, riskData, dataSource, seedingStatus, loading, setVillageCount, meta, villageCount } = useVillageData();
  const { user } = useAuth();
  const [activeTankers, setActiveTankers] = useState(0);
  const [riskFilter, setRiskFilter] = useState('All');
  const { theme } = useTheme();

  const displayVillages = React.useMemo(() => {
    let filtered = riskData;
    if (riskFilter !== 'All') {
      filtered = riskData.filter(v => {
        if (riskFilter === 'Extreme') return v.riskScore >= 76;
        if (riskFilter === 'Severe') return v.riskScore >= 51 && v.riskScore < 76;
        if (riskFilter === 'Moderate') return v.riskScore >= 26 && v.riskScore < 51;
        if (riskFilter === 'Low') return v.riskScore < 26;
        return true;
      });
    }
    return filtered.slice(0, villageCount);
  }, [riskData, riskFilter, villageCount]);

  useEffect(() => {
    if (!user) return;
    api.get('/tanker?limit=1000')
      .then(r => {
        const active = (r.data.data || []).filter(t => t.status === 'Pending' || t.status === 'Enroute').length;
        setActiveTankers(active);
      })
      .catch(() => {});
  }, [user]);

  const extremeCount = riskData.filter(v => v.riskScore >= 76).length;
  const avgScore = riskData.length > 0 ? Math.round(riskData.reduce((s, v) => s + (v.riskScore || 0), 0) / riskData.length) : 0;
  const totalMonitored = meta?.total || riskData.length;

  const chartData = displayVillages.slice(0, 50).map(v => {
    const risk = getRiskLevel(v.riskScore);
    let color = 'var(--accent-green)';
    if (v.riskScore >= 76) color = 'var(--accent-red)';
    else if (v.riskScore >= 51) color = 'var(--accent-amber)';
    else if (v.riskScore >= 26) color = 'var(--accent-amber)'; // Moderate
    return {
      name: v.name.length > 8 ? v.name.slice(0, 8) + '…' : v.name,
      score: v.riskScore || 0,
      color: color,
    };
  });

  const handleFilterChange = (val) => {
    setVillageCount(val);
  };

  if (dataSource === 'seeding') {
    const s = seedingStatus || {};
    const currentPhase = s.dailyJob?.running ? 'dailyJob' : s.phase || 'connecting';
    const total = s.totalDistricts || s.importedCount || 0;
    
    // Status helpers
    const getPhaseState = (phaseName) => {
      if (currentPhase === phaseName) return 'active';
      const order = ['connecting', 'importing', 'geocoding', 'baselines', 'dailyJob', 'complete'];
      if (order.indexOf(currentPhase) > order.indexOf(phaseName)) return 'complete';
      return 'pending';
    };

    const renderPhaseItem = (id, title, desc, progressStr, pct) => {
      const state = getPhaseState(id);
      
      let Icon = Circle;
      let color = 'var(--text-tertiary)';
      if (state === 'active') {
        Icon = Loader2;
        color = 'var(--accent-blue)';
      } else if (state === 'complete') {
        Icon = CheckCircle;
        color = 'var(--accent-green, #10b981)';
      }
      
      return (
        <div key={id} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px', opacity: state === 'pending' ? 0.4 : 1 }}>
          <div style={{ marginTop: '2px' }}>
            <Icon size={20} className={state === 'active' ? 'spinning' : ''} style={{ color }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, color: state === 'active' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{title}</span>
              {state === 'active' && <span style={{ color: 'var(--accent-blue)', fontWeight: 600, fontSize: '12px' }}>{pct}%</span>}
              {state === 'complete' && <span style={{ color: 'var(--accent-green, #10b981)', fontSize: '12px', fontWeight: 600 }}>Done</span>}
            </div>
            {state === 'active' && (
              <>
                <div style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{ height: '100%', background: 'var(--accent-blue)', width: `${pct}%`, transition: 'width 0.3s ease' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>{desc}</span>
                  <span style={{ fontFamily: 'monospace' }}>{progressStr}</span>
                </div>
              </>
            )}
            {state === 'complete' && (
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{desc} - Completed successfully</div>
            )}
            {state === 'pending' && (
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{desc}</div>
            )}
          </div>
        </div>
      );
    };

    // Calculate metrics and fallback denominators to prevent division by zero
    const importPct = total ? Math.round(((s.importedCount || 0) / total) * 100) : 0;
    
    const geocodeTotal = s.importedCount || total;
    const geocodePct = geocodeTotal ? Math.round(((s.totalProcessedGeocode || 0) / geocodeTotal) * 100) : 0;
    
    const baselineTotal = s.geocodedCount || geocodeTotal;
    const baselinePct = baselineTotal ? Math.round(((s.totalProcessedBaseline || 0) / baselineTotal) * 100) : 0;
    
    const aiTotal = s.dailyJob?.totalToProcess || baselineTotal;
    const aiPct = aiTotal ? Math.round(((s.dailyJob?.processedCount || 0) / aiTotal) * 100) : 0;

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px' }}>
        <div className="glass-card" style={{ padding: '32px', maxWidth: '500px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 className="title" style={{ fontSize: '24px', marginBottom: '8px' }}>System Initialization</h2>
            <p className="body-text" style={{ color: 'var(--text-secondary)' }}>
              Building the foundational database for predictive analytics.
            </p>
          </div>
          
          <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px 20px 8px', marginBottom: '24px' }}>
            {renderPhaseItem('importing', 'Importing Census Data', 'Fetching administrative boundaries', `${s.importedCount || 0} / ${total || '?'}`, importPct)}
            {renderPhaseItem('geocoding', 'Mapping Coordinates', 'Resolving geospatial vectors', `${s.totalProcessedGeocode || 0} / ${geocodeTotal || '?'}`, geocodePct)}
            {renderPhaseItem('baselines', 'Fetching Climate Baselines', 'Downloading 30-year histories', `${s.totalProcessedBaseline || 0} / ${baselineTotal || '?'}`, baselinePct)}
            {renderPhaseItem('dailyJob', 'Generating AI Forecasts', 'Running predictive risk models', `${s.dailyJob?.processedCount || 0} / ${aiTotal || '?'}`, aiPct)}
          </div>

          {s.currentDistrict && currentPhase !== 'complete' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px' }}>
              <Activity size={18} style={{ color: 'var(--accent-blue)' }} className="spinning" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Currently Processing</span>
                <span style={{ fontSize: '14px', color: 'var(--accent-blue)', fontWeight: 500 }}>{s.currentDistrict}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading && riskData.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Loader2 size={40} className="spinning" style={{ color: 'var(--accent-blue)' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <DataSourceBanner dataSource={dataSource} />

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <KPICard icon={Activity} label="Villages Monitored" value={totalMonitored} accentColor="var(--accent-blue)" tintColor="var(--glass-bg)" />
        <KPICard icon={AlertTriangle} label="Extreme Risk" value={extremeCount} accentColor="var(--accent-red)" tintColor="var(--risk-extreme-tint)" trend={extremeCount > 0 ? 12 : undefined} />
        <KPICard icon={Droplets} label="Avg Risk Score" value={avgScore} accentColor="var(--accent-amber)" tintColor="var(--risk-severe-tint)" />
        <KPICard icon={Truck} label="Active Tankers" value={activeTankers} accentColor="var(--accent-green)" tintColor="var(--risk-normal-tint)" />
      </div>

      {/* Main 2-Column */}
      <div style={{ display: 'flex', gap: '20px', height: '400px' }}>
        {/* Left Col: Map */}
        <div className="glass-card" style={{ flex: '0 0 65%', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="section-header">Live Geospatial Overview</h3>
            <div className="glass-pill" style={{ display: 'flex', padding: '4px' }}>
              {['All', 'Extreme', 'Severe', 'Moderate', 'Normal'].map(level => (
                <button key={level} onClick={() => setRiskFilter(level)}
                  style={{
                    padding: '4px 12px', borderRadius: '9999px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                    background: riskFilter === level ? 'rgba(59,130,246,0.15)' : 'transparent',
                    color: riskFilter === level ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }}>
                  {level}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minHeight: '340px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
            <MapContainer center={INDIA_CENTER} zoom={4} zoomControl={false} scrollWheelZoom={false} doubleClickZoom={false} dragging={false} style={{ height: '100%', width: '100%', background: 'transparent' }}>
              <MapUpdater theme={theme} />
              <TileLayer url={OSM_TILES} noWrap={true} />
              {displayVillages.map((v, i) => {
                const lat = v.lat || v.location?.lat;
                const lon = v.lon || v.location?.lng;
                let color = '#10b981';
                if (v.riskScore >= 76) color = '#ef4444';
                else if (v.riskScore >= 51) color = '#f59e0b';
                else if (v.riskScore >= 26) color = '#eab308';
                
                return lat && lon ? (
                  <CircleMarker key={v._id || i} center={[lat, lon]}
                    radius={Math.max(6, (v.riskScore || 0) / 8)}
                    pathOptions={{ color: color, fillColor: color, fillOpacity: 0.8, weight: 2 }}
                  />
                ) : null;
              })}
            </MapContainer>
          </div>
        </div>

        {/* Right Col: Critical Regions */}
        <div className="glass-card" style={{ flex: '0 0 calc(35% - 20px)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 className="section-header">Critical Regions</h3>
            <div className="glass-pill" style={{ display: 'flex', padding: '4px' }}>
              {[10, 25, 50, 100, 1000].map(c => (
                <button key={c} onClick={() => handleFilterChange(c)}
                  style={{
                    padding: '4px 12px', borderRadius: '9999px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                    background: villageCount === c ? 'rgba(59,130,246,0.15)' : 'transparent',
                    color: villageCount === c ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }}>
                  {c === 1000 ? 'All' : `Top ${c}`}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {displayVillages.length === 0 && (
              <EmptyState title="No risk data" description="Waiting for processing..." />
            )}
            {displayVillages.map((v, i) => {
              let color = 'var(--accent-green)';
              let bgTint = 'var(--risk-normal-tint)';
              if (v.riskScore >= 76) { color = 'var(--accent-red)'; bgTint = 'var(--risk-extreme-tint)'; }
              else if (v.riskScore >= 51) { color = 'var(--accent-amber)'; bgTint = 'var(--risk-severe-tint)'; }
              else if (v.riskScore >= 26) { color = '#eab308'; bgTint = 'var(--risk-moderate-tint)'; }

              return (
                <div key={v._id || i} style={{ display: 'flex', alignItems: 'center', padding: '12px', borderRadius: '12px', transition: 'var(--transition-default)', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="glass-pill" style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, marginRight: '12px', color: 'var(--text-secondary)' }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{v.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{v.state}</div>
                  </div>
                  <div className="glass-pill" style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px', background: bgTint, border: `1px solid ${color}40` }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: color, filter: `drop-shadow(0 0 8px ${color}80)` }}>{v.riskScore}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card" style={{ padding: '20px', width: '100%' }}>
        <h3 className="section-header" style={{ marginBottom: '20px' }}>Risk Distribution</h3>
        <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '8px' }}>
          <div style={{ minWidth: `${Math.max(100, chartData.length * 40)}px`, height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="name" tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--glass-bg)', border: 'var(--glass-border)', backdropFilter: 'blur(10px)', borderRadius: '12px', color: 'var(--text-primary)' }}
                cursor={{ fill: 'var(--text-tertiary)', opacity: 0.1 }}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
