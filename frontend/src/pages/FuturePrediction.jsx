import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart } from 'recharts';
import { TrendingUp, AlertTriangle, Truck } from 'lucide-react';
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
    setLoading(true);
    const load = async () => {
      const results = await Promise.all(
        activeVillages.slice(0, 10).map(async (v) => {
          if (!v.location?.lat) return { village: v, chartData: [], summary: null };
          const { data } = await fetchForecast(v.location.lat, v.location.lng);
          if (!data?.daily) return { village: v, chartData: [], summary: null };
          const chartData = data.daily.time.map((t, i) => ({
            date: t.slice(5),
            precip: data.daily.precipitation_sum?.[i] || 0,
            prob: data.daily.precipitation_probability_max?.[i] || 0,
          }));
          const totalPrecip = chartData.reduce((s, d) => s + d.precip, 0);
          const avgProb = chartData.reduce((s, d) => s + d.prob, 0) / chartData.length;
          const dryDays = chartData.filter(d => d.precip < 0.5).length;
          return { village: v, chartData, summary: { totalPrecip: Math.round(totalPrecip * 10) / 10, avgProb: Math.round(avgProb), dryDays } };
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
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-cyan)', borderTopColor: 'transparent' }} /></div>;
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <DataSourceBanner dataSource={dataSource} />
      {forecasts.length === 0 && !loading && (
        <div className="card p-8 text-center"><p className="text-sm text-[var(--color-text-muted)]">No forecast data available</p></div>
      )}
      <div className="space-y-4">
        {forecasts.map(({ village, chartData, summary }, idx) => {
          if (!summary) return null;
          const risk = getRiskLevel(village.riskScore);
          return (
            <div key={village._id || idx} className="card p-4 animate-slide-up" style={{ animationDelay: `${idx * 50}ms`, borderLeft: `3px solid ${risk.color}` }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-display">{village.name}</h3>
                    <RiskBadge score={village.riskScore} />
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)]">{village.district || village.region}, {village.state}</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-mono"><span className="text-blue-400">{summary.totalPrecip}</span> mm expected</span>
                  <span className="font-mono"><span className="text-amber-400">{summary.dryDays}</span>/16 dry days</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: '#556380', fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis yAxisId="left" tick={{ fill: '#556380', fontSize: 9 }} axisLine={false} tickLine={false} label={{ value: 'mm', position: 'insideTopLeft', style: { fill: '#556380', fontSize: 9 } }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: '#556380', fontSize: 9 }} axisLine={false} tickLine={false} label={{ value: '%', position: 'insideTopRight', style: { fill: '#556380', fontSize: 9 } }} />
                  <Tooltip contentStyle={{ backgroundColor: '#111a2e', border: '1px solid #1e2d4a', borderRadius: 8, color: '#e8edf5', fontSize: 11 }} />
                  <ReferenceLine yAxisId="right" y={70} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Critical', position: 'right', fill: '#ef4444', fontSize: 9 }} />
                  <Bar yAxisId="left" dataKey="precip" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={16} name="Precip (mm)" />
                  <Line yAxisId="right" type="monotone" dataKey="prob" stroke="#f97316" strokeWidth={2} dot={false} name="Prob (%)" />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-[var(--color-text-muted)]">
                  {summary.dryDays > 10 ? '⚠ Extended dry spell projected — consider preemptive dispatch' :
                   summary.avgProb < 30 ? '⚠ Low rainfall probability — monitor closely' :
                   '✓ Moderate rainfall expected'}
                </p>
                {user ? (
                  <button onClick={() => handleDispatch(village)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ backgroundColor: 'rgba(6,182,212,0.1)', color: 'var(--color-cyan)' }}>
                    <Truck className="w-3.5 h-3.5" /> Dispatch
                  </button>
                ) : (
                  <LoginPrompt message="Sign in" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
