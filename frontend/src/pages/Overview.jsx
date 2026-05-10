import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, Droplets, Truck, Activity, ArrowUp, ArrowDown, Loader2, Database, MapPin } from 'lucide-react';
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
  const { activeVillages, riskData, dataSource, seedingStatus, loading, setVillageCount, meta } = useVillageData();
  const { user } = useAuth();
  const [activeTankers, setActiveTankers] = useState(0);
  const [activeFilter, setActiveFilter] = useState(10);
  const { theme } = useTheme();

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

  const chartData = activeVillages.slice(0, 50).map(v => {
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
    setActiveFilter(val);
    setVillageCount(val);
  };

  if (dataSource === 'seeding') {
    let phaseText = 'Connecting to backend...';
    let progressText = '';
    let currentTask = '';
    let pct = 0;
    
    if (seedingStatus) {
      if (seedingStatus.phase === 'importing') {
        phaseText = '1/4: Importing Census Data...';
        progressText = `${seedingStatus.importedCount} / ${seedingStatus.totalDistricts || '?'} regions`;
        if (seedingStatus.totalDistricts) pct = Math.round((seedingStatus.importedCount / seedingStatus.totalDistricts) * 100);
      } else if (seedingStatus.phase === 'geocoding') {
        phaseText = '2/4: Mapping Geospatial Coordinates...';
        progressText = `${seedingStatus.totalProcessedGeocode} / ${seedingStatus.importedCount} regions`;
        if (seedingStatus.importedCount) pct = Math.round((seedingStatus.totalProcessedGeocode / seedingStatus.importedCount) * 100);
      } else if (seedingStatus.phase === 'baselines') {
        phaseText = '3/4: Fetching 30-Year Climate Baselines...';
        progressText = `${seedingStatus.totalProcessedBaseline} / ${seedingStatus.geocodedCount} regions`;
        if (seedingStatus.geocodedCount) pct = Math.round((seedingStatus.totalProcessedBaseline / seedingStatus.geocodedCount) * 100);
      } else if (seedingStatus.dailyJob && seedingStatus.dailyJob.running) {
        phaseText = '4/4: Generating AI Risk Forecasts...';
        progressText = `${seedingStatus.dailyJob.processedCount || 0} / ${seedingStatus.dailyJob.totalToProcess || '?'} models computed`;
        if (seedingStatus.dailyJob.totalToProcess) pct = Math.round((seedingStatus.dailyJob.processedCount / seedingStatus.dailyJob.totalToProcess) * 100);
      } else {
        phaseText = 'Finalizing setup...';
        pct = 100;
      }
      
      currentTask = seedingStatus.currentDistrict || '';
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', maxWidth: '450px', width: '100%' }}>
          <Loader2 size={40} className="spinning" style={{ color: 'var(--accent-blue)', margin: '0 auto 20px' }} />
          <h2 className="title" style={{ fontSize: '24px', marginBottom: '24px' }}>System Initialization</h2>
          
          <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{phaseText}</span>
              <span style={{ color: 'var(--accent-blue)', fontWeight: 600, fontSize: '14px' }}>{pct}%</span>
            </div>
            
            {/* Progress Bar Container */}
            <div style={{ height: '6px', background: 'var(--glass-bg)', borderRadius: '3px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ height: '100%', background: 'var(--accent-blue)', width: `${pct}%`, transition: 'width 0.3s ease' }}></div>
            </div>
            
            {progressText && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <span>Progress:</span>
                <span style={{ fontFamily: 'monospace' }}>{progressText}</span>
              </div>
            )}
            
            {currentTask && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                <span>Processing:</span>
                <span style={{ fontStyle: 'italic' }}>{currentTask}</span>
              </div>
            )}
          </div>
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
          <h3 className="section-header" style={{ marginBottom: '16px' }}>Live Geospatial Overview</h3>
          <div style={{ flex: 1, minHeight: '340px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
            <MapContainer center={INDIA_CENTER} zoom={4} zoomControl={false} style={{ height: '100%', width: '100%', background: 'transparent' }}>
              <MapUpdater theme={theme} />
              <TileLayer url={OSM_TILES} noWrap={true} />
              {activeVillages.map((v, i) => {
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
              {[10, 25, 50].map(c => (
                <button key={c} onClick={() => handleFilterChange(c)}
                  style={{
                    padding: '4px 12px', borderRadius: '9999px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                    background: activeFilter === c ? 'rgba(59,130,246,0.15)' : 'transparent',
                    color: activeFilter === c ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }}>
                  Top {c}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeVillages.length === 0 && (
              <EmptyState title="No risk data" description="Waiting for processing..." />
            )}
            {activeVillages.map((v, i) => {
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
