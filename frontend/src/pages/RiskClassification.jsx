import React, { useState, useMemo } from 'react';
import { Search, Info } from 'lucide-react';
import { useVillageData } from '../context/VillageDataContext.jsx';
import { useCountUp } from '../hooks/useCountUp.js';
import RiskBadge from '../components/ui/RiskBadge.jsx';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';
import { RISK_LEVELS, getRiskLevel } from '../utils/riskLevels.js';
import { formatNumber } from '../utils/formatters.js';

function CountCard({ label, count, color }) {
  const val = useCountUp(count, 800);
  return (
    <div className="card p-4 text-center card-hover" style={{ borderTop: `3px solid ${color}` }}>
      <p className="text-3xl font-bold font-mono" style={{ color }}>{val}</p>
      <p className="text-xs text-[var(--color-text-muted)] mt-1">{label}</p>
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
    <div className="space-y-5 animate-fade-in">
      <DataSourceBanner dataSource={dataSource} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(RISK_LEVELS).map(([key, def]) => (
          <CountCard key={key} label={def.label} count={counts[key] || 0} color={def.color} />
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search villages..."
            className="w-full pl-10 pr-4 py-2 rounded-lg text-sm border outline-none focus:border-[var(--color-cyan)] transition-colors"
            style={{ backgroundColor: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
        </div>
        <div className="flex gap-1">
          <button onClick={() => setFilterLevel('all')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all`}
            style={{ backgroundColor: filterLevel === 'all' ? 'var(--color-cyan)' : 'var(--color-bg-card)', color: filterLevel === 'all' ? 'var(--color-bg-base)' : 'var(--color-text-muted)' }}>All</button>
          {Object.entries(RISK_LEVELS).map(([key, def]) => (
            <button key={key} onClick={() => setFilterLevel(key)} className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
              style={{ backgroundColor: filterLevel === key ? def.color + '30' : 'var(--color-bg-card)', color: filterLevel === key ? def.color : 'var(--color-text-muted)' }}>{def.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-surface)' }}>
                  {[{ key: 'name', label: 'Village' }, { key: 'state', label: 'State' }, { key: 'population', label: 'Population' }, { key: 'riskScore', label: 'Score' }, { key: 'riskLevel', label: 'Level' }].map(col => (
                    <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] cursor-pointer select-none hover:text-[var(--color-text-secondary)]"
                      onClick={() => toggleSort(col.key)}>
                      {col.label} {sortField === col.key && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((v, i) => {
                  const risk = getRiskLevel(v.riskScore);
                  return (
                    <tr key={v._id || i} className="border-t hover:bg-[var(--color-bg-surface)] transition-colors" style={{ borderColor: 'var(--color-border-subtle)', borderLeft: `3px solid ${risk.color}` }}>
                      <td className="px-4 py-2.5 font-medium">{v.name}</td>
                      <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{v.state || v.region}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{formatNumber(v.population)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm" style={{ color: risk.color }}>{v.riskScore}</span>
                          <div className="flex-1 h-1.5 rounded-full max-w-[60px]" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${v.riskScore}%`, backgroundColor: risk.color }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><RiskBadge score={v.riskScore} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">No villages match filters</div>}
        </div>

        {/* Algorithm Explanation */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-[var(--color-cyan)]" />
            <h3 className="text-sm font-semibold text-display">Algorithm</h3>
          </div>
          <div className="space-y-3 text-xs text-[var(--color-text-muted)]">
            <p>The composite risk score (0–100) is calculated server-side using:</p>
            <div className="space-y-1.5">
              <WeightRow label="Rainfall Deficit" weight={40} color="#3b82f6" />
              <WeightRow label="GW Depletion" weight={35} color="#8b5cf6" />
              <WeightRow label="Population Gap" weight={25} color="#f97316" />
            </div>
            <div className="pt-2 border-t space-y-1" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <p className="font-semibold text-[var(--color-text-secondary)]">Thresholds</p>
              {Object.entries(RISK_LEVELS).map(([key, def]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: def.color }} />
                  <span>{def.label}: {def.min}+</span>
                </div>
              ))}
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
      <div className="flex justify-between mb-0.5"><span>{label}</span><span className="font-mono font-semibold">{weight}%</span></div>
      <div className="h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
        <div className="h-full rounded-full" style={{ width: `${weight}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
