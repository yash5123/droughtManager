import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Download, CloudRain, ArrowDownRight, ArrowUpRight, Loader2 } from 'lucide-react';
import { useVillageData } from '../context/VillageDataContext.jsx';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

import { exportToCSV } from '../utils/csv.js';
import { fetchHistoricalWeather } from '../services/weatherService.js';

const PERIODS = [{ label: '7 Days', days: 7 }, { label: '30 Days', days: 30 }, { label: '90 Days', days: 90 }];

export default function RainfallAnalysis() {
  const { activeVillages, dataSource } = useVillageData();
  const [period, setPeriod] = useState(30);
  const [rainfallData, setRainfallData] = useState([]);
  const [selectedVillage, setSelectedVillage] = useState(null);
  const [villageTimeSeries, setVillageTimeSeries] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeVillages.length === 0) return;
    setLoading(true);
    const fetchAll = async () => {
      const results = await Promise.all(
        activeVillages.slice(0, 15).map(async (v) => {
          if (!v.location?.lat) return { ...v, totalRain: 0, deficit: 0, expected: 0, weatherSource: 'unavailable' };
          const { data, dataSource: ws } = await fetchHistoricalWeather(v.location.lat, v.location.lng, period);
          const precip = data?.daily?.precipitation_sum || [];
          const total = precip.reduce((s, val) => s + (val || 0), 0);
          const expected = (v.avgAnnualRainfall || 600) * (period / 365);
          const deficit = expected > 0 ? Math.round(((expected - total) / expected) * 100) : 0;
          return { ...v, totalRain: Math.round(total * 10) / 10, expected: Math.round(expected), deficit, weatherSource: ws };
        })
      );
      const sorted = results.sort((a, b) => b.deficit - a.deficit);
      setRainfallData(sorted);
      if (!selectedVillage && sorted.length > 0) {
        setSelectedVillage(sorted[0]);
      }
      setLoading(false);
    };
    fetchAll();
  }, [activeVillages, period]);

  useEffect(() => {
    if (!selectedVillage?.location?.lat) { setVillageTimeSeries(null); return; }
    fetchHistoricalWeather(selectedVillage.location.lat, selectedVillage.location.lng, period).then(({ data }) => {
      if (!data?.daily) { setVillageTimeSeries(null); return; }
      const ts = data.daily.time.map((t, i) => ({
        date: t.slice(5),
        rain: data.daily.precipitation_sum?.[i] || 0,
      }));
      setVillageTimeSeries(ts);
    });
  }, [selectedVillage, period]);

  const handleExport = () => {
    exportToCSV(rainfallData.map(v => ({ Village: v.name, State: v.state, 'Total Rain (mm)': v.totalRain, 'Deficit %': v.deficit })), `rainfall_${period}d`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px' }}>
      <DataSourceBanner dataSource={dataSource} />
      
      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CloudRain size={24} style={{ color: 'var(--accent-blue)', filter: 'drop-shadow(var(--accent-blue-glow))' }} />
          <h2 className="title" style={{ fontSize: '24px' }}>Hydrological Precipitation</h2>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="glass-pill" style={{ display: 'flex', padding: '4px' }}>
            {PERIODS.map(p => (
              <button key={p.days} onClick={() => setPeriod(p.days)}
                style={{
                  padding: '6px 16px', borderRadius: '9999px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                  background: period === p.days ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: period === p.days ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  transition: 'all 0.2s'
                }}>
                {p.label}
              </button>
            ))}
          </div>
          
          <button className="glass-btn" onClick={handleExport} style={{ padding: '6px 16px', gap: '8px', fontSize: '12px', fontWeight: 600 }}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        
        {/* Left Column: List */}
        <div className="glass-card" style={{ width: '350px', display: 'flex', flexDirection: 'column', padding: '16px' }}>
          <h3 className="section-header" style={{ marginBottom: '16px' }}>Monitored Districts</h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '8px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 className="spinning" style={{ color: 'var(--accent-blue)' }} /></div>
            ) : rainfallData.length === 0 ? (
               <EmptyState title="No rainfall data" description="Weather proxy may be unavailable." />
            ) : (
              rainfallData.map((v, i) => {
                const isSelected = selectedVillage?._id === v._id;
                
                return (
                  <button key={v._id || i} onClick={() => setSelectedVillage(v)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '12px',
                      background: isSelected ? 'var(--nav-active-bg)' : 'transparent',
                      border: 'none', borderLeft: isSelected ? '3px solid var(--accent-blue)' : '3px solid transparent',
                      cursor: 'pointer', textAlign: 'left', transition: 'var(--transition-default)',
                      boxShadow: isSelected ? 'var(--glass-shadow-elevated)' : 'none'
                    }}
                    onMouseEnter={(e) => { if(!isSelected) e.currentTarget.style.background = 'var(--nav-hover-bg)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { if(!isSelected) e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'none'; }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)' }}>{v.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Avg: {v.expected}mm</div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: v.deficit > 0 ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: 600, fontSize: '13px' }}>
                      {v.deficit > 0 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                      {Math.abs(v.deficit)}%
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chart */}
        <div className="glass-card" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedVillage?.name || 'Select a region'}</h3>
              <p className="caption-text" style={{ color: 'var(--text-secondary)' }}>Time Series Rainfall Data</p>
            </div>
            {selectedVillage && (
              <div className="glass-pill" style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', background: 'var(--accent-blue)20', border: '1px solid var(--accent-blue)40' }}>
                 <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Total Precipitation</span>
                 <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-blue)', filter: 'drop-shadow(var(--accent-blue-glow))' }}>{selectedVillage.totalRain} mm</span>
              </div>
            )}
          </div>
          
          <div style={{ flex: 1, minHeight: '200px', position: 'relative' }}>
            {villageTimeSeries ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={villageTimeSeries} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--glass-bg)', border: 'var(--glass-border)', backdropFilter: 'blur(10px)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: 12 }} 
                    itemStyle={{ color: 'var(--accent-blue)' }}
                    cursor={{ stroke: 'var(--text-tertiary)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area type="monotone" dataKey="rain" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRain)" style={{ filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.5))' }} activeDot={{ r: 5, fill: '#3b82f6', stroke: 'var(--glass-bg)', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                {loading ? <Loader2 className="spinning" size={32} style={{ color: 'var(--accent-blue)' }} /> : <p style={{ color: 'var(--text-tertiary)' }}>No data</p>}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
