import React, { useState, useEffect, useMemo } from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine, CartesianGrid } from 'recharts';
import { Download, CloudRain, ArrowDownRight, ArrowUpRight, Loader2, Search, TrendingDown, TrendingUp, BarChart2, ArrowDownUp, ChevronDown, X } from 'lucide-react';
import { useVillageData } from '../context/VillageDataContext.jsx';
import { useRankedVillages, useSeedingStatus } from '../hooks/useRiskData.js';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { exportToCSV } from '../utils/csv.js';
import { fetchHistoricalWeather } from '../services/weatherService.js';
import { getRiskLevel } from '../utils/riskLevels.js';

const PERIODS = [{ label: '7 Days', days: 7 }, { label: '30 Days', days: 30 }];

const seededRandom = (seed) => { const x = Math.sin(seed + 1) * 10000; return x - Math.floor(x); };

// Mock data injection removed to prioritize real server data.

const StatChip = ({ label, value, color = 'var(--text-secondary)', unit = '' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--divider)', flex: 1 }}>
    <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{label}</span>
    <span style={{ fontSize: '16px', fontWeight: 700, color }}>{value}<span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', marginLeft: '2px' }}>{unit}</span></span>
  </div>
);

export default function RainfallAnalysis() {
  const { villageCount } = useVillageData();
  const { data: rankedData } = useRankedVillages(1000);
  const { data: seedingStatus } = useSeedingStatus();
  const activeVillages = rankedData?.data || [];

  let dataSource = 'pending';
  if (seedingStatus?.inProgress) dataSource = 'seeding';
  else if (activeVillages.length > 0) dataSource = rankedData?.meta?.isStale ? 'stale' : 'backend';
  else if (seedingStatus?.phase === 'complete' && activeVillages.length === 0) dataSource = 'stale';
  else if (seedingStatus) dataSource = 'seeding';

  const [period, setPeriod] = useState(30);
  const [selectedVillage, setSelectedVillage] = useState(null);
  const [villageTimeSeries, setVillageTimeSeries] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [countLimit, setCountLimit] = useState('All');
  const [sortDescending, setSortDescending] = useState(true);
  const [selectedVillageMetrics, setSelectedVillageMetrics] = useState(null);
  const [mobileDistrictOpen, setMobileDistrictOpen] = useState(false);

  useEffect(() => {
    if (activeVillages.length > 0 && !selectedVillage) {
      setSelectedVillage(activeVillages[0]);
    }
  }, [activeVillages, selectedVillage]);

  useEffect(() => {
    if (!selectedVillage?._id) { setVillageTimeSeries(null); setSelectedVillageMetrics(null); return; }
    setLoading(true);
    fetchHistoricalWeather(selectedVillage._id).then(({ data }) => {
      const precipRaw = data?.daily?.precipitation_sum || data?.precipitationArray;
      const timeRaw = data?.daily?.time || Array.from({ length: precipRaw?.length || 0 }, (_, i) => {
        const d = new Date(Date.now() - ((precipRaw?.length || 31) - 1 - i) * 24 * 60 * 60 * 1000);
        return d.toISOString().split('T')[0];
      });

      if (!precipRaw) { setVillageTimeSeries(null); setSelectedVillageMetrics(null); setLoading(false); return; }
      
      // Slice data to match selected period (backend returns ~30 days)
      const availableLength = precipRaw.length;
      const sliceCount = Math.min(period, availableLength);
      const precip = precipRaw.slice(availableLength - sliceCount);
      const time = timeRaw.slice(availableLength - sliceCount);
      
      const total = precip.reduce((s, val) => s + (val || 0), 0);
      const expected = (selectedVillage.historicalAvgAnnualRainfall_mm || selectedVillage.avgAnnualRainfall || 600) * (period / 365);
      const anomalyPct = expected > 0 ? Math.round(((expected - total) / expected) * 100) : 0;
      
      setVillageTimeSeries(time.map((t, i) => ({ date: t.slice(5), rain: Math.round((precip[i] || 0) * 10) / 10 })));
      setSelectedVillageMetrics({
        totalRain: Math.round(total * 10) / 10,
        expected: Math.round(expected),
        anomalyPct
      });
      setLoading(false);
    });
  }, [selectedVillage, period]);

  const filteredList = useMemo(() => {
    let list = activeVillages;
    if (search) list = list.filter(v => v.name?.toLowerCase().includes(search.toLowerCase()) || v.state?.toLowerCase().includes(search.toLowerCase()));
    if (filter !== 'All') list = list.filter(v => getRiskLevel(v.riskScore).label === filter);
    
    // Sort by risk score
    list.sort((a, b) => {
      const valA = a.riskScore || 0;
      const valB = b.riskScore || 0;
      return sortDescending ? valB - valA : valA - valB;
    });
    
    if (countLimit !== 'All') list = list.slice(0, parseInt(countLimit, 10));
    return list;
  }, [activeVillages, search, filter, countLimit, sortDescending]);


  const dailyAvg = selectedVillageMetrics?.expected ? Math.round((selectedVillageMetrics.expected / period) * 10) / 10 : 0;
  const anomalyPct = selectedVillageMetrics?.anomalyPct ?? 0;
  const driestDay = useMemo(() => villageTimeSeries?.reduce((min, d) => d.rain < min.rain ? d : min, villageTimeSeries[0]) || null, [villageTimeSeries]);
  const wettestDay = useMemo(() => villageTimeSeries?.reduce((max, d) => d.rain > max.rain ? d : max, villageTimeSeries[0]) || null, [villageTimeSeries]);
  const daysBelowBaseline = useMemo(() => villageTimeSeries?.filter(d => d.rain < dailyAvg).length || 0, [villageTimeSeries, dailyAvg]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px' }}>
      <DataSourceBanner dataSource={dataSource} />

      {/* Dynamic Strategic Header */}
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div className="header-icon-container">
          <CloudRain size={34} />
        </div>
        <div className="header-text">
          <h1 className="header-title">Precipitation Analytics</h1>
          <p className="header-subtitle">Temporal variance & hydrological deficit mapping across administrative clusters.</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
          {[25, 50, 100].map(n => (
            <button
              key={n}
              onClick={() => setCountLimit(String(n))}
              style={{
                padding: '10px 20px', borderRadius: '12px', fontSize: '12px', fontWeight: 800,
                background: countLimit === String(n) ? 'var(--nav-active-bg)' : 'var(--glass-bg-bright)',
                border: '1px solid',
                borderColor: countLimit === String(n) ? 'var(--accent-blue)50' : 'var(--divider)',
                color: countLimit === String(n) ? 'var(--accent-blue)' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: countLimit === String(n) ? '0 4px 12px var(--accent-blue)20' : 'none'
              }}
              className="hover-glow"
            >
              TOP {n}
            </button>
          ))}
          <button
            onClick={() => setCountLimit('All')}
            style={{
              padding: '10px 20px', borderRadius: '12px', fontSize: '12px', fontWeight: 800,
              background: countLimit === 'All' ? 'var(--nav-active-bg)' : 'var(--glass-bg-bright)',
              border: '1px solid',
              borderColor: countLimit === 'All' ? 'var(--accent-blue)50' : 'var(--divider)',
              color: countLimit === 'All' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            className="hover-glow"
          >
            VIEW ALL
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="glass-card" style={{ padding: '16px 24px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '24px', border: 'var(--glass-border)', background: 'var(--glass-bg-bright)', flexWrap: 'wrap', gap: '12px' }}>

      {/* Mobile district selector — only visible on mobile */}
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

      <div className="filter-row" style={{ display: 'flex', gap: '8px' }}>
          {['All', 'Extreme', 'Severe', 'Moderate', 'Normal'].map(level => {
            const isActive = filter === level;
            const config = getRiskLevel(level === 'All' ? 0 : level === 'Extreme' ? 90 : level === 'Severe' ? 70 : level === 'Moderate' ? 40 : 10);
            return (
              <button
                key={level}
                onClick={() => setFilter(level)}
                style={{
                  padding: '10px 20px', borderRadius: '14px', fontSize: '12px', fontWeight: 700,
                  background: isActive ? config.color + '15' : 'transparent',
                  border: '1px solid',
                  borderColor: isActive ? config.color + '40' : 'transparent',
                  color: isActive ? config.color : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                {level !== 'All' && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: config.color }} />}
                {level}
              </button>
            );
          })}
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="glass-pill" style={{ display: 'flex', padding: '4px', background: 'var(--nav-hover-bg)' }}>
            {PERIODS.map(p => (
              <button key={p.days} onClick={() => setPeriod(p.days)} style={{ padding: '6px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, background: period === p.days ? 'var(--glass-bg-bright)' : 'transparent', color: period === p.days ? 'var(--accent-blue)' : 'var(--text-tertiary)', transition: 'all 0.2s' }}>{p.label}</button>
            ))}
          </div>
          
          <button className="glass-btn" onClick={() => exportToCSV(activeVillages.map(v => ({ District: v.name, State: v.state, 'Risk Level': getRiskLevel(v.riskScore).label, 'Risk Score': (v.riskScore || 0).toFixed(1) })), `rainfall_analysis`)} style={{ padding: '10px 16px', gap: '8px', fontSize: '11px', fontWeight: 700 }}>
            <Download size={14} /> EXPORT CSV
          </button>
        </div>
      </div>

      <div className="split-panel" style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* LEFT PANEL */}
        <div className="glass-card district-list-panel" style={{ width: '290px', minWidth: '270px', display: 'flex', flexDirection: 'column', padding: '16px', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h3 className="section-header" style={{ marginBottom: 0 }}>Monitored Districts ({filteredList.length})</h3>
            <button onClick={() => setSortDescending(!sortDescending)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px' }} title={sortDescending ? "Sort Ascending" : "Sort Descending"} onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}>
              <ArrowDownUp size={14} />
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search district..." className="glass-input" style={{ width: '100%', padding: '8px 10px 8px 30px', fontSize: '13px', background: 'var(--glass-bg)' }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 320px)', display: 'flex', flexDirection: 'column', gap: '3px', paddingRight: '2px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 className="spinning" size={24} style={{ color: 'var(--accent-blue)' }} /></div>
            ) : filteredList.length === 0 ? (
              <EmptyState title="No data" description="No districts match filters." />
            ) : filteredList.map((v, i) => {
              const isSelected = selectedVillage?._id === v._id;
              return (
                <button key={v._id || i} onClick={() => setSelectedVillage(v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', border: 'none', borderLeft: isSelected ? '3px solid var(--accent-blue)' : '3px solid transparent', cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s', background: isSelected ? 'var(--nav-active-bg)' : 'transparent' }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--nav-hover-bg)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)' }}>{v.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{v.state}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', color: getRiskLevel(v.riskScore).color, fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {(v.riskScore || 0).toFixed(1)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="chart-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
          <div className="glass-card" style={{ flex: 1, padding: '22px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{selectedVillage?.name || 'Select a district'}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>{selectedVillage?.state} · Time Series Rainfall Data</p>
              </div>
              {selectedVillageMetrics && (
                <div className="glass-pill" style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)' }}>
                  <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.5px' }}>Total Precipitation</span>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-blue)', filter: 'drop-shadow(var(--accent-blue-glow))', lineHeight: 1.1 }}>{selectedVillageMetrics.totalRain} <span style={{ fontSize: '12px', fontWeight: 500 }}>mm</span></span>
                </div>
              )}
            </div>
            {selectedVillageMetrics && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <StatChip label="Total Precip" value={selectedVillageMetrics.totalRain} unit="mm" color="var(--accent-blue)" />
                <StatChip label="Historical Baseline" value={selectedVillageMetrics.expected} unit="mm" color="var(--text-secondary)" />
                <StatChip label="Anomaly" value={`${anomalyPct > 0 ? '-' : '+'}${Math.abs(anomalyPct)}`} unit="%" color={anomalyPct > 0 ? 'var(--accent-red)' : 'var(--accent-green)'} />
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0, position: 'relative', width: '100%' }}>
              {villageTimeSeries ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={villageTimeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRain2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.4} />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} dx={-8} />
                    {dailyAvg > 0 && <ReferenceLine y={dailyAvg} stroke="#f59e0b" strokeDasharray="5 4" strokeWidth={1.5} strokeOpacity={0.8} label={{ value: `Avg ${dailyAvg}mm`, fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} />}
                    <Tooltip contentStyle={{ background: 'var(--glass-bg)', border: 'var(--glass-border)', backdropFilter: 'blur(12px)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: 12 }} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-secondary)' }} formatter={(val) => [`${val} mm`, 'Precipitation']} cursor={{ stroke: 'var(--text-tertiary)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area type="monotone" dataKey="rain" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRain2)" activeDot={{ r: 5, fill: '#3b82f6', stroke: 'var(--glass-bg)', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  {loading ? <Loader2 className="spinning" size={28} style={{ color: 'var(--accent-blue)' }} /> : <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Select a district to view data</p>}
                </div>
              )}
            </div>
          </div>

          {villageTimeSeries && (
            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <TrendingDown size={14} style={{ color: 'var(--accent-amber)' }} />
                  <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Driest Day</span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{driestDay?.rain ?? ' - '}<span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: '3px' }}>mm</span></div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>{driestDay?.date || ' - '}</div>
              </div>
              <div className="glass-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <TrendingUp size={14} style={{ color: 'var(--accent-blue)' }} />
                  <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Wettest Day</span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-blue)' }}>{wettestDay?.rain ?? ' - '}<span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: '3px' }}>mm</span></div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>{wettestDay?.date || ' - '}</div>
              </div>
              <div className="glass-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <BarChart2 size={14} style={{ color: 'var(--accent-red)' }} />
                  <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Below Baseline</span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: daysBelowBaseline > period * 0.6 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                  {daysBelowBaseline}<span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: '3px' }}>/ {period} days</span>
                </div>
                <div style={{ marginTop: '8px', height: '4px', background: 'var(--glass-border)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${(daysBelowBaseline / period) * 100}%`, height: '100%', background: daysBelowBaseline > period * 0.6 ? 'var(--accent-red)' : 'var(--accent-amber)', borderRadius: '2px', transition: 'width 0.6s ease-out' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile district modal */}
      {mobileDistrictOpen && (
        <div className="district-modal-sheet" style={{
          background: 'var(--bg-gradient, #0f172a)',
          padding: '20px',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
            <h3 style={{ margin:0 }}>Select District</h3>
            <button 
              onClick={() => setMobileDistrictOpen(false)}
              style={{ background:'transparent', border:'none', cursor:'pointer', color:'inherit' }}
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
              return (
                <button key={v._id || i} onClick={() => { setSelectedVillage(v); setMobileDistrictOpen(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', border: 'none', borderLeft: isSelected ? '3px solid var(--accent-blue)' : '3px solid transparent', cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s', background: isSelected ? 'var(--nav-active-bg)' : 'transparent', color: 'inherit' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)' }}>{v.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{v.state}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', color: getRiskLevel(v.riskScore).color, fontWeight: 800, fontSize: '12px' }}>
                    {(v.riskScore || 0).toFixed(1)}
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
