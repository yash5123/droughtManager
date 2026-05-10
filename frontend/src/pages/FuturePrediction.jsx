import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart } from 'recharts';
import { TrendingUp, AlertTriangle, Truck, CloudRain, Sun, Activity, Loader2 } from 'lucide-react';
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
            date: t.slice(5),
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
    } catch (err) { addToast(err?.response?.data?.error || 'Dispatch failed', 'error'); }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Loader2 size={40} className="spinning" style={{ color: 'var(--accent-blue)', marginBottom: '16px' }} />
        <p className="body-text" style={{ color: 'var(--text-secondary)' }}>Running Simulation Models...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <DataSourceBanner dataSource={dataSource} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Activity size={28} style={{ color: 'var(--accent-cyan)', filter: 'drop-shadow(var(--accent-cyan-glow))' }} />
          <div>
            <h2 className="title">Predictive Modeling</h2>
            <p className="body-text" style={{ color: 'var(--text-secondary)' }}>16-Day Hydrological Forecast</p>
          </div>
        </div>
        <div className="glass-pill" style={{ display: 'flex', gap: '16px', padding: '8px 16px', background: 'var(--glass-bg)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-blue)', boxShadow: 'var(--accent-blue-glow)' }}></span> Precip (mm)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf6' }}></span> Prob (%)
          </span>
        </div>
      </div>

      {forecasts.length === 0 && !loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>No forecast data available</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {forecasts.map(({ village, chartData, summary }, idx) => {
          if (!summary) return null;
          const risk = getRiskLevel(village.riskScore);
          const isCritical = summary.dryDays > 10 || summary.avgProb < 30;
          
          let alertColor = 'var(--accent-green)';
          let alertText = 'Stable Forecast';
          let alertBg = 'var(--risk-normal-tint)';
          if (summary.dryDays > 10) { alertColor = 'var(--accent-red)'; alertText = 'Extended Dry Spell'; alertBg = 'var(--risk-extreme-tint)'; }
          else if (summary.avgProb < 30) { alertColor = 'var(--accent-amber)'; alertText = 'Low Rainfall Prob'; alertBg = 'var(--risk-severe-tint)'; }
          
          return (
            <div key={village._id || idx} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
              {isCritical && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--accent-red)', boxShadow: 'var(--accent-red-glow)' }} />}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h3 className="section-header" style={{ marginBottom: '4px' }}>{village.name}</h3>
                  <p className="caption-text" style={{ color: 'var(--text-secondary)' }}>{village.district || village.region}, {village.state}</p>
                </div>
                <RiskBadge score={village.riskScore} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--divider)', padding: '12px', borderRadius: '8px' }}>
                  <p className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', marginBottom: '4px' }}><CloudRain size={12} /> Total Precip</p>
                  <p className="data-value" style={{ fontSize: '18px' }}>{summary.totalPrecip}<span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: '2px' }}>mm</span></p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--divider)', padding: '12px', borderRadius: '8px' }}>
                  <p className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', marginBottom: '4px' }}><Sun size={12} /> Dry Days</p>
                  <p className="data-value" style={{ fontSize: '18px', color: summary.dryDays > 10 ? 'var(--accent-red)' : 'var(--text-primary)' }}>{summary.dryDays}<span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>/16</span></p>
                </div>
              </div>
              
              <div style={{ height: '140px', width: '100%', marginBottom: '20px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: -10, bottom: 0, left: -25 }}>
                    <defs>
                      <linearGradient id={`colorPrecip-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id={`colorProb-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                    <YAxis yAxisId="left" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} hide />
                    
                    <Tooltip 
                      contentStyle={{ background: 'var(--glass-bg)', border: 'var(--glass-border)', backdropFilter: 'blur(10px)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: 12 }} 
                      cursor={{ stroke: 'var(--text-tertiary)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    
                    <Area yAxisId="left" type="monotone" dataKey="precip" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill={`url(#colorPrecip-${idx})`} name="Precip (mm)" />
                    <Area yAxisId="right" type="monotone" dataKey="prob" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill={`url(#colorProb-${idx})`} name="Prob (%)" />
                    
                    {isCritical && <ReferenceLine yAxisId="right" y={70} stroke="var(--accent-red)" strokeDasharray="4 4" strokeOpacity={0.5} />}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div className="glass-pill" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: 600, color: alertColor, background: alertBg, border: `1px solid ${alertColor}40` }}>
                  {summary.dryDays > 10 || summary.avgProb < 30 ? <AlertTriangle size={12} /> : <TrendingUp size={12} />}
                  {alertText}
                </div>
                
                {user ? (
                  <button className="glass-btn" onClick={() => handleDispatch(village)} style={{ padding: '6px 12px', fontSize: '11px', gap: '6px', color: 'var(--text-primary)' }}>
                    <Truck size={12} /> Preemptive Dispatch
                  </button>
                ) : (
                  <div style={{ transform: 'scale(0.85)', transformOrigin: 'right center' }}><LoginPrompt message="Sign in" /></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
