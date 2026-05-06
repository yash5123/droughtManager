import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AlertTriangle, Droplets, ArrowRight } from 'lucide-react';
import { useVillageData } from '../context/VillageDataContext.jsx';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { getSoilMoistureLevel } from '../utils/riskLevels.js';
import { fetchHistoricalWeather } from '../services/weatherService.js';

export default function GroundwaterAnalysis() {
  const { activeVillages, dataSource } = useVillageData();
  const [moistureData, setMoistureData] = useState([]);
  const [selectedVillage, setSelectedVillage] = useState(null);
  const [villageTrend, setVillageTrend] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeVillages.length === 0) return;
    const fetchAll = async () => {
      setLoading(true);
      const results = await Promise.all(
        activeVillages.slice(0, 15).map(async (v) => {
          if (!v.location?.lat) return { ...v, soilMoisture: null, src: 'unavailable' };
          const { data, dataSource: ws } = await fetchHistoricalWeather(v.location.lat, v.location.lng, 30);
          const sm = data?.daily?.soil_moisture_0_to_7cm_mean || [];
          const avg = sm.length > 0 ? sm.reduce((s, x) => s + (x || 0), 0) / sm.length : null;
          return { ...v, soilMoisture: avg !== null ? Math.round(avg * 10000) / 100 : null, src: ws };
        })
      );
      const sorted = results.sort((a, b) => (a.soilMoisture ?? 999) - (b.soilMoisture ?? 999));
      setMoistureData(sorted);
      setSelectedVillage(prev => !prev ? sorted[0] : prev);
      setLoading(false);
    };
    fetchAll();
  }, [activeVillages]);

  useEffect(() => {
    const fetchTrend = async () => {
      if (!selectedVillage?.location?.lat) { setVillageTrend(null); return; }
      const { data } = await fetchHistoricalWeather(selectedVillage.location.lat, selectedVillage.location.lng, 30);
      if (!data?.daily) { setVillageTrend(null); return; }
      setVillageTrend(data.daily.time.map((t, i) => ({
        date: t.slice(5),
        moisture: Math.round((data.daily.soil_moisture_0_to_7cm_mean?.[i] || 0) * 10000) / 100,
      })));
    };
    fetchTrend();
  }, [selectedVillage]);

  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto flex flex-col h-full">
      <DataSourceBanner dataSource={dataSource} />

      {/* Header & Disclaimer */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Droplets className="w-6 h-6 text-[var(--color-primary)]" />
          <div>
            <h2 className="text-base font-bold text-display text-[var(--color-on-surface)]">Subsurface Hydrology</h2>
            <p className="text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider">30-Day Moisture Analysis</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] max-w-xl">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="text-[10px] text-amber-400 leading-tight">
            <strong className="font-semibold">Notice:</strong> Displaying satellite-derived soil moisture (0–7 cm surface layer). Real aquifer monitoring requires in-situ piezometer sensors. Use as a supplementary indicator only.
          </p>
        </div>
      </div>

      {/* Top Half: Large Chart */}
      <div className="card p-5 border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] flex-1 min-h-[400px] flex flex-col relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div>
            <h3 className="text-lg font-bold text-display text-[var(--color-on-surface)]">{selectedVillage?.name || 'Loading...'}</h3>
            <p className="text-xs text-[var(--color-on-surface-variant)]">Surface Soil Moisture Trend (%)</p>
          </div>
          {selectedVillage && selectedVillage.soilMoisture !== null && (
            <div className="text-right">
              <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider">Current Avg</p>
              <p className="text-xl font-mono font-bold" style={{ color: getSoilMoistureLevel(selectedVillage.soilMoisture).color }}>
                {selectedVillage.soilMoisture.toFixed(1)}%
              </p>
            </div>
          )}
        </div>

        <div className="flex-1 relative z-10">
          {villageTrend ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={villageTrend} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--color-outline)', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'var(--color-outline)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-surface-container-highest)', border: '1px solid var(--color-outline-variant)', borderRadius: 8, color: 'var(--color-on-surface)', fontSize: 12 }} 
                  itemStyle={{ color: 'var(--color-secondary)' }}
                />
                <Line type="monotone" dataKey="moisture" stroke="var(--color-secondary)" strokeWidth={3} dot={{ fill: 'var(--color-bg-base)', stroke: 'var(--color-secondary)', strokeWidth: 2, r: 4 }} activeDot={{ r: 7, strokeWidth: 0, fill: 'var(--color-primary)' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              {loading ? (
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin border-[var(--color-primary)]" style={{ borderTopColor: 'transparent' }} />
              ) : (
                <EmptyState icon={Droplets} title="No trend data" description="Weather proxy may be unavailable." />
              )}
            </div>
          )}
        </div>
        
        {/* Glow */}
        <div className="absolute inset-0 bg-[var(--color-secondary)]/5 pointer-events-none blur-[100px] opacity-30 transform scale-90 z-0"></div>
      </div>

      {/* Bottom Half: Horizontal Scrolling Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-display text-[var(--color-on-surface)]">Regional Comparison</h3>
          <span className="text-xs text-[var(--color-on-surface-variant)] flex items-center gap-1">Scroll <ArrowRight className="w-3 h-3" /></span>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x">
          {moistureData.map((v, i) => {
            const level = v.soilMoisture !== null ? getSoilMoistureLevel(v.soilMoisture) : null;
            const isSelected = selectedVillage?._id === v._id;
            
            return (
              <button key={v._id || i} onClick={() => setSelectedVillage(v)}
                className={`flex-shrink-0 w-64 card p-4 text-left transition-all relative overflow-hidden group snap-start ${isSelected ? 'bg-[var(--color-surface-container-high)] border-[var(--color-secondary)]' : 'bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-low)] border-[var(--color-outline-variant)]'}`}
                style={{ boxShadow: isSelected ? '0 0 15px rgba(187,199,223,0.1)' : 'none' }}>
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm font-bold text-[var(--color-on-surface)] truncate w-32">{v.name}</p>
                    <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wide">{v.district || v.region}</p>
                  </div>
                  {level && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded" style={{ backgroundColor: level.color + '15', color: level.color }}>
                      {level.label}
                    </span>
                  )}
                </div>
                
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-1">Avg Moisture</p>
                    <p className="text-2xl font-mono font-bold text-[var(--color-on-surface)]">
                      {v.soilMoisture !== null ? v.soilMoisture.toFixed(1) : '—'}
                      <span className="text-sm font-sans font-normal text-[var(--color-outline)] ml-1">%</span>
                    </p>
                  </div>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-[var(--color-secondary)] shadow-[0_0_8px_var(--color-secondary)]"></div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
    </div>
  );
}
