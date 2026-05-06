import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Download, CloudRain, ArrowDownRight, ArrowUpRight } from 'lucide-react';
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const fetchAll = async () => {
      const results = await Promise.all(
        activeVillages.slice(0, 15).map(async (v) => {
          if (!v.location?.lat) return { ...v, totalRain: 0, deficit: 0, expected: 0, weatherSource: 'unavailable' };
          const { data, dataSource: ws } = await fetchHistoricalWeather(v.location.lat, v.location.lng, period);
          const precip = data?.daily?.precipitation_sum || [];
          const total = precip.reduce((s, val) => s + (val || 0), 0);
          const expected = (v.avgAnnualRainfall || 600) * (period / 365);
          const deficit = Math.round(((expected - total) / expected) * 100);
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
  }, [activeVillages, period, selectedVillage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto h-full flex flex-col">
      <DataSourceBanner dataSource={dataSource} />
      
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-[var(--color-surface-container)] p-3 rounded-xl border border-[var(--color-outline-variant)]">
        <div className="flex items-center gap-4">
          <CloudRain className="w-5 h-5 text-[var(--color-primary)]" />
          <h2 className="text-sm font-semibold text-display text-[var(--color-on-surface)]">Hydrological Precipitation Tracking</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 p-1 rounded-lg bg-[var(--color-surface-container-highest)] border border-[var(--color-outline-variant)]">
            {PERIODS.map(p => (
              <button key={p.days} onClick={() => setPeriod(p.days)}
                className="px-4 py-1.5 rounded text-xs font-semibold transition-all"
                style={{ 
                  backgroundColor: period === p.days ? 'var(--color-primary)' : 'transparent', 
                  color: period === p.days ? 'var(--color-on-primary)' : 'var(--color-on-surface-variant)',
                  boxShadow: period === p.days ? '0 0 10px rgba(76,215,246,0.3)' : 'none'
                }}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-[var(--color-outline-variant)]"></div>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors hover:bg-[var(--color-surface-container-highest)]"
            style={{ color: 'var(--color-primary)', border: '1px solid var(--color-outline-variant)' }}>
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        {/* Left Column: Data Cards */}
        <div className="lg:col-span-4 flex flex-col gap-3 h-[calc(100vh-220px)] overflow-y-auto hide-scrollbar pb-10">
          {loading ? (
            <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin border-[var(--color-primary)]" style={{ borderTopColor: 'transparent' }} /></div>
          ) : rainfallData.length === 0 ? (
             <EmptyState title="No rainfall data" description="Weather proxy may be unavailable." />
          ) : (
            rainfallData.map((v, i) => {
              const isSelected = selectedVillage?._id === v._id;
              const defColor = v.deficit > 50 ? 'var(--color-error)' : v.deficit > 25 ? 'var(--color-tertiary)' : 'var(--color-success)';
              const defBg = v.deficit > 50 ? 'rgba(255, 180, 171, 0.1)' : v.deficit > 25 ? 'rgba(255, 184, 115, 0.1)' : 'rgba(34, 197, 94, 0.1)';
              
              return (
                <button key={v._id || i} onClick={() => setSelectedVillage(v)}
                  className={`card p-4 text-left transition-all relative overflow-hidden group ${isSelected ? 'bg-[var(--color-surface-container-high)] border-[var(--color-primary)]' : 'bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-low)] border-[var(--color-outline-variant)]'}`}
                  style={{ boxShadow: isSelected ? '0 0 15px rgba(76,215,246,0.15)' : 'none' }}>
                  
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary)]" />}
                  
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--color-on-surface)]">{v.name}</h3>
                      <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wide">{v.state}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono font-bold" style={{ backgroundColor: defBg, color: defColor }}>
                      {v.deficit > 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                      {Math.abs(v.deficit)}%
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-0.5">Accumulation</p>
                      <p className="text-lg font-mono font-bold text-[var(--color-on-surface)]">{v.totalRain} <span className="text-[10px] font-sans font-normal text-[var(--color-outline)]">mm</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-0.5">Hist. Avg</p>
                      <p className="text-lg font-mono font-bold text-[var(--color-on-surface-variant)]">{v.expected} <span className="text-[10px] font-sans font-normal text-[var(--color-outline)]">mm</span></p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right Column: Large Chart */}
        <div className="lg:col-span-8 card bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] flex flex-col" style={{ minHeight: '500px' }}>
          <div className="p-5 border-b border-[var(--color-outline-variant)] flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-display text-[var(--color-on-surface)]">{selectedVillage?.name || 'Select a region'}</h3>
              <p className="text-xs text-[var(--color-on-surface-variant)]">Time Series Rainfall Data ({period} Days)</p>
            </div>
            {selectedVillage && (
              <div className="px-4 py-2 bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)] rounded-lg">
                 <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-0.5 text-right">Total Precipitation</p>
                 <p className="text-xl font-mono font-bold text-[var(--color-primary)]">{selectedVillage.totalRain} mm</p>
              </div>
            )}
          </div>
          
          <div className="flex-1 p-5 relative">
            {villageTimeSeries ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={villageTimeSeries} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: 'var(--color-outline)', fontSize: 11 }} axisLine={{ stroke: 'var(--color-outline-variant)' }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: 'var(--color-outline)', fontSize: 11 }} axisLine={{ stroke: 'var(--color-outline-variant)' }} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-surface-container-highest)', border: '1px solid var(--color-outline-variant)', borderRadius: 8, color: 'var(--color-on-surface)', fontSize: 12 }} 
                    itemStyle={{ color: 'var(--color-primary)' }}
                  />
                  <Area type="monotone" dataKey="rain" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorRain)" activeDot={{ r: 6, fill: 'var(--color-primary)', stroke: 'var(--color-bg-base)', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                {loading ? (
                  <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin border-[var(--color-primary)]" style={{ borderTopColor: 'transparent' }} />
                ) : (
                  <p className="text-sm text-[var(--color-on-surface-variant)]">No time series data available.</p>
                )}
              </div>
            )}
            
            {/* Ambient background glow for the chart area */}
            {villageTimeSeries && <div className="absolute inset-0 bg-[var(--color-primary)]/5 pointer-events-none blur-[100px] rounded-full opacity-30 transform scale-75"></div>}
          </div>
        </div>

      </div>
    </div>
  );
}
