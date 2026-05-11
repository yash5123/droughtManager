import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import { AlertCircle, Users, MapPin, CloudRain, Droplets, Truck, X, Radio } from 'lucide-react';
import { useVillageData } from '../context/VillageDataContext.jsx';
import { useRankedVillages, useSeedingStatus } from '../hooks/useRiskData.js';
import { useAuth } from '../context/AuthContext.jsx';
import RiskBadge from '../components/ui/RiskBadge.jsx';
import LoginPrompt from '../components/ui/LoginPrompt.jsx';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';
import { getRiskLevel, RISK_LEVELS } from '../utils/riskLevels.js';
import { formatNumber } from '../utils/formatters.js';
import { useTheme } from '../context/ThemeContext.jsx';

const INDIA_CENTER = [26.0, 78.5]; // Shifted further North to avoid UI obstruction
const OSM_TILES = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';

function MapUpdater({ theme }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [theme, map]);
  return null;
}

export default function MapPage() {
  const { villageCount, setVillageCount } = useVillageData();
  const { data: rankedData } = useRankedVillages(1000);
  const { data: seedingStatus } = useSeedingStatus();
  
  const riskData = rankedData?.data || [];
  let dataSource = 'pending';
  if (seedingStatus?.inProgress) dataSource = 'seeding';
  else if (riskData.length > 0) dataSource = rankedData?.meta?.isStale ? 'stale' : 'backend';
  else if (seedingStatus?.phase === 'complete' && riskData.length === 0) dataSource = 'stale';
  else if (seedingStatus) dataSource = 'seeding';

  const { user } = useAuth();
  const { theme } = useTheme();
  const [selected, setSelected] = useState(null);
  const [riskFilter, setRiskFilter] = useState('All');

  const [radarUrl, setRadarUrl] = useState(null);
  const [showRadar, setShowRadar] = useState(false);

  useEffect(() => {
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(r => r.json())
      .then(data => {
        const latest = data.radar?.past?.slice(-1)[0];
        if (latest) {
          setRadarUrl(`https://tilecache.rainviewer.com${latest.path}/256/{z}/{x}/{y}/2/1_1.png`);
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const matching = riskData.filter(v => {
      const level = getRiskLevel(v.riskScore).label;
      const hasCoords = (v.location?.lat && v.location?.lng) || (v.lat && v.lon);
      const matchesFilter = riskFilter === 'All' || riskFilter === level;
      return matchesFilter && hasCoords;
    });
    return matching.slice(0, villageCount);
  }, [riskData, riskFilter, villageCount]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <DataSourceBanner dataSource={dataSource} />

      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div className="header-icon-container">
          <MapPin size={32} />
        </div>
        <div className="header-text">
          <h1 className="header-title">Spatial Risk Map</h1>
          <p className="header-subtitle">Interactive visualization of drought vulnerability & live weather radar overlays.</p>
        </div>
      </div>
      
      <div style={{ 
        flex: 1, 
        borderRadius: '20px', 
        overflow: 'hidden', 
        position: 'relative', 
        marginTop: dataSource ? '20px' : 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--card-bg)',
        border: '1px solid var(--divider)',
        paddingTop: '110px' // Create space for the controls
      }}>
        {/* Map Controls Overlay */}
        <div className="glass-panel" style={{ 
          position: 'absolute', top: '32px', left: '50%', transform: 'translateX(-50%)', 
          zIndex: 1000, padding: '12px 24px', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '24px',
          boxShadow: 'var(--glass-shadow-elevated)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--divider)'
        }}>
          {/* Severity Filters */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {['All', 'Extreme', 'Severe', 'Moderate', 'Normal'].map(key => {
              const def = RISK_LEVELS[key] || { label: 'All', color: '#3b82f6' };
              const isActive = riskFilter === key;
              const baseColor = def.color;
              
              return (
                <button key={key} onClick={() => setRiskFilter(key)}
                  style={{
                    padding: '6px 16px', borderRadius: '9999px', border: `1px solid ${isActive ? baseColor : 'transparent'}`, cursor: 'pointer',
                    fontSize: '12px', fontWeight: 600, transition: 'all 0.2s',
                    background: isActive ? `${baseColor}15` : 'transparent',
                    color: isActive ? baseColor : 'var(--text-secondary)'
                  }}>
                  {def.label}
                </button>
              );
            })}
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--divider)' }} />

          {/* Counts */}
          <div className="glass-pill" style={{ display: 'flex', padding: '4px' }}>
            {[10, 25, 50, 100, 1000].map(c => (
              <button key={c} onClick={() => setVillageCount(c)}
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

          <div style={{ width: '1px', height: '24px', background: 'var(--divider)' }} />

          {/* Radar Toggle */}
          <button onClick={() => setShowRadar(!showRadar)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '9999px',
              border: `1px solid ${showRadar ? 'var(--accent-cyan)' : 'transparent'}`,
              background: showRadar ? 'rgba(6,182,212,0.15)' : 'transparent',
              color: showRadar ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s'
            }}>
            <Radio size={16} className={showRadar ? 'live-pulse' : ''} />
            Live Radar
          </button>

          <div className="glass-pill" style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {filtered.length} NODES
          </div>
        </div>

        {/* Main Map */}
        <MapContainer 
          center={INDIA_CENTER} 
          zoom={5} 
          minZoom={4}
          maxBounds={[[-10, 50], [40, 110]]}
          maxBoundsViscosity={1.0}
          zoomControl={true} 
          scrollWheelZoom={true} 
          doubleClickZoom={true} 
          dragging={true} 
          attributionControl={false} 
          style={{ height: '100%', width: '100%', background: 'transparent' }}
        >
          <MapUpdater theme={theme} />
          <TileLayer url={OSM_TILES} noWrap={true} />
          {showRadar && radarUrl && (
            <TileLayer url={radarUrl} opacity={0.6} zIndex={10} maxNativeZoom={7} />
          )}
          {filtered.map((v, i) => {
            const risk = getRiskLevel(v.riskScore);
            const isSelected = selected?._id === v._id;
            const radius = Math.max(6, Math.min(18, v.riskScore / 5));
            return (
              <CircleMarker key={v._id || i} center={[v.location?.lat || v.lat, v.location?.lng || v.lon]}
                radius={isSelected ? radius * 1.5 : radius}
                pathOptions={{ 
                  color: risk.color, 
                  fillColor: risk.color, 
                  fillOpacity: isSelected ? 0.8 : 0.6, 
                  weight: isSelected ? 3 : 2 
                }}
                eventHandlers={{ click: () => setSelected(v) }}>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {selected && (
          <div className="glass-panel" style={{
            position: 'absolute', top: '24px', right: '24px', width: '340px', bottom: '24px', zIndex: 1000,
            borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column',
            boxShadow: 'var(--glass-shadow-elevated)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h3 className="section-header">{selected.name}</h3>
                <p className="caption-text" style={{ color: 'var(--text-secondary)' }}>{selected.district}, {selected.state}</p>
              </div>
              <button className="icon-btn" onClick={() => setSelected(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="glass-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="card-label" style={{ color: 'var(--text-secondary)' }}>Current Risk Level</span>
                  <AlertCircle size={16} style={{ color: 'var(--text-tertiary)' }} />
                </div>
                <RiskBadge score={selected.riskScore} size="lg" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <MetricCard icon={Users} label="Population" value={formatNumber(selected.population)} />
                <MetricCard icon={MapPin} label="Region Type" value={selected.region} />
                <MetricCard icon={CloudRain} label="Avg Rainfall" value={`${selected.avgAnnualRainfall || '—'} mm`} />
                <MetricCard icon={Droplets} label="Water Level" value={`${selected.metricsSnapshot?.groundwaterAvg?.toFixed(1) || '—'} m`} />
              </div>

              {selected.metricsSnapshot && (
                <div className="glass-card" style={{ padding: '16px' }}>
                  <h4 className="card-label" style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>Local Sensor Data</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Rainfall 30D Avg</span>
                      <span style={{ fontWeight: 600 }}>{selected.metricsSnapshot.rainfallAvg?.toFixed(1)} mm</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Groundwater Depth</span>
                      <span style={{ fontWeight: 600 }}>{selected.metricsSnapshot.groundwaterAvg?.toFixed(1)} m</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--divider)' }}>
              {user ? (
                <button className="primary-btn" style={{ width: '100%', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Truck size={18} />
                  Dispatch Emergency Tanker
                </button>
              ) : (
                <LoginPrompt message="Sign in to dispatch logistics" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="glass-card" style={{ padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
        <Icon size={14} />
        <span className="card-label" style={{ fontSize: '11px' }}>{label}</span>
      </div>
      <p className="data-value" style={{ fontSize: '18px' }}>{value}</p>
    </div>
  );
}
