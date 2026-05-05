import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, Droplets } from 'lucide-react';
import { useVillageData } from '../context/VillageDataContext.jsx';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { getSoilMoistureLevel } from '../utils/riskLevels.js';
import { formatNumber } from '../utils/formatters.js';
import { fetchHistoricalWeather } from '../services/weatherService.js';

export default function GroundwaterAnalysis() {
  const { activeVillages, dataSource } = useVillageData();
  const [moistureData, setMoistureData] = useState([]);
  const [selectedVillage, setSelectedVillage] = useState(null);
  const [villageTrend, setVillageTrend] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeVillages.length === 0) return;
    setLoading(true);
    const fetchAll = async () => {
      const results = await Promise.all(
        activeVillages.slice(0, 15).map(async (v) => {
          if (!v.location?.lat) return { ...v, soilMoisture: null, src: 'unavailable' };
          const { data, dataSource: ws } = await fetchHistoricalWeather(v.location.lat, v.location.lng, 30);
          const sm = data?.daily?.soil_moisture_0_to_7cm_mean || [];
          const avg = sm.length > 0 ? sm.reduce((s, x) => s + (x || 0), 0) / sm.length : null;
          return { ...v, soilMoisture: avg !== null ? Math.round(avg * 10000) / 100 : null, src: ws };
        })
      );
      setMoistureData(results.sort((a, b) => (a.soilMoisture ?? 999) - (b.soilMoisture ?? 999)));
      setLoading(false);
    };
    fetchAll();
  }, [activeVillages]);

  useEffect(() => {
    if (!selectedVillage?.location?.lat) { setVillageTrend(null); return; }
    fetchHistoricalWeather(selectedVillage.location.lat, selectedVillage.location.lng, 30).then(({ data }) => {
      if (!data?.daily) { setVillageTrend(null); return; }
      setVillageTrend(data.daily.time.map((t, i) => ({
        date: t.slice(5),
        moisture: Math.round((data.daily.soil_moisture_0_to_7cm_mean?.[i] || 0) * 10000) / 100,
      })));
    });
  }, [selectedVillage]);

  const chartData = useMemo(() => moistureData.filter(v => v.soilMoisture !== null).map(v => {
    const level = getSoilMoistureLevel(v.soilMoisture);
    return { name: v.name.length > 10 ? v.name.slice(0, 9) + '…' : v.name, value: v.soilMoisture, color: level.color };
  }), [moistureData]);

  return (
    <div className="space-y-5 animate-fade-in">
      <DataSourceBanner dataSource={dataSource} />

      {/* Disclaimer */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border"
        style={{ backgroundColor: 'rgba(245, 158, 11, 0.06)', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-400">Soil Moisture ≠ Water Table Depth</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            This page displays satellite-derived soil moisture data (0–7 cm surface layer), not actual groundwater table depth.
            Real aquifer monitoring requires in-situ piezometer sensors. Soil moisture serves as a supplementary drought indicator only.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-display mb-3">Soil Moisture Comparison (%)</h3>
          {loading ? (
            <div className="flex items-center justify-center h-64"><div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-cyan)', borderTopColor: 'transparent' }} /></div>
          ) : chartData.length === 0 ? (
            <EmptyState icon={Droplets} title="No soil moisture data" description="Weather proxy may be unavailable." />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#556380', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#556380', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#111a2e', border: '1px solid #1e2d4a', borderRadius: 8, color: '#e8edf5', fontSize: 12 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-display mb-3">Trend (30 Days)</h3>
          {selectedVillage && villageTrend ? (
            <div className="animate-slide-up">
              <p className="text-sm font-medium mb-2">{selectedVillage.name}</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={villageTrend}>
                  <XAxis dataKey="date" tick={{ fill: '#556380', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#556380', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111a2e', border: '1px solid #1e2d4a', borderRadius: 8, color: '#e8edf5', fontSize: 11 }} />
                  <Line type="monotone" dataKey="moisture" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)]">Click a village below to see trend</p>
          )}
        </div>
      </div>

      {/* Village Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {moistureData.map((v, i) => {
          const level = v.soilMoisture !== null ? getSoilMoistureLevel(v.soilMoisture) : null;
          return (
            <button key={v._id || i} onClick={() => setSelectedVillage(v)}
              className={`card p-3 text-left card-hover ${selectedVillage?._id === v._id ? 'border-[var(--color-cyan)]' : ''}`}>
              <div className="flex justify-between items-start">
                <div><p className="text-sm font-medium">{v.name}</p><p className="text-[10px] text-[var(--color-text-muted)]">{v.state}</p></div>
                {level && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: level.color + '20', color: level.color }}>{level.label}</span>}
              </div>
              <p className="text-lg font-bold font-mono mt-2">
                {v.soilMoisture !== null ? `${v.soilMoisture.toFixed(1)}%` : '—'}
                <span className="text-xs font-normal text-[var(--color-text-muted)] ml-1">surface moisture</span>
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
