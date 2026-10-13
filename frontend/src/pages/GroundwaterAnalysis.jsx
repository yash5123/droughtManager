import { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { Droplets, Download, ArrowDownUp, Search, Loader2, ChevronDown, X } from 'lucide-react';
import { useRankedVillages, useSeedingStatus } from '../hooks/useRiskData.js';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { getSoilMoistureLevel } from '../utils/riskLevels.js';
import { fetchHistoricalWeather } from '../services/weatherService.js';
import { exportToCSV } from '../utils/csv.js';

const PERIODS = [{ label: '7 Days', days: 7 }, { label: '30 Days', days: 30 }];

export default function GroundwaterAnalysis() {
  const { data: rankedData } = useRankedVillages(1000);
  const { data: seedingStatus } = useSeedingStatus();

  const activeVillages = useMemo(() => rankedData?.data || [], [rankedData]);

  let dataSource = 'pending';
  if (seedingStatus?.inProgress) dataSource = 'seeding';
  else if (seedingStatus?.dailyJob?.running) dataSource = 'updating';
  else if (activeVillages.length > 0) dataSource = rankedData?.meta?.isStale ? 'stale' : 'backend';
  else if (seedingStatus?.phase === 'complete' && activeVillages.length === 0) dataSource = 'stale';
  else if (seedingStatus) dataSource = 'seeding';

  const [selectedVillage, setSelectedVillage] = useState(null);
  const [villageTrend, setVillageTrend] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [countLimit, setCountLimit] = useState('All');
  const [mobileDistrictOpen, setMobileDistrictOpen] = useState(false);
  const [sortAscending, setSortAscending] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    if (activeVillages.length > 0 && !selectedVillage) {
      setSelectedVillage(activeVillages[0]);
    }
  }, [activeVillages, selectedVillage]);

  useEffect(() => {
    const fetchTrend = async () => {
      if (!selectedVillage?._id) { setVillageTrend(null); return; }
      setLoading(true);
      try {
        const { data } = await fetchHistoricalWeather(selectedVillage._id);
        const smRaw = data?.daily?.soil_moisture_0_to_7cm_mean || data?.soilMoistureArray;
        const timeRaw = data?.daily?.time || Array.from({ length: smRaw?.length || 0 }, (_, i) => {
          const d = new Date(Date.now() - ((smRaw?.length || 31) - 1 - i) * 24 * 60 * 60 * 1000);
          return d.toISOString().split('T')[0];
        });

        if (!smRaw) { setVillageTrend(null); setLoading(false); return; }

        // Slice data to match selected period (backend returns ~30 days)
        const availableLength = smRaw.length;
        const sliceCount = Math.min(period, availableLength);
        const sm = smRaw.slice(availableLength - sliceCount);
        const time = timeRaw.slice(availableLength - sliceCount);

        setVillageTrend(time.map((t, i) => ({
          date: t.slice(5),
          moisture: Math.round((sm[i] || 0) * 1000) / 10,
        })));
      } catch (err) {
        console.error('Trend fetch failed:', err);
        setVillageTrend(null);
      } finally {
        setLoading(false);
      }
    };
    fetchTrend();
  }, [selectedVillage, period]);

  const filteredList = useMemo(() => {
    let list = activeVillages;
    if (search) list = list.filter(v => v.name?.toLowerCase().includes(search.toLowerCase()) || v.state?.toLowerCase().includes(search.toLowerCase()));

    if (filter !== 'All') {
      list = list.filter(v => {
        const level = v.avgSoilMoisturePct != null ? getSoilMoistureLevel(v.avgSoilMoisturePct)?.label : 'Adequate';
        if (filter === 'Extreme') return level === 'Critical';
        if (filter === 'Severe') return level === 'Low';
        if (filter === 'Moderate') return level === 'Moderate';
        if (filter === 'Normal') return level === 'Adequate';
        return true;
      });
    }

    // Sort by moisture (lowest moisture first)
    list.sort((a, b) => {
      const scoreA = (a.avgSoilMoisturePct != null && a.avgSoilMoisturePct > 0) ? a.avgSoilMoisturePct : 999;
      const scoreB = (b.avgSoilMoisturePct != null && b.avgSoilMoisturePct > 0) ? b.avgSoilMoisturePct : 999;
      return sortAscending ? scoreA - scoreB : scoreB - scoreA;
    });

    if (countLimit !== 'All') list = list.slice(0, parseInt(countLimit, 10));
    return list;
  }, [activeVillages, search, filter, countLimit, sortAscending]);

  const getFilterColor = (f) => {
    switch (f) {
      case 'Extreme': return '#ef4444';
      case 'Severe': return '#f97316';
      case 'Moderate': return '#eab308';
      case 'Normal': return '#10b981';
      default: return '#3b82f6';
    }
  };

  const avg30 = villageTrend?.length > 0 ? villageTrend.reduce((s, d) => s + d.moisture, 0) / villageTrend.length : 0;
  const first7 = villageTrend?.length > 7 ? villageTrend.slice(0, 7).reduce((s, d) => s + d.moisture, 0) / 7 : 0;
  const last7 = villageTrend?.length > 7 ? villageTrend.slice(-7).reduce((s, d) => s + d.moisture, 0) / 7 : 0;
  const trendLabel = last7 > first7 + 0.5 ? 'Improving' : last7 < first7 - 0.5 ? 'Declining' : 'Stable';
  const trendColor = trendLabel === 'Improving' ? 'var(--accent-green)' : trendLabel === 'Declining' ? 'var(--accent-red)' : 'var(--accent-amber)';
  const latestMoisture = villageTrend?.[villageTrend.length - 1]?.moisture ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px' }}>
      <DataSourceBanner dataSource={dataSource} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-header">
          <div className="header-icon-container">
            <Droplets size={32} />
          </div>
          <div className="header-text">
            <h1 className="header-title">Groundwater Monitoring</h1>
            <p className="header-subtitle">Satellite-derived Soil Moisture Analysis & Aquifer Health</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="glass-pill" style={{ display: 'flex', padding: '4px' }}>
            {PERIODS.map(p => (
              <button key={p.days} onClick={() => setPeriod(p.days)} style={{ padding: '6px 16px', borderRadius: '9999px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: period === p.days ? 'rgba(59,130,246,0.2)' : 'transparent', color: period === p.days ? 'var(--accent-blue)' : 'var(--text-secondary)', transition: 'all 0.2s' }}>{p.label}</button>
            ))}
          </div>
          <button className="glass-btn" onClick={() => exportToCSV(activeVillages.map(v => ({ District: v.name, State: v.state, 'Avg Moisture %': v.avgSoilMoisturePct?.toFixed(1), 'Risk Score': Math.round(v.riskScore) })), `groundwater_analysis`)} style={{ padding: '6px 16px', gap: '8px', fontSize: '12px', fontWeight: 600 }}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>



      {/* Mobile district selector - only visible on mobile */}
      <div className="district-selector-mobile">
        <button
          onClick={() => setMobileDistrictOpen(true)}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'inherit',
            borderRadius: '10px',
            padding: '10px 16px',
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer'
          }}
        >
          <span>{selectedVillage?.name || 'Select District'}</span>
          <ChevronDown size={16} />
        </button>
      </div>

      <div className="split-panel" style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* LEFT PANEL */}
        <div className="glass-card district-list-panel" style={{ width: '290px', minWidth: '270px', display: 'flex', flexDirection: 'column', padding: '16px', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h3 className="section-header" style={{ marginBottom: 0 }}>Monitored Districts ({filteredList.length})</h3>
            <button onClick={() => setSortAscending(!sortAscending)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px' }} title={sortAscending ? "Sort Descending" : "Sort Ascending"} onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}>
              <ArrowDownUp size={14} />
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search district..." className="glass-input" style={{ width: '100%', padding: '8px 10px 8px 30px', fontSize: '13px', background: 'var(--glass-bg)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* All button on top, big */}
            <button
              onClick={() => setFilter('All')}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.2s',
                background: filter === 'All' ? 'rgba(59,130,246,0.2)' : 'transparent',
                color: filter === 'All' ? 'var(--accent-blue)' : 'var(--text-tertiary)',
                border: filter === 'All' ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                boxShadow: filter === 'All' ? 'var(--accent-blue-glow)' : 'none',
                textShadow: filter === 'All' ? '0 0 8px rgba(59,130,246,0.4)' : 'none'
              }}
            >
              Show All Districts
            </button>

            {/* Other filters in 4 columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', paddingBottom: '2px' }}>
              {['Extreme', 'Severe', 'Moderate', 'Normal'].map(f => {
                const color = getFilterColor(f);
                return (
                  <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 0', borderRadius: '10px', cursor: 'pointer', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2px', transition: 'all 0.2s', background: filter === f ? `${color}20` : 'transparent', color: filter === f ? color : 'var(--text-tertiary)', textAlign: 'center', border: filter === f ? `1px solid ${color}40` : '1px solid transparent' }}>{f}</button>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
            {['10', '25', 'All'].map(c => (
              <button key={c} onClick={() => setCountLimit(c)} style={{ flex: 1, padding: '4px 0', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', transition: 'all 0.2s', background: countLimit === c ? 'rgba(255,255,255,0.08)' : 'transparent', color: countLimit === c ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                {c === 'All' ? 'All Districts' : `Top ${c}`}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 320px)', display: 'flex', flexDirection: 'column', gap: '3px', paddingRight: '2px' }}>
            {filteredList.length === 0 ? (
              <EmptyState title="No data" description="No districts match filters." />
            ) : (
              filteredList.map((v, i) => {
                const isSelected = selectedVillage?._id === v._id;

                const displayMoisture = v.avgSoilMoisturePct;
                const level = displayMoisture != null && displayMoisture > 0 ? getSoilMoistureLevel(displayMoisture) : null;
                const color = level?.color || 'var(--text-tertiary)';

                return (
                  <button key={v._id || i} onClick={() => setSelectedVillage(v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', border: 'none', borderLeft: isSelected ? '3px solid var(--accent-blue)' : '3px solid transparent', cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s', background: isSelected ? 'var(--nav-active-bg)' : 'transparent' }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)' }}>{v.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{v.state}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', color: color, fontWeight: 700, fontSize: '13px', letterSpacing: '0.5px' }}>
                      {displayMoisture != null && displayMoisture > 0 ? `${displayMoisture.toFixed(1)}%` : 'N/A'}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="chart-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
          <div className="glass-card" style={{ flex: 1, padding: '22px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>{selectedVillage?.name || 'Select a region'}</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Surface Soil Moisture Trend (0–7cm)</p>
              </div>
              {selectedVillage && (
                <div style={{ textAlign: 'right' }}>
                  {(() => {
                    const displayMoisture = selectedVillage.avgSoilMoisturePct;
                    const level = displayMoisture != null && displayMoisture > 0 ? getSoilMoistureLevel(displayMoisture) : null;
                    const color = level?.color || 'var(--text-tertiary)';
                    return (
                      <>
                        <div className="data-value" style={{
                          color: color,
                          filter: displayMoisture <= 0 ? 'none' : `drop-shadow(0 0 8px ${color}80)`,
                          fontSize: '24px'
                        }}>
                          {displayMoisture > 0 ? `${displayMoisture.toFixed(1)}%` : 'N/A'}
                        </div>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600, marginTop: '2px', letterSpacing: '0.5px' }}>Avg Moisture</div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {villageTrend && villageTrend.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                {[
                  {
                    label: 'Current Moisture',
                    value: latestMoisture > 0 ? `${latestMoisture.toFixed(1)}%` : 'N/A',
                    color: latestMoisture > 0 ? getSoilMoistureLevel(latestMoisture).color : 'var(--text-tertiary)'
                  },
                  {
                    label: '30-Day Average',
                    value: avg30 > 0 ? `${avg30.toFixed(1)}%` : 'N/A',
                    color: 'var(--text-secondary)'
                  },
                  {
                    label: 'Trend Direction',
                    value: latestMoisture > 0 ? trendLabel : 'N/A',
                    color: latestMoisture > 0 ? trendColor : 'var(--text-tertiary)'
                  }
                ].map(chip => (
                  <div key={chip.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--divider)' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>{chip.label}</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: chip.color }}>{chip.value}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ flex: 1, minHeight: 0, position: 'relative', width: '100%' }}>
              {villageTrend ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={villageTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.4} />
                    <ReferenceLine y={7} stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.7} label={{ value: 'Critical', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />
                    <ReferenceLine y={15} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.7} label={{ value: 'Low', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} />
                    <ReferenceLine y={25} stroke="#22c55e" strokeDasharray="4 3" strokeOpacity={0.7} label={{ value: 'Good', fill: '#22c55e', fontSize: 10, position: 'insideTopRight' }} />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} dx={-8} />
                    <Tooltip
                      contentStyle={{ background: 'var(--glass-bg)', border: 'var(--glass-border)', backdropFilter: 'blur(12px)', borderRadius: '10px', color: 'var(--text-primary)' }}
                      itemStyle={{ color: 'var(--accent-blue)' }}
                      labelStyle={{ color: 'var(--text-secondary)' }}
                      cursor={{ stroke: 'var(--text-tertiary)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area type="monotone" dataKey="moisture" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorMoisture)" activeDot={{ r: 6, fill: 'var(--glass-bg)', stroke: '#3b82f6', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  {loading ? <Loader2 className="spinning" size={28} style={{ color: 'var(--accent-blue)' }} /> : <EmptyState icon={Droplets} title="No trend data" description="Select a district to view data." />}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile district modal */}
      {mobileDistrictOpen && (
        <div className="district-modal-sheet" style={{
          background: 'var(--bg-gradient, #0f172a)',
          padding: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>Select District</h3>
            <button
              onClick={() => setMobileDistrictOpen(false)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              <X size={24} />
            </button>
          </div>
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Search size={13} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search district..." className="glass-input" style={{ width: '100%', padding: '8px 10px 8px 30px', fontSize: '13px', background: 'var(--glass-bg)' }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {filteredList.map((v, i) => {
              const isSelected = selectedVillage?._id === v._id;
              const displayMoisture = v.avgSoilMoisturePct;
              return (
                <button key={v._id || i} onClick={() => { setSelectedVillage(v); setMobileDistrictOpen(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', border: 'none', borderLeft: isSelected ? '3px solid var(--accent-blue)' : '3px solid transparent', cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s', background: isSelected ? 'var(--nav-active-bg)' : 'transparent', color: 'inherit' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)' }}>{v.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{v.state}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', fontWeight: 700, fontSize: '13px' }}>
                    {displayMoisture != null && displayMoisture > 0 ? `${displayMoisture.toFixed(1)}%` : 'N/A'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
