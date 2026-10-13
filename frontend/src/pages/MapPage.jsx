import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import { MapPin, X, Radio } from 'lucide-react';
import { useVillageData } from '../context/VillageDataContext.jsx';
import { useRankedVillages, useSeedingStatus } from '../hooks/useRiskData.js';
import RiskBadge from '../components/ui/RiskBadge.jsx';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';
import { getRiskLevel, RISK_LEVELS } from '../utils/riskLevels.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { getTileConfig } from '../utils/mapTiles.js';

const INDIA_CENTER = [26.0, 78.5]; // Shifted further North to avoid UI obstruction

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
  
  const riskData = useMemo(() => rankedData?.data || [], [rankedData]);
  let dataSource = 'pending';
  if (seedingStatus?.inProgress) dataSource = 'seeding';
  else if (seedingStatus?.dailyJob?.running) dataSource = 'updating';
  else if (riskData.length > 0) dataSource = rankedData?.meta?.isStale ? 'stale' : 'backend';
  else if (seedingStatus?.phase === 'complete' && riskData.length === 0) dataSource = 'stale';
  else if (seedingStatus) dataSource = 'seeding';


  const { theme } = useTheme();
  const tileConfig = useMemo(() => getTileConfig('light_nolabels', theme), [theme]);
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
      
      <div className="map-wrapper-card" style={{ 
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
        <div className="glass-panel filter-toolbar" style={{ 
          position: 'absolute', 
          top: '32px', 
          left: selected ? '24px' : '50%', 
          transform: selected ? 'none' : 'translateX(-50%)', 
          zIndex: 1000, padding: '12px 24px', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '24px',
          boxShadow: 'var(--glass-shadow-elevated)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--divider)',
          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
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
          <TileLayer url={tileConfig.url} attribution={tileConfig.attribution} noWrap={true} />
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
          <div className="glass-panel detail-sidebar" style={{
            position: 'absolute', top: '24px', right: '24px', width: '340px', zIndex: 1000,
            borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column',
            boxShadow: 'var(--glass-shadow-elevated)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 className="section-header">{selected.name}</h3>
                <p className="caption-text" style={{ color: 'var(--text-secondary)' }}>{selected.district}, {selected.state}</p>
              </div>
              <button className="icon-btn" onClick={() => setSelected(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="card-label" style={{ color: 'var(--text-secondary)' }}>Current Risk Level</span>
              </div>
              <RiskBadge score={selected.riskScore} size="lg" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


