import React, { useState, useEffect, useMemo } from 'react';
import { useVillageData } from '../context/VillageDataContext.jsx';
import { getRiskLevel } from '../utils/riskLevels.js';
import { fetchHistoricalWeather } from '../services/weatherService.js';
import { computeLocalRiskMetrics } from '../services/weatherService.js';

export default function RiskCalculator() {
  const { allVillages } = useVillageData();
  const [selectedId, setSelectedId] = useState('');
  const [customLat, setCustomLat] = useState('');
  const [customLon, setCustomLon] = useState('');
  const [days, setDays] = useState(30);
  const [weights, setWeights] = useState({ rainfall: 40, groundwater: 35, population: 25 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectedVillage = useMemo(() => allVillages.find(v => (v._id || v.id) === selectedId), [allVillages, selectedId]);

  const lat = customLat || selectedVillage?.location?.lat || '';
  const lon = customLon || selectedVillage?.location?.lng || '';

  const adjustWeight = (key, val) => {
    const newVal = Math.max(0, Math.min(100, val));
    const others = Object.keys(weights).filter(k => k !== key);
    const remaining = 100 - newVal;
    const otherTotal = others.reduce((s, k) => s + weights[k], 0);
    const newWeights = { ...weights, [key]: newVal };
    others.forEach(k => {
      newWeights[k] = otherTotal > 0 ? Math.round((weights[k] / otherTotal) * remaining) : Math.round(remaining / others.length);
    });
    const sum = Object.values(newWeights).reduce((s, v) => s + v, 0);
    if (sum !== 100) newWeights[others[0]] += 100 - sum;
    setWeights(newWeights);
  };

  const calculate = async () => {
    if (!lat || !lon) return;
    setLoading(true);
    try {
      const { data } = await fetchHistoricalWeather(lat, lon, days);
      if (!data?.daily) { setResult({ error: 'No weather data available' }); return; }
      const metrics = computeLocalRiskMetrics(data);
      const rainfallDeficit = Math.max(0, Math.min(100, Math.round((1 - metrics.totalPrecipitation / ((selectedVillage?.avgAnnualRainfall || 600) * days / 365)) * 100)));
      const gwProxy = metrics.avgSoilMoisture !== null ? Math.max(0, Math.min(100, Math.round((1 - metrics.avgSoilMoisture / 0.35) * 100))) : 50;
      const popGap = 50;
      const score = Math.round(rainfallDeficit * (weights.rainfall / 100) + gwProxy * (weights.groundwater / 100) + popGap * (weights.population / 100));
      const level = getRiskLevel(score);
      setResult({ score, level, rainfallDeficit, gwProxy, popGap, metrics });
    } catch { setResult({ error: 'Calculation failed' }); }
    finally { setLoading(false); }
  };

  const circumference = 2 * Math.PI * 70;
  const dashOffset = result?.score != null ? circumference * (1 - result.score / 100) : circumference;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input Panel */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-display">Configuration</h3>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Village</label>
            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setCustomLat(''); setCustomLon(''); }}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:border-[var(--color-cyan)]"
              style={{ backgroundColor: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
              <option value="">Custom Location</option>
              {allVillages.map(v => <option key={v._id || v.id} value={v._id || v.id}>{v.name} — {v.state}</option>)}
            </select>
          </div>
          {!selectedId && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Latitude</label>
                <input type="number" step="0.0001" value={customLat} onChange={e => setCustomLat(e.target.value)} placeholder="e.g. 26.92"
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:border-[var(--color-cyan)]"
                  style={{ backgroundColor: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Longitude</label>
                <input type="number" step="0.0001" value={customLon} onChange={e => setCustomLon(e.target.value)} placeholder="e.g. 70.91"
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:border-[var(--color-cyan)]"
                  style={{ backgroundColor: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              </div>
            </div>
          )}
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Analysis Period: {days} days</label>
            <input type="range" min={7} max={90} value={days} onChange={e => setDays(parseInt(e.target.value))} className="w-full accent-[#06b6d4]" />
          </div>

          <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
            <p className="text-xs font-semibold text-[var(--color-text-secondary)]">Weight Distribution</p>
            {Object.entries(weights).map(([key, val]) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--color-text-muted)] capitalize">{key}</span>
                  <span className="font-mono font-semibold">{val}%</span>
                </div>
                <input type="range" min={0} max={100} value={val} onChange={e => adjustWeight(key, parseInt(e.target.value))} className="w-full accent-[#06b6d4]" />
              </div>
            ))}
          </div>

          <button onClick={calculate} disabled={loading || (!lat || !lon)}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-cyan)', color: 'var(--color-bg-base)' }}>
            {loading ? 'Calculating...' : 'Calculate Risk'}
          </button>
        </div>

        {/* Result Panel */}
        <div className="card p-5 flex flex-col items-center justify-center">
          {result?.error ? (
            <p className="text-sm text-red-400">{result.error}</p>
          ) : result ? (
            <div className="text-center space-y-4 animate-slide-up">
              <svg width="180" height="180" viewBox="0 0 180 180">
                <circle cx="90" cy="90" r="70" fill="none" stroke="var(--color-bg-elevated)" strokeWidth="10" />
                <circle cx="90" cy="90" r="70" fill="none" stroke={result.level.color} strokeWidth="10"
                  strokeDasharray={circumference} strokeDashoffset={dashOffset}
                  strokeLinecap="round" transform="rotate(-90 90 90)"
                  style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
                <text x="90" y="82" textAnchor="middle" fill={result.level.color} fontSize="36" fontWeight="bold" fontFamily="var(--font-mono)">{result.score}</text>
                <text x="90" y="105" textAnchor="middle" fill="var(--color-text-muted)" fontSize="12">{result.level.label}</text>
              </svg>
              <div className="grid grid-cols-3 gap-3 w-full">
                <MiniStat label="Rain Deficit" value={`${result.rainfallDeficit}%`} />
                <MiniStat label="GW Proxy" value={`${result.gwProxy}%`} />
                <MiniStat label="Pop Gap" value={`${result.popGap}%`} />
              </div>
              {result.metrics && (
                <div className="text-xs text-[var(--color-text-muted)] pt-2 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <p>Total Precip: {result.metrics.totalPrecipitation} mm ({result.metrics.daysWithRain}/{result.metrics.daysTotal} rainy days)</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-[var(--color-text-muted)]">Configure parameters and click Calculate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--color-bg-surface)' }}>
      <p className="text-sm font-bold font-mono">{value}</p>
      <p className="text-[10px] text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}
