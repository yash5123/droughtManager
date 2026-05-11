import React, { useState, useMemo, useEffect } from 'react';
import { useRankedVillages, useSeedingStatus } from '../hooks/useRiskData.js';
import api from '../services/api.js';
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
  History,
  RefreshCw,
  CheckCircle,
  Clock
} from 'lucide-react';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';

export default function RiskCalculator() {
  const { data: rankedData, isLoading, refetch } = useRankedVillages(1000);
  const { data: seedingStatus } = useSeedingStatus();
  
  const allVillages = rankedData?.data || [];
  
  // Local state for UI
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVillage, setSelectedVillage] = useState(null);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc'); 
  const [riskFilter, setRiskFilter] = useState('All');
  const [limitFilter, setLimitFilter] = useState('All');
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Resolve audit data: prefer live detail API, fall back to ranked metricsSnapshot
  const audit = detailData?.liveAudit || selectedVillage?.metricsSnapshot || {};
  const auditScore = detailData?.liveScore ?? selectedVillage?.riskScore ?? 0;

  useEffect(() => {
    if (!selectedVillage?._id) return;

    setDetailData(null);
    setDetailLoading(true);

    api.get(`/villages/${selectedVillage._id}/detail`)
      .then(res => {
        setDetailData(res.data);
      })
      .catch(err => {
        console.error('Detail fetch failed:', err);
        setDetailData(null);
      })
      .finally(() => {
        setDetailLoading(false);
      });

  }, [selectedVillage?._id]);


  // Official Weights (For display only)
  const activeWeights = { 
    rdi: 35, 
    cdd: 20, 
    sma: 30, 
    ppa: 10 
  };

  // Sorting & Filtering
  const filteredVillages = useMemo(() => {
    let list = [...allVillages];

    // 1. Search Filter
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(v => 
        v.name.toLowerCase().includes(s) || 
        v.district?.toLowerCase().includes(s) || 
        v.state?.toLowerCase().includes(s)
      );
    }

    // 2. Risk Level Filter
    if (riskFilter !== 'All') {
      list = list.filter(v => getRiskLevel(v.riskScore).label === riskFilter);
    }

    // 3. Sorting (Always sort before limiting)
    list.sort((a, b) => {
      const scoreA = a.riskScore || 0;
      const scoreB = b.riskScore || 0;
      return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
    });

    // 4. Limit Filter
    if (limitFilter !== 'All') {
      list = list.slice(0, parseInt(limitFilter));
    }

    return list;
  }, [allVillages, searchTerm, sortOrder, riskFilter, limitFilter]);

  // Set default selection
  useEffect(() => {
    if (filteredVillages.length > 0 && !selectedVillage) {
      setSelectedVillage(filteredVillages[0]);
    }
  }, [filteredVillages, selectedVillage]);

  const toggleSort = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
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
          <div style={{ padding: '28px', borderBottom: '1px solid var(--divider)', display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', gap: '4px', backdropFilter: 'blur(10px)' }}>
                  {['All', 'Extreme', 'Severe', 'Normal'].map(label => (
                    <button 
                      key={label}
                      onClick={() => setRiskFilter(label)}
                      style={{ 
                        padding: '10px 18px', 
                        borderRadius: '10px', 
                        border: 'none', 
                        background: riskFilter === label ? 'var(--accent-blue)' : 'transparent',
                        color: riskFilter === label ? '#fff' : 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        minWidth: '90px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '4px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="caption-text" style={{ color: 'var(--text-tertiary)', fontSize: '10px', fontWeight: 800 }}>SHOW</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['10', '25', 'All'].map(limit => (
                      <button 
                        key={limit}
                        onClick={() => setLimitFilter(limit)}
                        style={{ 
                          padding: '6px 12px', 
                          borderRadius: '8px', 
                          border: 'none', 
                          background: limitFilter === limit ? 'rgba(255,255,255,0.1)' : 'transparent',
                          color: limitFilter === limit ? 'var(--accent-blue)' : 'var(--text-secondary)',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {limit}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexGrow: 1, maxWidth: '500px' }}>
                <div style={{ position: 'relative', flexGrow: 1 }}>
                  <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} size={18} />
                  <input 
                    type="text" 
                    placeholder="Search by district or state..." 
                    className="glass-input"
                    style={{ 
                      paddingLeft: '48px', 
                      width: '100%', 
                      height: '48px', 
                      fontSize: '14px', 
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'var(--text-primary)'
                    }}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <button 
                  onClick={toggleSort}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    cursor: 'pointer', 
                    padding: '0 20px', 
                    borderRadius: '12px', 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    color: 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '12px'
                  }}
                >
                  <Filter size={16} color="var(--accent-blue)" style={{ transform: sortOrder === 'asc' ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                  {sortOrder === 'desc' ? 'HIGHEST RISK' : 'LOWEST RISK'}
                </button>
              </div>
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
                  <th>CDD</th>
                  <th>SMA</th>
                  <th>Pop Gap</th>
                  <th>Trend</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredVillages.map(v => {
                  const score = v.riskScore || 0;
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
                        <div style={{ fontSize: '18px', fontWeight: 800, color: level.color }}>{score.toFixed(1)}</div>
                      </td>
                      <td>
                        <div className="metric-pill" style={{ background: `${level.color}15`, color: level.color, border: `1px solid ${level.color}30` }}>
                          {v.riskLevel?.toUpperCase() || level.label}
                        </div>
                      </td>
                      <td><MetricBar value={v.metricsSnapshot?.rdiScore ?? v.rainfallDeficit} color="var(--accent-blue)" /></td>
                      <td><MetricBar value={v.metricsSnapshot?.cddScore ?? 0} color="var(--accent-amber)" /></td>
                      <td><MetricBar value={v.metricsSnapshot?.smaScore ?? v.soilMoistureDepletion} color="var(--accent-cyan)" /></td>
                      <td><MetricBar value={v.metricsSnapshot?.ppaScore ?? v.populationDemandGap} color="#8b5cf6" /></td>
                      <td><MetricBar value={v.metricsSnapshot?.tamAdjustment ?? 0} color="var(--accent-green)" /></td>
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
                    <div style={{ fontSize: '64px', fontWeight: 900, lineHeight: 1, color: getRiskLevel(selectedVillage.riskScore).color }}>
                      {(selectedVillage.riskScore || 0).toFixed(1)}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '2px', color: 'var(--text-tertiary)', marginTop: '8px' }}>DR INDEX</div>
                  </div>
                  {/* Decorative background glow */}
                  <div style={{ position: 'absolute', width: '120px', height: '120px', borderRadius: '50%', background: getRiskLevel(selectedVillage.riskScore).color, filter: 'blur(60px)', opacity: 0.15 }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '32px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* CALCULATION BREAKDOWN PANEL — uses `audit` which falls back to metricsSnapshot */}
                    <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--glass-bg)', border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow-elevated)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, var(--accent-cyan), transparent)' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--divider)', paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calculator size={16} color="var(--accent-cyan)" />
                          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', color: 'var(--text-secondary)' }}>
                            {detailData ? 'LIVE CALCULATION BREAKDOWN' : 'CACHED CALCULATION BREAKDOWN'}
                          </span>
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                          {audit.calculatedAt ? new Date(audit.calculatedAt).toLocaleTimeString() : ''}
                        </span>
                      </div>

                      {detailLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', gap: '12px' }}>
                          <RefreshCw size={16} color="var(--accent-cyan)" style={{ animation: 'spin 1s linear infinite' }} />
                          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Calculating live score...</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {/* Step 1: Pillar Scores */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* RDI Pillar */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>RDI (Rainfall)</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', background: 'var(--nav-hover-bg)', padding: '1px 6px', borderRadius: '4px' }}>
                                    RAW: {(audit.rdiScore ?? 0).toFixed(1)} × 35%
                                  </span>
                                  {audit.actualPrecipitation != null && (
                                    <span style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: 700 }}>
                                      • {audit.actualPrecipitation.toFixed(1)}mm vs {audit.historicalMonthlyAvg?.toFixed(1)}mm avg
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-blue)' }}>+{(audit.rdiWeighted ?? (audit.rdiScore ?? 0) * 0.35).toFixed(2)}</span>
                                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginTop: '-2px' }}>PTS</span>
                              </div>
                            </div>

                            {/* CDD Pillar */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>CDD (Dryness)</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', background: 'var(--nav-hover-bg)', padding: '1px 6px', borderRadius: '4px' }}>
                                    RAW: {(audit.cddScore ?? 0).toFixed(1)} × 20%
                                  </span>
                                  {audit.maxDryStreak != null && (
                                    <span style={{ fontSize: '10px', color: 'var(--accent-amber)', fontWeight: 700 }}>
                                      • {audit.maxDryStreak} day streak
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-amber)' }}>+{(audit.cddWeighted ?? (audit.cddScore ?? 0) * 0.20).toFixed(2)}</span>
                                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginTop: '-2px' }}>PTS</span>
                              </div>
                            </div>

                            {/* SMA Pillar */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>SMA (Soil)</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {audit.smaWasMissing ? (
                                    <span style={{ fontSize: '10px', color: 'var(--accent-amber)', fontStyle: 'italic' }}>Missing satellite data</span>
                                  ) : (
                                    <>
                                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', background: 'var(--nav-hover-bg)', padding: '1px 6px', borderRadius: '4px' }}>
                                        RAW: {(audit.smaScore ?? 0).toFixed(1)} × 30%
                                      </span>
                                      {audit.soilMoistureFrac != null && (
                                        <span style={{ fontSize: '10px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                                          • {(audit.soilMoistureFrac * 100).toFixed(1)}% moisture
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '15px', fontWeight: 800, color: audit.smaWasMissing ? 'var(--text-tertiary)' : 'var(--accent-cyan)' }}>
                                  {audit.smaWasMissing ? '---' : `+${(audit.smaWeighted ?? (audit.smaScore ?? 0) * 0.30).toFixed(2)}`}
                                </span>
                                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginTop: '-2px' }}>PTS</span>
                              </div>
                            </div>

                            {/* PPA Pillar */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>PPA (Demand)</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', background: 'var(--nav-hover-bg)', padding: '1px 6px', borderRadius: '4px' }}>
                                    RAW: {(audit.ppaScore ?? 0).toFixed(1)} × 10%
                                  </span>
                                  {audit.demandLitersPerDay != null && (
                                    <span style={{ fontSize: '10px', color: '#8b5cf6', fontWeight: 700 }}>
                                      • {(audit.demandLitersPerDay / 1000).toFixed(0)}k L/day gap
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '15px', fontWeight: 800, color: '#8b5cf6' }}>+{(audit.ppaWeighted ?? (audit.ppaScore ?? 0) * 0.10).toFixed(2)}</span>
                                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginTop: '-2px' }}>PTS</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ height: '1px', background: 'var(--divider)', margin: '4px 0' }} />

                          {/* Step 2: Composite Assembly */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Raw Weighted Sum</span>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>= {(audit.rawComposite ?? 0).toFixed(3)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>TAM Adjustment (7-day trend)</span>
                              <span style={{ fontWeight: 600, color: (audit.tamAdjustment ?? 0) >= 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                                {(audit.tamAdjustment ?? 0) >= 0 ? '+' : ''}{(audit.tamAdjustment ?? 0).toFixed(3)}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                              <span style={{ color: 'var(--text-primary)' }}>Adjusted Composite</span>
                              <span style={{ color: 'var(--text-primary)' }}>= {(audit.adjustedComposite ?? 0).toFixed(3)}</span>
                            </div>
                          </div>

                          <div style={{ height: '1px', background: 'var(--divider)', margin: '4px 0' }} />

                          {/* Step 3: Compression (the missing step!) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                              Non-linear compression: {audit.compressionBand || 'N/A'}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>{(audit.adjustedComposite ?? 0).toFixed(1)} → compressed →</span>
                              <span style={{ fontWeight: 800, fontSize: '14px', color: getRiskLevel(auditScore).color }}>
                                {auditScore.toFixed(1)}
                              </span>
                            </div>
                          </div>

                          <div style={{ height: '1px', background: 'var(--divider)', margin: '4px 0' }} />

                          {/* Step 4: Final Risk Index */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>FINAL RISK INDEX</span>
                            <span style={{ fontSize: '24px', fontWeight: 900, color: getRiskLevel(auditScore).color }}>
                              {auditScore.toFixed(1)}
                            </span>
                          </div>

                          {/* Validation Row — only when live detail data is available */}
                          {detailData?.cachedScore != null && detailData?.liveScore != null && (
                            <div style={{ 
                              marginTop: '8px', 
                              padding: '8px', 
                              borderRadius: '8px', 
                              background: Math.abs(detailData.liveScore - detailData.cachedScore) < 0.5 ? 'var(--risk-normal-tint)' : 'var(--risk-severe-tint)',
                              border: `1px solid var(--divider)`,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '11px'
                            }}>
                              {Math.abs(detailData.liveScore - detailData.cachedScore) < 0.5 ? (
                                <>
                                  <CheckCircle size={14} color="var(--accent-green)" />
                                  <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>Matches nightly cached score</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle size={14} color="var(--accent-amber)" />
                                  <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>
                                    Live ({detailData.liveScore?.toFixed(1)}) differs from cached ({detailData.cachedScore?.toFixed(1)}). Cache updates nightly.
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Audit Export */}
                <div style={{ marginTop: '24px' }}>
                  <button style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--divider)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Download size={18} /> DOWNLOAD CALCULATION PROOF (PDF)
                  </button>
                </div>
              </div>

              {/* Weights */}
              <div className="glass-card" style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-blue)15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Calculator size={18} color="var(--accent-blue)" />
                    </div>
                    <h3 className="section-header" style={{ fontSize: '16px', margin: 0 }}>Regional Parameters</h3>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <StaticWeight label="Rainfall Intensity" value={activeWeights.rdi} color="var(--accent-blue)" icon={<Droplets size={14} />} />
                  <StaticWeight label="Dryness Severity" value={activeWeights.cdd} color="var(--accent-amber)" icon={<TrendingUp size={14} />} />
                  <StaticWeight label="Groundwater Health" value={activeWeights.sma} color="var(--accent-cyan)" icon={<Waves size={14} />} />
                  <StaticWeight label="Socio-Economic Demand" value={activeWeights.ppa} color="#8b5cf6" icon={<Users size={14} />} />
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
              <Search size={48} color="var(--text-tertiary)" style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p className="body-text" style={{ color: 'var(--text-secondary)' }}>Select a district to see the detailed math breakdown.</p>
            </div>
          )}
        </div>
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>

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
      <div style={{ flex: 1, height: '4px', background: 'var(--divider)', borderRadius: '2px', overflow: 'hidden', minWidth: '60px' }}>
        <div style={{ width: `${Math.min(100, value || 0)}%`, height: '100%', background: color, borderRadius: '2px' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 700, width: '35px', color: 'var(--text-secondary)' }}>{(value || 0).toFixed(1)}</span>
    </div>
  );
}


function StaticWeight({ label, value, color, icon }) {
  return (
    <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--glass-bg)', border: 'var(--glass-border)', transition: 'transform 0.2s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ color }}>{icon}</div>
          <span className="caption-text" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
        </div>
        <span style={{ fontSize: '13px', fontWeight: 800, color }}>{value}%</span>
      </div>
      <div style={{ width: '100%', height: '6px', background: 'var(--divider)', borderRadius: '3px', overflow: 'hidden' }}>
        <div 
          style={{ 
            width: `${value}%`, 
            height: '100%', 
            background: `linear-gradient(90deg, ${color}aa, ${color})`, 
            borderRadius: '3px', 
            boxShadow: `0 0 12px ${color}30` 
          }} 
        />
      </div>
    </div>
  );
}
