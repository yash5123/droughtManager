import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Download, CloudRain } from 'lucide-react';
import { useVillageData } from '../context/VillageDataContext.jsx';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { formatNumber } from '../utils/formatters.js';
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
          if (!v.location?.lat) return { ...v, totalRain: 0, deficit: 0, weatherSource: 'unavailable' };
          const { data, dataSource: ws } = await fetchHistoricalWeather(v.location.lat, v.location.lng, period);
          const precip = data?.daily?.precipitation_sum || [];
          const total = precip.reduce((s, val) => s + (val || 0), 0);
          const expected = (v.avgAnnualRainfall || 600) * (period / 365);
          const deficit = Math.round(((expected - total) / expected) * 100);
          return { ...v, totalRain: Math.round(total * 10) / 10, deficit, weatherSource: ws };
        })
      );
      setRainfallData(results.sort((a, b) => b.deficit - a.deficit));
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

  const chartData = useMemo(() => rainfallData.map(v => ({
    name: v.name.length > 10 ? v.name.slice(0, 9) + '…' : v.name,
    total: v.totalRain,
    deficit: v.deficit,
    color: v.deficit > 50 ? '#ef4444' : v.deficit > 25 ? '#f97316' : v.deficit > 0 ? '#eab308' : '#22c55e',
  })), [rainfallData]);

  const handleExport = () => {
    exportToCSV(rainfallData.map(v => ({ Village: v.name, State: v.state, 'Total Rain (mm)': v.totalRain, 'Deficit %': v.deficit })), `rainfall_${period}d`);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <DataSourceBanner dataSource={dataSource} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 p-0.5 rounded-lg" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          {PERIODS.map(p => (
            <button key={p.days} onClick={() => setPeriod(p.days)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
              style={{ backgroundColor: period === p.days ? 'var(--color-cyan)' : 'transparent', color: period === p.days ? 'var(--color-bg-base)' : 'var(--color-text-muted)' }}>
              {p.label}
            </button>
          ))}
        </div>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:border-[var(--color-cyan)]"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-display mb-3">Rainfall Deficit by Village</h3>
          {loading ? (
            <div className="flex items-center justify-center h-64"><div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-cyan)', borderTopColor: 'transparent' }} /></div>
          ) : chartData.length === 0 ? (
            <EmptyState title="No rainfall data" description="Weather proxy may be unavailable." />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#556380', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#556380', fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: 'mm', position: 'insideTopLeft', style: { fill: '#556380', fontSize: 10 } }} />
                <Tooltip contentStyle={{ backgroundColor: '#111a2e', border: '1px solid #1e2d4a', borderRadius: 8, color: '#e8edf5', fontSize: 12 }} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-display mb-3">Village Detail</h3>
          {selectedVillage && villageTimeSeries ? (
            <div className="space-y-3 animate-slide-up">
              <p className="text-sm font-medium">{selectedVillage.name}</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={villageTimeSeries}>
                  <XAxis dataKey="date" tick={{ fill: '#556380', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#556380', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111a2e', border: '1px solid #1e2d4a', borderRadius: 8, color: '#e8edf5', fontSize: 11 }} />
                  <Line type="monotone" dataKey="rain" stroke="#06b6d4" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)]">Click a row below to see time series</p>
          )}
        </div>
      </div>

      {/* Village Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rainfallData.map((v, i) => (
          <button key={v._id || i} onClick={() => setSelectedVillage(v)}
            className={`card p-3 text-left card-hover transition-all ${selectedVillage?._id === v._id ? 'border-[var(--color-cyan)]' : ''}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{v.name}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">{v.state}</p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded"
                style={{ backgroundColor: v.deficit > 50 ? '#ef444420' : v.deficit > 25 ? '#f9731620' : '#22c55e20', color: v.deficit > 50 ? '#ef4444' : v.deficit > 25 ? '#f97316' : '#22c55e' }}>
                {v.deficit > 0 ? `-${v.deficit}%` : `+${Math.abs(v.deficit)}%`}
              </span>
            </div>
            <p className="text-lg font-bold font-mono mt-2">{v.totalRain} <span className="text-xs font-normal text-[var(--color-text-muted)]">mm</span></p>
          </button>
        ))}
      </div>
    </div>
  );
}
