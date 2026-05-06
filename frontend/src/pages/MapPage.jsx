import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import { AlertCircle, Users, MapPin, CloudRain, Droplets, Truck, X, Radio } from 'lucide-react';
import { useVillageData } from '../context/VillageDataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import RiskBadge from '../components/ui/RiskBadge.jsx';
import LoginPrompt from '../components/ui/LoginPrompt.jsx';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';
import { getRiskLevel, RISK_LEVELS } from '../utils/riskLevels.js';
import { formatNumber } from '../utils/formatters.js';
import 'leaflet/dist/leaflet.css';

const INDIA_CENTER = [22.5, 78.5];
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

function RiskFilter({ active, onToggle }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {Object.entries(RISK_LEVELS).map(([key, def]) => (
        <button key={key} onClick={() => onToggle(key)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all"
          style={{
            borderColor: active.includes(key) ? def.color : 'var(--color-outline-variant)',
            backgroundColor: active.includes(key) ? def.color + '15' : 'var(--color-surface-container-lowest)',
            color: active.includes(key) ? def.color : 'var(--color-outline)',
            opacity: active.includes(key) ? 1 : 0.6
          }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: def.color, boxShadow: active.includes(key) ? `0 0 8px ${def.color}` : 'none' }} />
          {def.label}
        </button>
      ))}
    </div>
  );
}

export default function MapPage() {
  const { activeVillages, dataSource, villageCount, setVillageCount } = useVillageData();
  const { user } = useAuth();
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState(['Extreme', 'Severe', 'Moderate', 'Normal']);

  const toggleFilter = (level) => {
    setFilters(prev => prev.includes(level) ? prev.filter(f => f !== level) : [...prev, level]);
  };

  // RainViewer live radar
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
    return activeVillages.filter(v => {
      const level = getRiskLevel(v.riskScore).label;
      return filters.includes(level) && v.location?.lat && v.location?.lng;
    });
  }, [activeVillages, filters]);

  return (
    <div className="space-y-4 animate-fade-in flex flex-col h-full">
      <DataSourceBanner dataSource={dataSource} />
      
      <div className="flex items-center justify-between flex-wrap gap-4 bg-[var(--color-surface-container)] p-3 rounded-xl border border-[var(--color-outline-variant)]">
        <div className="flex items-center gap-4">
          <MapPin className="w-5 h-5 text-[var(--color-primary)]" />
          <h2 className="text-sm font-semibold text-display text-[var(--color-on-surface)]">Geospatial Risk Mapping</h2>
        </div>
        <div className="flex items-center gap-4">
          <RiskFilter active={filters} onToggle={toggleFilter} />
          <div className="h-6 w-px bg-[var(--color-outline-variant)]"></div>
          <div className="flex items-center gap-1 px-1 py-0.5 rounded-lg bg-[var(--color-surface-container-highest)]">
            {[10, 25, 50].map(c => (
              <button key={c} onClick={() => setVillageCount(c)}
                className="px-2 py-1 rounded text-[10px] font-semibold transition-all"
                style={{ backgroundColor: villageCount===c ? 'var(--color-primary)' : 'transparent', color: villageCount===c ? 'var(--color-on-primary)' : 'var(--color-on-surface-variant)' }}>
                Top {c}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-[var(--color-outline-variant)]"></div>
          <span className="text-xs font-mono text-[var(--color-on-surface-variant)]">{filtered.length} NODES</span>
          <div className="h-6 w-px bg-[var(--color-outline-variant)]"></div>
          <button onClick={() => setShowRadar(p => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all"
            style={{
              borderColor: showRadar ? 'var(--color-primary)' : 'var(--color-outline-variant)',
              backgroundColor: showRadar ? 'var(--color-primary)' + '20' : 'transparent',
              color: showRadar ? 'var(--color-primary)' : 'var(--color-on-surface-variant)'
            }}>
            <Radio className="w-3.5 h-3.5" /> Live Radar
          </button>
        </div>
      </div>

      <div className="relative flex-1 rounded-xl overflow-hidden border border-[var(--color-outline-variant)] shadow-2xl" style={{ minHeight: 'calc(100vh - 240px)' }}>
        
        {/* Main Map */}
        <MapContainer center={INDIA_CENTER} zoom={5} className="w-full h-full bg-[var(--color-background)] z-0"
          zoomControl={true} attributionControl={false}>
          <TileLayer url={DARK_TILES} />
          {showRadar && radarUrl && (
            <TileLayer url={radarUrl} opacity={0.6} zIndex={10} />
          )}
          {filtered.map((v, i) => {
            const risk = getRiskLevel(v.riskScore);
            const isSelected = selected?._id === v._id;
            const radius = Math.max(6, Math.min(18, v.riskScore / 5));
            return (
              <CircleMarker key={v._id || i} center={[v.location.lat, v.location.lng]}
                radius={isSelected ? radius * 1.5 : radius}
                pathOptions={{ 
                  color: risk.color, 
                  fillColor: risk.color, 
                  fillOpacity: isSelected ? 0.8 : 0.35, 
                  weight: isSelected ? 3 : 1 
                }}
                eventHandlers={{ click: () => setSelected(v) }}>
                {/* No Popup here, we use the docked side panel instead */}
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Floating/Docked Side Panel */}
        <div className={`absolute top-0 right-0 bottom-0 w-[350px] bg-[var(--color-surface-container)] border-l border-[var(--color-outline-variant)] shadow-[-10px_0_30px_rgba(0,0,0,0.5)] transition-transform duration-300 z-10 flex flex-col ${selected ? 'translate-x-0' : 'translate-x-full'}`}>
          {selected && (
            <>
              <div className="p-4 border-b border-[var(--color-outline-variant)] flex items-start justify-between bg-[var(--color-surface-container-high)]">
                <div>
                  <h3 className="text-lg font-bold text-display text-[var(--color-on-surface)]">{selected.name}</h3>
                  <p className="text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider mt-1">{selected.district}, {selected.state}</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1 rounded-md hover:bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-5 flex-1 overflow-y-auto hide-scrollbar space-y-6">
                {/* Risk Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wide">Current Risk Level</span>
                    <AlertCircle className="w-4 h-4 text-[var(--color-outline)]" />
                  </div>
                  <RiskBadge score={selected.riskScore} size="lg" />
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard icon={Users} label="Population" value={formatNumber(selected.population)} />
                  <MetricCard icon={MapPin} label="Region Type" value={selected.region} />
                  <MetricCard icon={CloudRain} label="Avg Rainfall" value={`${selected.avgAnnualRainfall || '—'} mm`} />
                  <MetricCard icon={Droplets} label="Water Level" value={`${selected.metricsSnapshot?.groundwaterAvg?.toFixed(1) || '—'} m`} />
                </div>

                {/* Detailed Analysis Placeholder */}
                {selected.metricsSnapshot && (
                  <div className="p-3 rounded-lg bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]">
                    <h4 className="text-xs font-bold text-[var(--color-on-surface)] mb-2 uppercase tracking-wide">Local Sensor Data</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[var(--color-on-surface-variant)]">Rainfall 30D Avg</span>
                        <span className="font-mono text-[var(--color-primary)]">{selected.metricsSnapshot.rainfallAvg?.toFixed(1)} mm</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[var(--color-on-surface-variant)]">Groundwater Depth</span>
                        <span className="font-mono text-[var(--color-primary)]">{selected.metricsSnapshot.groundwaterAvg?.toFixed(1)} m</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Area */}
              <div className="p-4 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)]">
                {user ? (
                  <button className="w-full py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 hover:opacity-90 shadow-[0_0_15px_rgba(76,215,246,0.3)]"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                    <Truck className="w-4 h-4" />
                    Dispatch Emergency Tanker
                  </button>
                ) : (
                  <LoginPrompt message="Sign in to dispatch logistics" />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line no-unused-vars
function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="p-3 rounded-lg bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-[var(--color-primary)]" />
        <span className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold font-mono text-[var(--color-on-surface)]">{value}</p>
    </div>
  );
}
