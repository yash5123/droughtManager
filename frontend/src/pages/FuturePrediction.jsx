import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart, CartesianGrid } from 'recharts';
import { TrendingUp, AlertTriangle, Truck, CloudRain, Sun, Activity, CalendarDays, BarChart2 } from 'lucide-react';
import { useVillageData } from '../context/VillageDataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';
import LoginPrompt from '../components/ui/LoginPrompt.jsx';
import RiskBadge from '../components/ui/RiskBadge.jsx';
import { fetchForecast } from '../services/weatherService.js';
import { getRiskLevel } from '../utils/riskLevels.js';
import api from '../services/api.js';

export default function FuturePrediction() {
  const { activeVillages, dataSource } = useVillageData();
  const { user, openLoginModal } = useAuth();
  const { addToast } = useToast();
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeVillages.length === 0) return;
    const load = async () => {
      setLoading(true);
      const results = await Promise.all(
        activeVillages.slice(0, 10).map(async (v) => {
          if (!v.location?.lat) return { village: v, chartData: [], summary: null };
          const { data } = await fetchForecast(v.location.lat, v.location.lng);
          if (!data?.daily) return { village: v, chartData: [], summary: null };
          const chartData = data.daily.time.map((t, i) => ({
            date: t.slice(5), // MM-DD
            precip: data.daily.precipitation_sum?.[i] || 0,
            prob: data.daily.precipitation_probability_max?.[i] || 0,
            tempMax: data.daily.temperature_2m_max?.[i] || 0,
          }));
          const totalPrecip = chartData.reduce((s, d) => s + d.precip, 0);
          const avgProb = chartData.reduce((s, d) => s + d.prob, 0) / chartData.length;
          const dryDays = chartData.filter(d => d.precip < 0.5).length;
          const maxTemp = Math.max(...chartData.map(d => d.tempMax));
          return { village: v, chartData, summary: { totalPrecip: Math.round(totalPrecip * 10) / 10, avgProb: Math.round(avgProb), dryDays, maxTemp: Math.round(maxTemp) } };
        })
      );
      setForecasts(results);
      setLoading(false);
    };
    load();
  }, [activeVillages]);

  const handleDispatch = async (village) => {
    if (!user) { openLoginModal(); return; }
    try {
      await api.post('/tanker', { village: village.name, capacityLiters: 10000, dispatchDate: new Date().toISOString() });
      addToast(`Tanker dispatched to ${village.name}`, 'success');
    } catch (err) { addToast(err.response?.data?.error || 'Dispatch failed', 'error'); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
        <p className="text-xs font-mono text-[var(--color-on-surface-variant)] uppercase tracking-widest animate-pulse">Running Simulation Models...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      <DataSourceBanner dataSource={dataSource} />
      
      <div className="flex items-center justify-between mb-2 border-b border-[var(--color-outline-variant)] pb-3">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-[var(--color-secondary)]" />
          <div>
            <h2 className="text-base font-bold text-display text-[var(--color-on-surface)]">Predictive Modeling</h2>
            <p className="text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider">16-Day Hydrological Forecast</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 text-[10px] font-mono text-[var(--color-on-surface-variant)]">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></span> Precipitation (mm)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--color-tertiary)]"></span> Probability (%)</span>
        </div>
      </div>

      {forecasts.length === 0 && !loading && (
        <div className="card p-8 border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">No forecast data available</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {forecasts.map(({ village, chartData, summary }, idx) => {
          if (!summary) return null;
          const risk = getRiskLevel(village.riskScore);
          const isCritical = summary.dryDays > 10 || summary.avgProb < 30;
          
          return (
            <div key={village._id || idx} className={`card p-5 border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] animate-slide-up relative overflow-hidden group`} style={{ animationDelay: `${idx * 50}ms` }}>
              {/* Dynamic glowing background based on risk */}
              <div className="absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full opacity-10 pointer-events-none transition-all group-hover:opacity-20" style={{ backgroundColor: risk.color }}></div>
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: risk.color }}></div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 relative z-10 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-display text-[var(--color-on-surface)]">{village.name}</h3>
                    <RiskBadge score={village.riskScore} />
                  </div>
                  <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-widest">{village.district || village.region}, {village.state}</p>
                </div>
                
                <div className="flex gap-2">
                  <div className="bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded px-3 py-1.5 text-center">
                    <p className="text-[9px] uppercase text-[var(--color-on-surface-variant)] mb-0.5 flex items-center gap-1 justify-center"><CloudRain className="w-2.5 h-2.5 text-[var(--color-primary)]"/> Total Precip</p>
                    <p className="text-sm font-mono font-bold text-[var(--color-on-surface)]">{summary.totalPrecip}<span className="text-[9px] font-sans ml-0.5 text-[var(--color-on-surface-variant)]">mm</span></p>
                  </div>
                  <div className="bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded px-3 py-1.5 text-center">
                    <p className="text-[9px] uppercase text-[var(--color-on-surface-variant)] mb-0.5 flex items-center gap-1 justify-center"><Sun className="w-2.5 h-2.5 text-[var(--color-error)]"/> Dry Days</p>
                    <p className={`text-sm font-mono font-bold ${summary.dryDays > 10 ? 'text-[var(--color-error)]' : 'text-[var(--color-tertiary)]'}`}>{summary.dryDays}<span className="text-[9px] font-sans ml-0.5 text-[var(--color-on-surface-variant)]">/16</span></p>
                  </div>
                </div>
              </div>
              
              <div className="relative z-10 h-[220px] mb-4 bg-[var(--color-surface-container-low)] rounded-md border border-[var(--color-outline-variant)] p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id={`colorPrecip-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id={`colorProb-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-tertiary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-tertiary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 9 }} axisLine={{ stroke: 'var(--color-outline-variant)' }} tickLine={false} interval={2} />
                    <YAxis yAxisId="left" tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 9 }} axisLine={false} tickLine={false} hide />
                    
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--color-surface-container-highest)', border: '1px solid var(--color-outline-variant)', borderRadius: 4, color: 'var(--color-on-surface)', fontSize: 11, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }} 
                      itemStyle={{ fontWeight: 'bold' }}
                      cursor={{ stroke: 'var(--color-on-surface-variant)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    
                    <Area yAxisId="left" type="monotone" dataKey="precip" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill={`url(#colorPrecip-${idx})`} name="Precip (mm)" />
                    <Area yAxisId="right" type="monotone" dataKey="prob" stroke="var(--color-tertiary)" strokeWidth={2} fillOpacity={1} fill={`url(#colorProb-${idx})`} name="Prob (%)" />
                    
                    {isCritical && <ReferenceLine yAxisId="right" y={70} stroke="var(--color-error)" strokeDasharray="4 4" strokeOpacity={0.5} />}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10 pt-3 border-t border-[var(--color-outline-variant)]">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider w-full sm:w-auto ${
                    summary.dryDays > 10 ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    summary.avgProb < 30 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                  {summary.dryDays > 10 ? <><AlertTriangle className="w-3.5 h-3.5"/> Extended Dry Spell</> :
                   summary.avgProb < 30 ? <><AlertTriangle className="w-3.5 h-3.5"/> Low Rainfall Prob</> :
                   <><TrendingUp className="w-3.5 h-3.5"/> Stable Forecast</>}
                </div>
                
                {user ? (
                  <button onClick={() => handleDispatch(village)}
                    className="w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all border border-[var(--color-outline-variant)] hover:border-[var(--color-secondary)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-bg-base)] text-[var(--color-secondary)]">
                    <Truck className="w-3.5 h-3.5" /> Preemptive Dispatch
                  </button>
                ) : (
                  <div className="w-full sm:w-auto"><LoginPrompt message="Sign in" /></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
