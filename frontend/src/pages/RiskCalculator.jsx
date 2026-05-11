import React, { useState, useMemo, useEffect } from 'react';
import { useRankedVillages, useSeedingStatus } from '../hooks/useRiskData.js';
import { getRiskLevel } from '../utils/riskLevels.js';
import { 
  Calculator, 
  Info, 
  Search, 
  ArrowRight, 
  Droplets, 
  Waves, 
  Users, 
  TrendingUp, 
  ChevronRight,
  Filter,
  Download,
  AlertTriangle,
  History
} from 'lucide-react';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';

export default function RiskCalculator() {
  const { data: rankedData, isLoading } = useRankedVillages(1000);
  const { data: seedingStatus } = useSeedingStatus();
  
  const allVillages = rankedData?.data || [];
  
  // Local state for UI
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVillage, setSelectedVillage] = useState(null);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);
  const [activeWeights, setActiveWeights] = useState({ 
    rdi: 35, 
    cdd: 20, 
    sma: 30, 
    ppa: 10 
  });
  const [isSimulating, setIsSimulating] = useState(false);

  // Sorting & Filtering
  const filteredVillages = useMemo(() => {
    let list = [...allVillages];
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(v => 
        v.name.toLowerCase().includes(s) || 
        v.district?.toLowerCase().includes(s) || 
        v.state?.toLowerCase().includes(s)
      );
    }

    // If simulation is active, re-calculate and re-sort
    if (isSimulating) {
      list = list.map(v => {
        const snap = v.metricsSnapshot || {};
        const rdiScore = snap.rdiScore || 0;
        const cddScore = snap.cddScore || 0;
        const smaScore = snap.smaScore || 0;
        const ppaScore = snap.ppaScore || 0;
        const tam = snap.tamAdjustment || 0;

        // Apply custom weights
        const totalWeight = Object.values(activeWeights).reduce((a, b) => a + b, 0);
        let raw;
        
        if (smaScore === 0 && snap.missing) {
           // Redistribute SMA weight if missing (maritime)
           const factor = (totalWeight / (totalWeight - activeWeights.sma)) || 1;
           raw = (
            (rdiScore * activeWeights.rdi * factor) + 
            (cddScore * activeWeights.cdd * factor) + 
            (ppaScore * activeWeights.ppa * factor)
          ) / (totalWeight || 1);
        } else {
          raw = (
            (rdiScore * activeWeights.rdi) + 
            (cddScore * activeWeights.cdd) + 
            (smaScore * activeWeights.sma) + 
            (ppaScore * activeWeights.ppa)
          ) / (totalWeight || 1);
        }

        const adjusted = raw + tam;
        
        // Piecewise compression - Exact backend parity
        let final = adjusted;
        const x = Math.max(0, adjusted);
        if (x <= 20)  final = x * 1.20;
        else if (x <= 45)  final = 24 + (x - 20) * 1.04;
        else if (x <= 70)  final = 50 + (x - 45) * 0.80;
        else if (x <= 90)  final = 70 + (x - 70) * 1.30;
        else final = 96 + (x - 90) * 0.39;

        return { ...v, simulatedScore: Math.round(Math.min(99.9, final) * 10) / 10 };
      }).sort((a, b) => b.simulatedScore - a.simulatedScore);
    }

    return list;
  }, [allVillages, searchTerm, activeWeights, isSimulating]);

  // Set default selection
  useEffect(() => {
    if (allVillages.length > 0 && !selectedVillage) {
      setSelectedVillage(allVillages[0]);
    }
  }, [allVillages]);

  const handleWeightChange = (key, val) => {
    setIsSimulating(true);
    setActiveWeights(prev => ({ ...prev, [key]: parseInt(val) }));
  };

  const resetWeights = () => {
    setActiveWeights({ rdi: 35, cdd: 20, sma: 30, ppa: 10 });
    setIsSimulating(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.5s ease-out' }}>
      <DataSourceBanner dataSource={allVillages.length > 0 ? 'backend' : 'pending'} />

      <style>{`
        .risk-table { width: 100%; border-collapse: collapse; }
        .risk-table th { text-align: left; padding: 16px; color: var(--text-secondary); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--divider); }
        .risk-table td { padding: 16px; border-bottom: 1px solid var(--divider); vertical-align: middle; }
        .risk-row { transition: all 0.2s; cursor: pointer; }
        .risk-row:hover { background: rgba(255,255,255,0.03); transform: scale(1.002); }
        .risk-row.active { background: var(--nav-active-bg); border-left: 4px solid var(--accent-blue); }
        
        .metric-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
        
        .formula-card { border-left: 4px solid var(--accent-blue); }
        
        @keyframes slideInRight { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>

      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="title" style={{ fontSize: '32px', marginBottom: '8px' }}>Risk Logic & Transparency</h1>
          <p className="body-text" style={{ color: 'var(--text-secondary)', maxWidth: '600px' }}>
            A comprehensive audit of all {allVillages.length || 732} districts using our 5-pillar non-linear composite scoring engine.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="glass-btn" style={{ padding: '10px 20px', gap: '8px' }} onClick={() => setShowFormulaInfo(!showFormulaInfo)}>
            <Info size={18} /> {showFormulaInfo ? 'Close Math' : 'Explain Formula'}
          </button>
        </div>
      </div>

      {/* Formula Explanation Section (Collapsible) */}
      {showFormulaInfo && (
        <div className="glass-card" style={{ padding: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', border: '1px solid var(--accent-blue)40' }}>
          <FormulaPillar icon={<Droplets color="var(--accent-blue)" />} title="Rainfall Deficit (RDI)" weight="35%" desc="Compares current 30-day precip vs 10yr historical baseline for this month." />
          <FormulaPillar icon={<TrendingUp color="var(--accent-amber)" />} title="Dry Streak (CDD)" weight="20%" desc="Measures consecutive days <1mm rain and total dry frequency frequency." />
          <FormulaPillar icon={<Waves color="var(--accent-cyan)" />} title="Soil Anomaly (SMA)" weight="30%" desc="Deviation from expected soil moisture based on annual rainfall class." />
          <FormulaPillar icon={<Users color="#8b5cf6" />} title="Pop. Demand (PPA)" weight="10%" desc="Modeled water supply vs population demand (WHO 55L/day standard)." />
          <FormulaPillar icon={<History color="var(--accent-green)" />} title="Trend (TAM)" weight="±4pts" desc="Additive modifier based on 7-day risk trajectory (acceleration)." />
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* Main Audit List */}
        <div className="glass-card" style={{ flex: 1, padding: '0', overflow: 'hidden', minHeight: '700px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input 
                type="text" 
                placeholder="Search 732 districts by name, state, or district..." 
                className="glass-input" 
                style={{ width: '100%', paddingLeft: '48px', height: '48px' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="caption-text" style={{ color: 'var(--text-tertiary)' }}>SORTED BY RISK</span>
              <Filter size={16} color="var(--text-tertiary)" />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '700px' }}>
            <table className="risk-table">
              <thead>
                <tr>
                  <th>District / Location</th>
                  <th>Risk Index</th>
                  <th>Status</th>
                  <th>RDI</th>
                  <th>SMA</th>
                  <th>Pop Gap</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredVillages.map(v => {
                  const score = isSimulating ? v.simulatedScore : v.riskScore;
                  const level = getRiskLevel(score);
                  return (
                    <tr 
                      key={v._id} 
                      className={`risk-row ${selectedVillage?._id === v._id ? 'active' : ''}`}
                      onClick={() => setSelectedVillage(v)}
                    >
                      <td>
                        <div style={{ fontWeight: 600 }}>{v.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{v.district}, {v.state}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: level.color }}>{score}</div>
                      </td>
                      <td>
                        <div className="metric-pill" style={{ background: `${level.color}15`, color: level.color, border: `1px solid ${level.color}30` }}>
                          {level.label}
                        </div>
                      </td>
                      <td><MetricBar value={v.rainfallDeficit} color="var(--accent-blue)" /></td>
                      <td><MetricBar value={v.soilMoistureDepletion} color="var(--accent-cyan)" /></td>
                      <td><MetricBar value={v.populationDemandGap} color="#8b5cf6" /></td>
                      <td><ChevronRight size={18} color="var(--text-tertiary)" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.1)', borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="caption-text" style={{ color: 'var(--text-tertiary)' }}>SHOWING {filteredVillages.length} DISTRICTS</span>
            <button className="glass-btn" style={{ fontSize: '11px', padding: '6px 12px', gap: '6px' }}>
              <Download size={14} /> EXPORT DATA
            </button>
          </div>
        </div>

        {/* Calculation Detail Sidebar */}
        <div style={{ width: '400px', position: 'sticky', top: '0', display: 'flex', flexDirection: 'column', gap: '24px', animation: 'slideInRight 0.4s ease-out' }}>
          
          {selectedVillage ? (
            <>
              {/* Detail Card */}
              <div className="glass-card" style={{ padding: '32px' }}>
                <div style={{ marginBottom: '24px' }}>
                  <h3 className="section-header" style={{ fontSize: '20px' }}>{selectedVillage.name}</h3>
                  <p className="caption-text" style={{ color: 'var(--text-tertiary)' }}>{selectedVillage.state.toUpperCase()} • {selectedVillage.district.toUpperCase()}</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', position: 'relative' }}>
                  <div style={{ textAlign: 'center', zIndex: 2 }}>
                    <div style={{ fontSize: '64px', fontWeight: 900, lineHeight: 1, color: getRiskLevel(isSimulating ? selectedVillage.simulatedScore : selectedVillage.riskScore).color }}>
                      {isSimulating ? selectedVillage.simulatedScore : selectedVillage.riskScore}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '2px', color: 'var(--text-tertiary)', marginTop: '8px' }}>DR INDEX</div>
                  </div>
                  {/* Decorative background glow */}
                  <div style={{ position: 'absolute', width: '120px', height: '120px', borderRadius: '50%', background: getRiskLevel(isSimulating ? selectedVillage.simulatedScore : selectedVillage.riskScore).color, filter: 'blur(60px)', opacity: 0.15 }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
                  <h4 className="card-label" style={{ color: 'var(--text-tertiary)' }}>Logic Contribution</h4>
                  <ContributionRow label="RDI (Rainfall Deficit)" score={selectedVillage.metricsSnapshot?.rdiScore} weight={activeWeights.rdi} color="var(--accent-blue)" />
                  <ContributionRow label="CDD (Dry Streak)" score={selectedVillage.metricsSnapshot?.cddScore} weight={activeWeights.cdd} color="var(--accent-amber)" />
                  <ContributionRow label="SMA (Soil Anomaly)" score={selectedVillage.metricsSnapshot?.smaScore} weight={activeWeights.sma} color="var(--accent-cyan)" />
                  <ContributionRow label="PPA (Pop Demand)" score={selectedVillage.metricsSnapshot?.ppaScore} weight={activeWeights.ppa} color="#8b5cf6" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                    <span className="caption-text">Trend Adjustment (TAM)</span>
                    <span className="caption-text" style={{ color: selectedVillage.metricsSnapshot?.tamAdjustment >= 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                      {selectedVillage.metricsSnapshot?.tamAdjustment >= 0 ? '+' : ''}{selectedVillage.metricsSnapshot?.tamAdjustment || 0} pts
                    </span>
                  </div>
                </div>
              </div>

              {/* Weight Simulation Panel */}
              <div className="glass-card" style={{ padding: '24px', border: isSimulating ? '1px solid var(--accent-blue)60' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Calculator size={18} color="var(--accent-blue)" />
                    <h3 className="section-header" style={{ fontSize: '16px' }}>Weight Simulation</h3>
                  </div>
                  {isSimulating && (
                    <button className="caption-text" style={{ color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }} onClick={resetWeights}>
                      RESET
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <WeightControl label="Rainfall (RDI)" value={activeWeights.rdi} color="var(--accent-blue)" onChange={v => handleWeightChange('rdi', v)} />
                  <WeightControl label="Dry Streak (CDD)" value={activeWeights.cdd} color="var(--accent-amber)" onChange={v => handleWeightChange('cdd', v)} />
                  <WeightControl label="Groundwater (SMA)" value={activeWeights.sma} color="var(--accent-cyan)" onChange={v => handleWeightChange('sma', v)} />
                  <WeightControl label="Population (PPA)" value={activeWeights.ppa} color="#8b5cf6" onChange={v => handleWeightChange('ppa', v)} />
                </div>

                {isSimulating && (
                  <div style={{ marginTop: '20px', padding: '12px', borderRadius: '10px', background: 'var(--accent-blue)10', border: '1px solid var(--accent-blue)20', display: 'flex', gap: '12px' }}>
                    <AlertTriangle size={18} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Simulation active. All 732 districts re-ranked based on your custom weight matrix.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
              <Search size={48} color="var(--text-tertiary)" style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p className="body-text" style={{ color: 'var(--text-secondary)' }}>Select a district to see the detailed math breakdown.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function FormulaPillar({ icon, title, weight, desc }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {icon}
        <span className="card-label" style={{ color: 'var(--text-primary)' }}>{title}</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', background: 'var(--glass-bg)', padding: '2px 6px', borderRadius: '4px' }}>{weight}</span>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</p>
    </div>
  );
}

function MetricBar({ value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', minWidth: '60px' }}>
        <div style={{ width: `${Math.min(100, value || 0)}%`, height: '100%', background: color, borderRadius: '2px' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 700, width: '30px' }}>{Math.round(value || 0)}</span>
    </div>
  );
}

function ContributionRow({ label, score, weight, color }) {
  const contrib = Math.round((score || 0) * (weight / 100) * 10) / 10;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span className="caption-text" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>RAW: {Math.round(score || 0)} × {weight}%</span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color }}>+{contrib}</span>
        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block' }}>PTS</span>
      </div>
    </div>
  );
}

function WeightControl({ label, value, color, onChange }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span className="caption-text" style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: 800, color }}>{value}%</span>
      </div>
      <input 
        type="range" 
        min={0} max={100} 
        value={value} 
        onChange={e => onChange(e.target.value)}
        style={{ 
          width: '100%', 
          height: '4px', 
          appearance: 'none', 
          background: `linear-gradient(to right, ${color} ${value}%, rgba(255,255,255,0.05) ${value}%)`,
          borderRadius: '2px',
          outline: 'none'
        }}
      />
    </div>
  );
}
