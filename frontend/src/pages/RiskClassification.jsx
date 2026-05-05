import React, { useState, useMemo } from 'react';
import { Search, Info, Filter } from 'lucide-react';
import { useVillageData } from '../context/VillageDataContext.jsx';
import { useCountUp } from '../hooks/useCountUp.js';
import RiskBadge from '../components/ui/RiskBadge.jsx';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';
import { RISK_LEVELS, getRiskLevel } from '../utils/riskLevels.js';
import { formatNumber } from '../utils/formatters.js';

function CountCard({ label, count, color }) {
  const val = useCountUp(count, 800);
  return (
    <div className="card p-4 relative overflow-hidden group">
      {/* Top accent border */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: color }}></div>
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-10 transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-150" style={{ backgroundColor: color, filter: 'blur(10px)' }}></div>
      
      <p className="text-3xl font-bold font-mono text-[var(--color-on-surface)] z-10 relative" style={{ textShadow: `0 0 10px ${color}40` }}>{val}</p>
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)] mt-1 z-10 relative font-semibold">{label}</p>
    </div>
  );
}

export default function RiskClassification() {
  const { riskData, dataSource } = useVillageData();
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [sortField, setSortField] = useState('riskScore');
  const [sortDir, setSortDir] = useState('desc');

  const counts = useMemo(() => ({
    Extreme: riskData.filter(v => v.riskScore > 70).length,
    Severe: riskData.filter(v => v.riskScore > 50 && v.riskScore <= 70).length,
    Moderate: riskData.filter(v => v.riskScore > 25 && v.riskScore <= 50).length,
    Normal: riskData.filter(v => v.riskScore <= 25).length,
  }), [riskData]);

  const filtered = useMemo(() => {
    let list = [...riskData];
    if (search) list = list.filter(v => v.name?.toLowerCase().includes(search.toLowerCase()) || v.state?.toLowerCase().includes(search.toLowerCase()));
    if (filterLevel !== 'all') list = list.filter(v => getRiskLevel(v.riskScore).label === filterLevel);
    list.sort((a, b) => {
      const av = a[sortField] ?? 0, bv = b[sortField] ?? 0;
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return list;
  }, [riskData, search, filterLevel, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      <DataSourceBanner dataSource={dataSource} />

      <div className="flex items-center gap-3">
        <Filter className="w-6 h-6 text-[var(--color-primary)]" />
        <div>
          <h2 className="text-base font-bold text-display text-[var(--color-on-surface)]">Risk Classification Grid</h2>
          <p className="text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider">Algorithmic Severity Assessment</p>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(RISK_LEVELS).map(([key, def]) => (
          <CountCard key={key} label={def.label} count={counts[key] || 0} color={def.color} />
        ))}
      </div>

      {/* Filter Bar */}
      <div className="card p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-[var(--color-outline-variant)]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-on-surface-variant)]" />
          <input 
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Query villages or regions..."
            className="w-full pl-9 pr-4 py-2 rounded bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] text-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-secondary)] focus:ring-1 focus:ring-[var(--color-secondary)] transition-all placeholder:text-[var(--color-on-surface-variant)]/60"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <span className="text-xs text-[var(--color-on-surface-variant)] font-semibold uppercase tracking-wider mr-2">Severity:</span>
          <button 
            onClick={() => setFilterLevel('all')} 
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all border ${filterLevel === 'all' ? 'bg-[var(--color-secondary)] text-[var(--color-bg-base)] border-[var(--color-secondary)]' : 'bg-transparent text-[var(--color-on-surface-variant)] border-[var(--color-outline-variant)] hover:border-[var(--color-outline)] hover:text-[var(--color-on-surface)]'}`}
          >
            ALL
          </button>
          {Object.entries(RISK_LEVELS).map(([key, def]) => (
            <button 
              key={key} 
              onClick={() => setFilterLevel(def.label)} 
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all border whitespace-nowrap`}
              style={{ 
                backgroundColor: filterLevel === def.label ? def.color + '20' : 'transparent', 
                color: filterLevel === def.label ? def.color : 'var(--color-on-surface-variant)',
                borderColor: filterLevel === def.label ? def.color + '60' : 'var(--color-outline-variant)'
              }}
            >
              {def.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Main Data Grid */}
        <div className="xl:col-span-3 card overflow-hidden border-[var(--color-outline-variant)] flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-[var(--color-surface-container-low)] border-b border-[var(--color-outline-variant)]">
                <tr>
                  {[{ key: 'name', label: 'VILLAGE/TOWN' }, { key: 'state', label: 'REGION' }, { key: 'population', label: 'POPULATION' }, { key: 'riskScore', label: 'COMPOSITE SCORE' }, { key: 'riskLevel', label: 'STATUS' }].map(col => (
                    <th key={col.key} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)] cursor-pointer select-none hover:text-[var(--color-secondary)] transition-colors group"
                      onClick={() => toggleSort(col.key)}>
                      <div className="flex items-center gap-1">
                        {col.label} 
                        <span className={`text-[var(--color-secondary)] ${sortField === col.key ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                          {sortDir === 'asc' ? '▲' : '▼'}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-outline-variant)]">
                {filtered.map((v, i) => {
                  const risk = getRiskLevel(v.riskScore);
                  return (
                    <tr key={v._id || i} className="group hover:bg-[var(--color-surface-container-high)] transition-colors relative">
                      {/* Left color bar indicator */}
                      <td className="px-0 py-0 w-0 absolute left-0 top-0 bottom-0">
                        <div className="w-1 h-full opacity-80 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: risk.color, boxShadow: `0 0 8px ${risk.color}` }}></div>
                      </td>
                      <td className="px-5 py-3 font-semibold text-[var(--color-on-surface)] pl-6">{v.name}</td>
                      <td className="px-5 py-3 text-[var(--color-on-surface-variant)] text-xs">{v.state || v.region}</td>
                      <td className="px-5 py-3 font-mono text-xs text-[var(--color-on-surface-variant)]">{formatNumber(v.population)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3 max-w-[140px]">
                          <span className="font-mono font-bold text-sm min-w-[28px]" style={{ color: risk.color }}>{v.riskScore}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-[var(--color-surface-container-highest)] overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${v.riskScore}%`, backgroundColor: risk.color, boxShadow: `0 0 5px ${risk.color}80` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3"><RiskBadge score={v.riskScore} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="p-3 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] text-[10px] text-[var(--color-on-surface-variant)] flex justify-between uppercase tracking-wider">
            <span>Total Records: {filtered.length}</span>
            <span>Refreshed: Live</span>
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-[var(--color-on-surface-variant)] flex flex-col items-center">
              <Search className="w-8 h-8 mb-3 opacity-20" />
              No records match current parameters
            </div>
          )}
        </div>

        {/* Algorithm Explanation */}
        <div className="card border-[var(--color-outline-variant)] flex flex-col">
          <div className="p-4 border-b border-[var(--color-outline-variant)] flex items-center gap-2">
            <Info className="w-4 h-4 text-[var(--color-primary)]" />
            <h3 className="text-xs font-bold text-display uppercase tracking-wider text-[var(--color-on-surface)]">Assessment Model</h3>
          </div>
          
          <div className="p-4 space-y-5 text-sm">
            <div>
              <p className="text-xs text-[var(--color-on-surface-variant)] mb-3 leading-relaxed">
                The composite severity score (0–100) is aggregated across three primary factors, normalized via backend processing:
              </p>
              <div className="space-y-3">
                <WeightRow label="Rainfall Deficit" weight={40} color="var(--color-primary)" />
                <WeightRow label="GW Depletion" weight={35} color="var(--color-secondary)" />
                <WeightRow label="Population Gap" weight={25} color="var(--color-tertiary)" />
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--color-outline-variant)]">
              <h4 className="text-[10px] font-bold text-[var(--color-on-surface)] uppercase tracking-wider mb-3">Classification Matrix</h4>
              <div className="space-y-2">
                {Object.entries(RISK_LEVELS).map(([key, def]) => (
                  <div key={key} className="flex items-center justify-between p-2 rounded bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)]/50">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: def.color, boxShadow: `0 0 5px ${def.color}` }} />
                      <span className="text-xs font-bold" style={{ color: def.color }}>{def.label.toUpperCase()}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--color-on-surface-variant)]">&gt; {def.min} PTS</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeightRow({ label, weight, color }) {
  return (
    <div className="group">
      <div className="flex justify-between mb-1 items-end">
        <span className="text-xs font-semibold text-[var(--color-on-surface)]">{label}</span>
        <span className="font-mono text-[10px] text-[var(--color-on-surface-variant)]">{weight}%</span>
      </div>
      <div className="h-1 rounded bg-[var(--color-surface-container-highest)] overflow-hidden">
        <div className="h-full rounded transition-all group-hover:brightness-125" style={{ width: `${weight}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
