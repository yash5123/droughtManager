import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
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
    <div className="flex gap-1.5 flex-wrap">
      {Object.entries(RISK_LEVELS).map(([key, def]) => (
        <button key={key} onClick={() => onToggle(key)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
          style={{
            borderColor: active.includes(key) ? def.color : 'var(--color-border)',
            backgroundColor: active.includes(key) ? def.color + '20' : 'transparent',
            color: active.includes(key) ? def.color : 'var(--color-text-muted)',
          }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: def.color }} />
          {def.label}
        </button>
      ))}
    </div>
  );
}

export default function MapPage() {
  const { activeVillages, dataSource } = useVillageData();
  const { user, openLoginModal } = useAuth();
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState(['Extreme', 'Severe', 'Moderate', 'Normal']);

  const toggleFilter = (level) => {
    setFilters(prev => prev.includes(level) ? prev.filter(f => f !== level) : [...prev, level]);
  };

  const filtered = useMemo(() => {
    return activeVillages.filter(v => {
      const level = getRiskLevel(v.riskScore).label;
      return filters.includes(level) && v.location?.lat && v.location?.lng;
    });
  }, [activeVillages, filters]);

  return (
    <div className="space-y-4 animate-fade-in">
      <DataSourceBanner dataSource={dataSource} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <RiskFilter active={filters} onToggle={toggleFilter} />
        <span className="text-xs text-[var(--color-text-muted)]">{filtered.length} locations</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: 'calc(100vh - 220px)' }}>
        <div className="lg:col-span-3 card overflow-hidden rounded-xl" style={{ minHeight: 400 }}>
          <MapContainer center={INDIA_CENTER} zoom={5} className="w-full h-full" style={{ background: 'var(--color-bg-base)' }}
            zoomControl={true} attributionControl={true}>
            <TileLayer url={DARK_TILES} attribution='&copy; <a href="https://carto.com">CARTO</a>' />
            {filtered.map((v, i) => {
              const risk = getRiskLevel(v.riskScore);
              const radius = Math.max(6, Math.min(18, v.riskScore / 5));
              return (
                <CircleMarker key={v._id || i} center={[v.location.lat, v.location.lng]}
                  radius={radius}
                  pathOptions={{ color: risk.color, fillColor: risk.color, fillOpacity: 0.35, weight: 2 }}
                  eventHandlers={{ click: () => setSelected(v) }}>
                  <Popup>
                    <div style={{ color: '#1a1a1a', minWidth: 150 }}>
                      <strong>{v.name}</strong><br />
                      <span>Risk: {v.riskScore} ({risk.label})</span><br />
                      <span>Pop: {formatNumber(v.population)}</span>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Side Panel */}
        <div className="card p-4 overflow-y-auto hide-scrollbar">
          {selected ? (
            <div className="space-y-4 animate-slide-up">
              <div>
                <h3 className="text-base font-bold text-display">{selected.name}</h3>
                <p className="text-xs text-[var(--color-text-muted)]">{selected.district}, {selected.state}</p>
              </div>
              <RiskBadge score={selected.riskScore} size="md" />
              <div className="space-y-2">
                <InfoRow label="Risk Score" value={selected.riskScore} />
                <InfoRow label="Population" value={formatNumber(selected.population)} />
                <InfoRow label="Region" value={selected.region} />
                <InfoRow label="Avg Rainfall" value={`${selected.avgAnnualRainfall || '—'} mm/yr`} />
                {selected.metricsSnapshot && (
                  <>
                    <InfoRow label="Rainfall Avg" value={`${selected.metricsSnapshot.rainfallAvg?.toFixed(1) || '—'} mm`} />
                    <InfoRow label="GW Level" value={`${selected.metricsSnapshot.groundwaterAvg?.toFixed(1) || '—'} m`} />
                  </>
                )}
              </div>
              <div className="pt-2">
                {user ? (
                  <button className="w-full py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{ backgroundColor: 'var(--color-cyan)', color: 'var(--color-bg-base)' }}>
                    Dispatch Tanker
                  </button>
                ) : (
                  <LoginPrompt message="Sign in to dispatch" />
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-sm text-[var(--color-text-muted)]">Click a marker to view village details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-xs py-1 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="font-medium font-mono">{value}</span>
    </div>
  );
}
