import React, { useState, useMemo } from 'react';
import { useVillageData } from '../context/VillageDataContext.jsx';
import { useRankedVillages, useSeedingStatus } from '../hooks/useRiskData.js';
import { getRiskLevel } from '../utils/riskLevels.js';
import { fetchHistoricalWeather, computeLocalRiskMetrics } from '../services/weatherService.js';
import { Settings, MapPin, Activity, Calculator, ChevronDown, Loader2 } from 'lucide-react';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';

export default function RiskCalculator() {
  const { data: rankedData } = useRankedVillages(1000);
  const { data: seedingStatus } = useSeedingStatus();
  
  const allVillages = rankedData?.data || [];

  let dataSource = 'pending';
  if (seedingStatus?.inProgress) dataSource = 'seeding';
  else if (allVillages.length > 0) dataSource = rankedData?.meta?.isStale ? 'stale' : 'backend';
  else if (seedingStatus?.phase === 'complete' && allVillages.length === 0) dataSource = 'stale';
  else if (seedingStatus) dataSource = 'seeding';
  
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
  const weightSum = Object.values(weights).reduce((s, v) => s + v, 0);

  const recommendations = [
    { maxScore: 24, text: 'Low risk. Maintain monitoring frequency and prepare seasonal contingency plans.' },
    { maxScore: 49, text: 'Moderate risk. Increase water hauling frequency and activate conservation advisories.' },
    { maxScore: 69, text: 'Severe drought conditions. Deploy tanker fleet and issue public rationing directives.' },
    { maxScore: 100, text: 'Extreme emergency. Immediate state-level intervention required. Activate disaster relief protocol.' },
  ];
  const recommendation = result?.score != null ? recommendations.find(r => result.score <= r.maxScore)?.text : null;

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <DataSourceBanner dataSource={dataSource} />

      <style>{`
        .glass-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 3px;
          outline: none;
          transition: background 0.2s;
        }
        .glass-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          transition: all 0.2s;
        }
        .slider-blue::-webkit-slider-thumb { border: 2px solid var(--accent-blue); box-shadow: 0 0 10px var(--accent-blue); }
        .slider-amber::-webkit-slider-thumb { border: 2px solid var(--accent-amber); box-shadow: 0 0 10px var(--accent-amber); }
        .slider-cyan::-webkit-slider-thumb { border: 2px solid var(--accent-cyan); box-shadow: 0 0 10px var(--accent-cyan); }
        .slider-purple::-webkit-slider-thumb { border: 2px solid #8b5cf6; box-shadow: 0 0 10px #8b5cf6; }
      `}</style>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* Left Panel: Inputs */}
        <div className="glass-card" style={{ flex: '1 1 60%', padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calculator size={28} style={{ color: 'var(--accent-blue)', filter: 'drop-shadow(var(--accent-blue-glow))' }} />
            <div>
              <h2 className="title" style={{ fontSize: '24px' }}>Scenario Risk Simulator</h2>
              <p className="body-text" style={{ color: 'var(--text-secondary)' }}>Predictive Vulnerability Engine</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <MapPin size={18} style={{ color: 'var(--text-tertiary)' }} />
                <h3 className="section-header">Location Parameters</h3>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label className="card-label" style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Target Region</label>
                <div style={{ position: 'relative' }}>
                  <select 
                    value={selectedId} 
                    onChange={e => { setSelectedId(e.target.value); setCustomLat(''); setCustomLon(''); }}
                    className="glass-input"
                    style={{ width: '100%', appearance: 'none', paddingRight: '40px', fontSize: '14px', background: 'var(--glass-bg)', color: 'var(--text-primary)' }}
                  >
                    <option value="" style={{ background: '#1a1a1a', color: '#fff' }}>Custom Coordinates</option>
                    {allVillages.map(v => <option key={v._id || v.id} value={v._id || v.id} style={{ background: '#1a1a1a', color: '#fff' }}>{v.name} — {v.state}</option>)}
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Lat/Lon always visible — read-only when village selected, editable for custom */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="card-label" style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Latitude</label>
                  <input type="number" step="0.0001" value={customLat || (selectedVillage?.location?.lat ?? '')} onChange={e => { if (!selectedVillage) setCustomLat(e.target.value); }}
                    placeholder="e.g. 26.92" readOnly={!!selectedVillage}
                    className="glass-input" style={{ width: '100%', fontSize: '14px', background: 'var(--glass-bg)', opacity: selectedVillage ? 0.7 : 1 }} />
                </div>
                <div>
                  <label className="card-label" style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Longitude</label>
                  <input type="number" step="0.0001" value={customLon || (selectedVillage?.location?.lng ?? '')} onChange={e => { if (!selectedVillage) setCustomLon(e.target.value); }}
                    placeholder="e.g. 70.91" readOnly={!!selectedVillage}
                    className="glass-input" style={{ width: '100%', fontSize: '14px', background: 'var(--glass-bg)', opacity: selectedVillage ? 0.7 : 1 }} />
                </div>
              </div>
            </div>

            <div style={{ height: '1px', background: 'var(--divider)' }} />

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <label className="section-header">Time Horizon</label>
                <span className="data-value" style={{ fontSize: '16px', color: 'var(--accent-blue)' }}>{days} DAYS</span>
              </div>
              <input type="range" min={7} max={90} value={days} onChange={e => setDays(parseInt(e.target.value))} 
                className="glass-slider slider-blue" 
                style={{ background: `linear-gradient(to right, var(--accent-blue) ${(days-7)/(90-7)*100}%, var(--glass-border) ${(days-7)/(90-7)*100}%)` }} 
              />
            </div>

            <div style={{ height: '1px', background: 'var(--divider)' }} />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <Settings size={18} style={{ color: 'var(--text-tertiary)' }} />
                <h3 className="section-header">Weight Matrix</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {Object.entries(weights).map(([key, val]) => {
                  let color = 'var(--accent-amber)';
                  let sClass = 'slider-amber';
                  if(key === 'groundwater') { color = 'var(--accent-cyan)'; sClass = 'slider-cyan'; }
                  if(key === 'population') { color = '#8b5cf6'; sClass = 'slider-purple'; }

                  return (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span className="card-label" style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{key}</span>
                        <span className="data-value" style={{ fontSize: '14px', color }}>{val}%</span>
                      </div>
                      <input type="range" min={0} max={100} value={val} onChange={e => adjustWeight(key, parseInt(e.target.value))} 
                        className={`glass-slider ${sClass}`}
                        style={{ background: `linear-gradient(to right, ${color} ${val}%, var(--glass-border) ${val}%)` }} 
                      />
                    </div>
                  );
                })}
                {/* Weight Sum Indicator */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: weightSum === 100 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${weightSum === 100 ? 'var(--accent-green)' : 'var(--accent-red)'}30`, transition: 'all 0.3s' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Weight Total</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: weightSum === 100 ? 'var(--accent-green)' : 'var(--accent-red)', fontFamily: 'monospace' }}>{weightSum}%</span>
                </div>
              </div>
            </div>

            <button 
              className="primary-btn"
              onClick={calculate} 
              disabled={loading || (!lat || !lon)}
              style={{
                width: '100%', height: '52px', marginTop: '16px',
                background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
                fontSize: '15px', letterSpacing: '1px'
              }}
            >
              {loading ? <Loader2 size={20} className="spinning" /> : 'EXECUTE SIMULATION'}
            </button>
          </div>
        </div>

        {/* Right Panel: Output */}
        <div className="glass-card" style={{ flex: '1 1 40%', padding: '32px', display: 'flex', flexDirection: 'column', minHeight: '600px', position: 'relative', overflow: 'hidden' }}>
          
          {/* Subtle tech background line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, var(--accent-blue), transparent)', opacity: 0.3 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <Activity size={24} style={{ color: 'var(--accent-green)', filter: 'drop-shadow(var(--accent-green-glow))' }} />
            <h2 className="title" style={{ fontSize: '20px' }}>Telemetry Output</h2>
          </div>

          {result?.error ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <Settings size={48} style={{ color: 'var(--accent-red)', marginBottom: '16px', opacity: 0.8 }} />
              <p className="body-text" style={{ color: 'var(--text-secondary)' }}>{result.error}</p>
            </div>
          ) : result ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '240px', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px' }}>
                <svg width="240" height="240" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
                  {/* Glow */}
                  <circle cx="90" cy="90" r="70" fill="none" stroke={result.level.color} strokeWidth="2" opacity="0.4" filter="blur(6px)" />
                  {/* Track */}
                  <circle cx="90" cy="90" r="70" fill="none" stroke="var(--glass-border)" strokeWidth="12" />
                  {/* Progress */}
                  <circle cx="90" cy="90" r="70" fill="none" stroke={result.level.color} strokeWidth="12"
                    strokeDasharray={circumference} strokeDashoffset={dashOffset}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
                </svg>
                
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="data-value" style={{ fontSize: '48px', color: 'var(--text-primary)', filter: `drop-shadow(0 0 12px ${result.level.color}80)`, lineHeight: 1 }}>{result.score}</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: result.level.color, marginTop: '4px', letterSpacing: '1px' }}>{result.level.label.toUpperCase()}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '2px', marginTop: '4px' }}>RISK INDEX</span>
                </div>
              </div>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <MiniStat label="RAIN DEFICIT" value={`${result.rainfallDeficit}%`} color="var(--accent-blue)" />
                <MiniStat label="GW DEPLETION" value={`${result.gwProxy}%`} color="var(--accent-cyan)" />
                <MiniStat label="POP IMPACT" value={`${result.popGap}%`} color="#8b5cf6" />
              </div>

              {result.metrics && (
                <div style={{ width: '100%', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--divider)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <p className="card-label" style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Precipitation</p>
                    <p className="data-value" style={{ fontSize: '18px' }}>{result.metrics.totalPrecipitation} <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>mm</span></p>
                  </div>
                  <div>
                    <p className="card-label" style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Rain Events</p>
                    <p className="data-value" style={{ fontSize: '18px' }}>{result.metrics.daysWithRain} <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>/ {result.metrics.daysTotal}d</span></p>
                  </div>
                </div>
              )}

              {recommendation && (
                <div style={{ width: '100%', marginTop: '20px', padding: '14px 16px', borderRadius: '12px', background: `${result.level.color}12`, border: `1px solid ${result.level.color}30` }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: result.level.color, marginBottom: '6px' }}>Recommended Action</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{recommendation}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <Calculator size={56} style={{ color: 'var(--text-tertiary)', marginBottom: '24px', opacity: 0.5 }} />
              <p className="body-text" style={{ color: 'var(--text-secondary)', maxWidth: '240px', lineHeight: 1.6 }}>
                Configure simulation parameters and execute to generate predictive risk model.
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
    <div className="glass-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '4px', height: '16px', borderRadius: '2px', background: color, boxShadow: `0 0 6px ${color}` }} />
        <span className="card-label" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <span className="data-value" style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}
