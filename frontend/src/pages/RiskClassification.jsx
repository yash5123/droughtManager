import React, { useState, useMemo } from 'react';
import { Search, Info, Filter, Activity, AlertTriangle, Droplets, ShieldAlert } from 'lucide-react';
import { useVillageData } from '../context/VillageDataContext.jsx';
import { useRankedVillages, useSeedingStatus } from '../hooks/useRiskData.js';
import { useCountUp } from '../hooks/useCountUp.js';
import RiskBadge from '../components/ui/RiskBadge.jsx';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';
import { RISK_LEVELS, getRiskLevel } from '../utils/riskLevels.js';
import { formatNumber } from '../utils/formatters.js';

function CountCard({ label, count, accentColor, tintColor, icon: Icon }) {
  const val = useCountUp(count, 800);
  return (
    <div className="glass-card" style={{ padding: '24px', backgroundColor: tintColor, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <Icon size={20} style={{ color: accentColor, filter: `drop-shadow(0 0 12px ${accentColor})` }} />
      </div>
      <div>
        <div className="card-label" style={{ color: 'var(--text-secondary)' }}>{label}</div>
        <div className="data-value" style={{ color: 'var(--text-primary)', marginTop: '4px' }}>{val}</div>
      </div>
      <Icon size={80} style={{ position: 'absolute', bottom: '-10px', right: '-10px', color: accentColor, opacity: 0.08 }} />
    </div>
  );
}

export default function RiskClassification() {
  const { data: rankedData } = useRankedVillages(1000);
  const { data: seedingStatus } = useSeedingStatus();
  
  const riskData = rankedData?.data || [];
  let dataSource = 'pending';
  if (seedingStatus?.inProgress) dataSource = 'seeding';
  else if (riskData.length > 0) dataSource = rankedData?.meta?.isStale ? 'stale' : 'backend';
  else if (seedingStatus?.phase === 'complete' && riskData.length === 0) dataSource = 'stale';
  else if (seedingStatus) dataSource = 'seeding';

  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [sortField, setSortField] = useState('riskScore');
  const [sortDir, setSortDir] = useState('desc');

  const counts = useMemo(() => ({
    Extreme: riskData.filter(v => v.riskScore >= 76).length,
    Severe: riskData.filter(v => v.riskScore >= 51 && v.riskScore < 76).length,
    Moderate: riskData.filter(v => v.riskScore >= 26 && v.riskScore < 51).length,
    Normal: riskData.filter(v => v.riskScore < 26).length,
  }), [riskData]);

  const filtered = useMemo(() => {
    let list = [...riskData];
    if (search) list = list.filter(v => v.name?.toLowerCase().includes(search.toLowerCase()) || (v.state||v.region)?.toLowerCase().includes(search.toLowerCase()));
    if (filterLevel !== 'all') list = list.filter(v => getRiskLevel(v.riskScore).label.toLowerCase() === filterLevel.toLowerCase());
    list.sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      
      // Special handling for Status sorting
      if (sortField === 'riskLevel') {
        const getRank = (score) => {
          if (score >= 76) return 4;
          if (score >= 51) return 3;
          if (score >= 26) return 2;
          return 1;
        };
        av = getRank(a.riskScore);
        bv = getRank(b.riskScore);
      } else if (sortField === '_demand') {
        const getDemand = (v) => {
          const pop = (v.population && v.population > 0) ? v.population : 50000;
          return Math.round(pop * 55 / 1000);
        };
        av = getDemand(a);
        bv = getDemand(b);
      } else {
        av = av ?? 0;
        bv = bv ?? 0;
      }

      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return list;
  }, [riskData, search, filterLevel, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <DataSourceBanner dataSource={dataSource} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ShieldAlert size={28} style={{ color: 'var(--accent-blue)', filter: 'drop-shadow(var(--accent-blue-glow))' }} />
        <div>
          <h2 className="title">Risk Classification Grid</h2>
          <p className="body-text" style={{ color: 'var(--text-secondary)' }}>Algorithmic Severity Assessment</p>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <CountCard label="Extreme Risk" count={counts.Extreme} accentColor="var(--accent-red)" tintColor="var(--risk-extreme-tint)" icon={AlertTriangle} />
        <CountCard label="Severe Risk" count={counts.Severe} accentColor="var(--accent-amber)" tintColor="var(--risk-severe-tint)" icon={Activity} />
        <CountCard label="Moderate Risk" count={counts.Moderate} accentColor="#eab308" tintColor="var(--risk-moderate-tint)" icon={Droplets} />
        <CountCard label="Normal" count={counts.Normal} accentColor="var(--accent-green)" tintColor="var(--risk-normal-tint)" icon={ShieldAlert} />
      </div>

      {/* Main Layout */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        
          {/* Main Layout Content */}
          <div className="glass-card" style={{ flex: '1', display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden' }}>
            
            {/* Controls Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', zIndex: 20 }}>
              <div style={{ position: 'relative', width: '300px' }}>
                <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input 
                  type="text" 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  placeholder="Query regions..."
                  className="glass-input"
                  style={{ width: '100%', padding: '12px 16px 12px 40px', fontSize: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--divider)' }}
                />
              </div>
              
              <div className="glass-pill" style={{ display: 'flex', padding: '4px', background: 'rgba(255,255,255,0.03)' }}>
                <button onClick={() => setFilterLevel('all')}
                  style={{
                    padding: '6px 16px', borderRadius: '9999px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700,
                    background: filterLevel === 'all' ? 'var(--accent-blue)' : 'transparent',
                    color: filterLevel === 'all' ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.2s',
                    boxShadow: filterLevel === 'all' ? '0 4px 12px rgba(59,130,246,0.3)' : 'none'
                  }}>
                  ALL
                </button>
                {Object.entries(RISK_LEVELS).map(([key, def]) => (
                  <button key={key} onClick={() => setFilterLevel(def.label)}
                    style={{
                      padding: '6px 16px', borderRadius: '9999px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700,
                      background: filterLevel === def.label ? 'var(--accent-blue)' : 'transparent',
                      color: filterLevel === def.label ? '#fff' : 'var(--text-secondary)',
                      transition: 'all 0.2s',
                      boxShadow: filterLevel === def.label ? '0 4px 12px rgba(59,130,246,0.3)' : 'none'
                    }}>
                    {def.label.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Container with scroll bounds */}
            <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 400px)', borderRadius: '16px', border: '1px solid var(--divider)', background: 'var(--glass-bg)' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 30 }}>
                  <tr style={{ background: 'var(--table-header-bg)' }}>
                    {[{ key: 'name', label: 'DISTRICT/TOWN' }, { key: 'state', label: 'REGION' }, { key: 'population', label: 'POPULATION' }, { key: '_demand', label: 'WATER DEMAND' }, { key: 'riskScore', label: 'COMPOSITE SCORE' }, { key: 'riskLevel', label: 'STATUS' }].map((col, idx) => (
                      <th key={col.key} onClick={() => toggleSort(col.key)}
                        style={{ 
                          padding: '20px 16px', 
                          cursor: 'pointer', 
                          fontSize: '11px', 
                          fontWeight: 800, 
                          color: 'var(--table-header-text)', 
                          textTransform: 'uppercase', 
                          letterSpacing: '1.2px', 
                          background: 'var(--table-header-bg)',
                          borderBottom: '2px solid var(--accent-blue)',
                          whiteSpace: 'nowrap'
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: idx === 0 ? '16px' : '0' }}>
                          {col.label}
                          <span style={{ fontSize: '10px', color: sortField === col.key ? 'var(--accent-blue)' : 'var(--text-tertiary)', opacity: sortField === col.key ? 1 : 0.4 }}>
                            {sortField === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
              <tbody>
                {filtered.map((v, i) => {
                  const risk = getRiskLevel(v.riskScore);
                  let color = 'var(--accent-green)';
                  if (v.riskScore >= 76) color = 'var(--accent-red)';
                  else if (v.riskScore >= 51) color = 'var(--accent-amber)';
                  else if (v.riskScore >= 26) color = '#eab308';
                  const pop = (v.population && v.population > 0) ? v.population : 50000;
                  const isEst = !v.population || v.population === 0;
                  const waterDemandKL = Math.round(pop * 55 / 1000);

                  return (
                    <tr key={v._id || i} style={{ height: '52px', borderBottom: '1px solid var(--divider)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', transition: 'background 0.15s', cursor: 'default' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'; }}
                    >
                      <td style={{ padding: '0 16px', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: 0, top: '4px', bottom: '4px', width: '3px', background: color, borderRadius: '0 4px 4px 0' }} />
                        <div style={{ paddingLeft: '16px', fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{v.name}</div>
                      </td>
                      <td style={{ padding: '0 16px', color: 'var(--text-secondary)', fontSize: '14px' }}>{v.state || v.region}</td>
                      <td style={{ padding: '0 16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                        {isEst ? <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>~50K est.</span> : formatNumber(v.population)}
                      </td>
                      <td style={{ padding: '0 16px', color: color, fontSize: '13px', fontWeight: 600 }}>{formatNumber(waterDemandKL)} kL/d</td>
                      <td style={{ padding: '0 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color, width: '24px' }}>{v.riskScore}</span>
                          <div style={{ height: '4px', flex: 1, background: 'var(--glass-border)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(v.riskScore, 100)}%`, height: '100%', background: color, boxShadow: `0 0 8px ${color}` }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0 16px' }}><RiskBadge score={v.riskScore} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Search size={32} style={{ margin: '0 auto 12px', opacity: 0.5, display: 'block' }} />
                No records match current parameters
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Assessment Model */}
        <div className="glass-card" style={{ width: '320px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Info size={18} style={{ color: 'var(--accent-blue)' }} />
              <h3 className="section-header">Assessment Model</h3>
            </div>
            <p className="body-text" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              The composite severity score (0–100) is aggregated across three primary factors, normalized via backend processing:
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <WeightRow label="Rainfall Deficit" weight={50} color="var(--accent-blue)" />
            <WeightRow label="GW Depletion" weight={30} color="var(--accent-cyan)" />
            <WeightRow label="Population Gap" weight={20} color="#8b5cf6" />
          </div>

          <div style={{ borderTop: '1px solid var(--divider)', paddingTop: '24px' }}>
            <h4 className="card-label" style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>Classification Matrix</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <MatrixRow label="Extreme" threshold={75} color="var(--accent-red)" />
              <div style={{ height: '1px', background: 'var(--divider)' }} />
              <MatrixRow label="Severe" threshold={50} color="var(--accent-amber)" />
              <div style={{ height: '1px', background: 'var(--divider)' }} />
              <MatrixRow label="Moderate" threshold={25} color="#eab308" />
              <div style={{ height: '1px', background: 'var(--divider)' }} />
              <MatrixRow label="Normal" threshold={0} color="var(--accent-green)" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function WeightRow({ label, weight, color }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{weight}%</span>
      </div>
      <div style={{ height: '6px', background: 'var(--glass-border)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${weight}%`, height: '100%', background: color, filter: `drop-shadow(0 0 6px ${color})`, borderRadius: '3px' }} />
      </div>
    </div>
  );
}

function MatrixRow({ label, threshold, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
        <span style={{ fontSize: '14px', fontWeight: 700, color: color }}>{label.toUpperCase()}</span>
      </div>
      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600 }}>&gt; {threshold} PTS</span>
    </div>
  );
}
