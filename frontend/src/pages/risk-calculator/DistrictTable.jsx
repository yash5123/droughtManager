import { Search, Filter, ChevronRight, Download } from 'lucide-react';

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

export default function DistrictTable({
  filteredVillages,
  selectedVillage,
  setSelectedVillage,
  riskFilter,
  setRiskFilter,
  limitFilter,
  setLimitFilter,
  searchTerm,
  setSearchTerm,
  toggleSort,
  sortOrder,
  getRiskLevel,
  exportToCSV
}) {
  return (
    <div className="glass-card" style={{ flex: 1, padding: '0', overflow: 'hidden', minHeight: '700px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '28px', borderBottom: '1px solid var(--divider)', display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(255,255,255,0.01)' }}>
        <div className="filter-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
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

      <div className="table-scroll-container" style={{ flex: 1, overflowY: 'auto', maxHeight: '700px' }}>
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
                  <td><ChevronRight size={18} color="var(--text-tertiary)" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.1)', borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="caption-text" style={{ color: 'var(--text-tertiary)' }}>SHOWING {filteredVillages.length} DISTRICTS</span>
        <button 
          className="glass-btn" 
          onClick={() => exportToCSV(
            filteredVillages.map(v => ({
              'District': v.name,
              'State': v.state,
              'Risk Index': (v.riskScore || 0).toFixed(1),
              'Status': v.riskLevel?.toUpperCase() || getRiskLevel(v.riskScore || 0).label.toUpperCase(),
              'RDI': (v.metricsSnapshot?.rdiScore ?? v.rainfallDeficit ?? 0).toFixed(1),
              'CDD': (v.metricsSnapshot?.cddScore ?? 0).toFixed(1),
              'SMA': (v.metricsSnapshot?.smaScore ?? v.soilMoistureDepletion ?? 0).toFixed(1),
              'Pop Gap': (v.metricsSnapshot?.ppaScore ?? v.populationDemandGap ?? 0).toFixed(1)
            })),
            'risk_indices_report'
          )}
          style={{ fontSize: '11px', padding: '6px 12px', gap: '6px' }}
        >
          <Download size={14} /> EXPORT DATA
        </button>
      </div>
    </div>
  );
}
