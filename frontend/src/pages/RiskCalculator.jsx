import React, { useState, useMemo } from 'react';
import { useVillageData } from '../context/VillageDataContext.jsx';
import { getRiskLevel } from '../utils/riskLevels.js';
import { fetchHistoricalWeather, computeLocalRiskMetrics } from '../services/weatherService.js';
import { Settings, MapPin, Activity, Calculator } from 'lucide-react';

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
    <div className="space-y-6 animate-fade-in max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Calculator className="w-6 h-6 text-[var(--color-primary)]" />
        <div>
          <h2 className="text-base font-bold text-display text-[var(--color-on-surface)]">Scenario Risk Simulator</h2>
          <p className="text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider">Predictive Vulnerability Engine</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input Panel */}
        <div className="card p-6 space-y-6 lg:col-span-2 border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] relative overflow-hidden">
          {/* Subtle tech background line */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/5 blur-3xl rounded-full pointer-events-none"></div>

          <div className="flex items-center gap-2 mb-2 border-b border-[var(--color-outline-variant)] pb-2">
            <MapPin className="w-4 h-4 text-[var(--color-secondary)]" />
            <h3 className="text-xs font-bold text-display uppercase tracking-wider text-[var(--color-on-surface)]">Location Parameters</h3>
          </div>
          
          <div>
            <label className="text-[10px] text-[var(--color-on-surface-variant)] font-bold uppercase tracking-wider mb-2 block">Target Region</label>
            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setCustomLat(''); setCustomLon(''); }}
              className="w-full px-3 py-2.5 rounded bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] text-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-secondary)] focus:ring-1 focus:ring-[var(--color-secondary)] transition-all">
              <option value="">Custom Coordinates</option>
              {allVillages.map(v => <option key={v._id || v.id} value={v._id || v.id}>{v.name} — {v.state}</option>)}
            </select>
          </div>
          
          {!selectedId && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-[var(--color-on-surface-variant)] font-bold uppercase tracking-wider mb-2 block">Latitude</label>
                <input type="number" step="0.0001" value={customLat} onChange={e => setCustomLat(e.target.value)} placeholder="e.g. 26.92"
                  className="w-full px-3 py-2.5 rounded bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] text-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-secondary)] focus:ring-1 focus:ring-[var(--color-secondary)] transition-all" />
              </div>
              <div>
                <label className="text-[10px] text-[var(--color-on-surface-variant)] font-bold uppercase tracking-wider mb-2 block">Longitude</label>
                <input type="number" step="0.0001" value={customLon} onChange={e => setCustomLon(e.target.value)} placeholder="e.g. 70.91"
                  className="w-full px-3 py-2.5 rounded bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] text-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-secondary)] focus:ring-1 focus:ring-[var(--color-secondary)] transition-all" />
              </div>
            </div>
          )}
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] text-[var(--color-on-surface-variant)] font-bold uppercase tracking-wider block">Time Horizon</label>
              <span className="text-xs font-mono font-bold text-[var(--color-secondary)]">{days} DAYS</span>
            </div>
            <input type="range" min={7} max={90} value={days} onChange={e => setDays(parseInt(e.target.value))} className="w-full accent-[var(--color-secondary)]" />
          </div>

          <div className="space-y-4 pt-4 border-t border-[var(--color-outline-variant)]">
            <div className="flex items-center gap-2 mb-2 border-b border-[var(--color-outline-variant)] pb-2">
              <Settings className="w-4 h-4 text-[var(--color-tertiary)]" />
              <h3 className="text-xs font-bold text-display uppercase tracking-wider text-[var(--color-on-surface)]">Weight Matrix</h3>
            </div>
            {Object.entries(weights).map(([key, val]) => (
              <div key={key} className="group">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--color-on-surface-variant)] uppercase tracking-wider text-[10px] font-bold">{key}</span>
                  <span className="font-mono font-bold text-[var(--color-on-surface)] group-hover:text-[var(--color-secondary)] transition-colors">{val}%</span>
                </div>
                <input type="range" min={0} max={100} value={val} onChange={e => adjustWeight(key, parseInt(e.target.value))} className="w-full accent-[var(--color-tertiary)] group-hover:accent-[var(--color-secondary)] transition-colors" />
              </div>
            ))}
          </div>

          <button onClick={calculate} disabled={loading || (!lat || !lon)}
            className="w-full py-3 mt-4 rounded text-sm font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-125 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)] relative overflow-hidden group"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-bg-base)' }}>
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-[var(--color-bg-base)] border-t-transparent rounded-full animate-spin"></div>}
              {loading ? 'SIMULATING...' : 'EXECUTE SIMULATION'}
            </span>
            <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:animate-shimmer"></div>
          </button>
        </div>

        {/* Result Panel */}
        <div className="card p-6 lg:col-span-3 flex flex-col items-center justify-center border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] min-h-[500px] relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-surface-container-high)_0%,_transparent_70%)] opacity-50 pointer-events-none"></div>
          
          <div className="absolute top-4 left-4 flex items-center gap-2 text-[var(--color-on-surface-variant)] opacity-50">
            <Activity className="w-4 h-4" />
            <span className="text-[10px] font-mono uppercase tracking-widest">Telemetry Output</span>
          </div>

          {result?.error ? (
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                <Settings className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-sm font-mono text-red-400">{result.error}</p>
            </div>
          ) : result ? (
            <div className="text-center space-y-8 animate-fade-in w-full max-w-md relative z-10">
              <div className="relative w-64 h-64 mx-auto">
                <svg width="256" height="256" viewBox="0 0 180 180" className="drop-shadow-2xl">
                  {/* Outer glow ring */}
                  <circle cx="90" cy="90" r="70" fill="none" stroke={result.level.color} strokeWidth="1" opacity="0.2" filter="blur(4px)" />
                  {/* Background track */}
                  <circle cx="90" cy="90" r="70" fill="none" stroke="var(--color-surface-container-highest)" strokeWidth="12" />
                  {/* Active track */}
                  <circle cx="90" cy="90" r="70" fill="none" stroke={result.level.color} strokeWidth="12"
                    strokeDasharray={circumference} strokeDashoffset={dashOffset}
                    strokeLinecap="round" transform="rotate(-90 90 90)"
                    style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                  
                  <text x="90" y="85" textAnchor="middle" fill="var(--color-on-surface)" fontSize="42" fontWeight="bold" fontFamily="var(--font-mono)">{result.score}</text>
                  <text x="90" y="110" textAnchor="middle" fill={result.level.color} fontSize="12" fontWeight="bold" className="uppercase tracking-widest">{result.level.label}</text>
                  <text x="90" y="125" textAnchor="middle" fill="var(--color-on-surface-variant)" fontSize="8" className="uppercase tracking-widest">RISK INDEX</text>
                </svg>
                {/* Center glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full pointer-events-none opacity-20" style={{ backgroundColor: result.level.color, filter: 'blur(30px)' }}></div>
              </div>

              <div className="grid grid-cols-3 gap-4 w-full">
                <MiniStat label="RAIN DEFICIT" value={`${result.rainfallDeficit}%`} color="var(--color-primary)" />
                <MiniStat label="GW DEPLETION" value={`${result.gwProxy}%`} color="var(--color-secondary)" />
                <MiniStat label="POP IMPACT" value={`${result.popGap}%`} color="var(--color-tertiary)" />
              </div>

              {result.metrics && (
                <div className="pt-4 border-t border-[var(--color-outline-variant)] flex justify-between items-center text-xs">
                  <div className="text-left">
                    <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-1">Total Precipitation</p>
                    <p className="font-mono font-bold text-[var(--color-on-surface)]">{result.metrics.totalPrecipitation} <span className="text-[10px] text-[var(--color-on-surface-variant)]">mm</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-1">Precipitation Events</p>
                    <p className="font-mono font-bold text-[var(--color-on-surface)]">{result.metrics.daysWithRain} <span className="text-[10px] text-[var(--color-on-surface-variant)] font-sans">/ {result.metrics.daysTotal} days</span></p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-[var(--color-surface-container-highest)] border border-[var(--color-outline-variant)] flex items-center justify-center mb-4">
                <Calculator className="w-8 h-8 text-[var(--color-on-surface-variant)] opacity-50" />
              </div>
              <p className="text-xs text-[var(--color-on-surface-variant)] uppercase tracking-widest max-w-[200px] leading-relaxed">
                Configure simulation parameters and execute to generate risk model
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="flex flex-col items-center p-3 rounded bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] relative overflow-hidden group">
      <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-50 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: color }}></div>
      <p className="text-[10px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-1 text-center w-full truncate">{label}</p>
      <p className="text-lg font-bold font-mono text-[var(--color-on-surface)]">{value}</p>
    </div>
  );
}
