import React, { useState, useEffect, useMemo } from 'react';
import { ComposedChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle, Truck, CloudRain, Sun, Activity, Loader2, ArrowUpDown, Filter } from 'lucide-react';
import { useVillageData } from '../context/VillageDataContext.jsx';
import { useRankedVillages, useSeedingStatus } from '../hooks/useRiskData.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';
import RiskBadge from '../components/ui/RiskBadge.jsx';
import { fetchForecast } from '../services/weatherService.js';
import { getRiskLevel } from '../utils/riskLevels.js';
import api from '../services/api.js';

export default function FuturePrediction() {
  const { villageCount } = useVillageData();
  const { data: rankedData, isLoading } = useRankedVillages(1000);
  const { data: seedingStatus } = useSeedingStatus();
  
  const [riskFilter, setRiskFilter] = useState('All');
  const [limit, setLimit] = useState(25);
  const [sortOrder, setSortOrder] = useState('desc');
  
  const riskData = rankedData?.data || [];
  const villages = useMemo(() => riskData.slice(0, villageCount), [riskData, villageCount]);

  // Apply filters and sorting
  const filteredVillages = useMemo(() => {
    let list = [...villages];
    
    // 1. Risk Filter
    if (riskFilter !== 'All') {
      list = list.filter(v => getRiskLevel(v.riskScore).label === riskFilter);
    }
    
    // 2. Sort by riskScore
    list.sort((a, b) => {
      const diff = (b.riskScore || 0) - (a.riskScore || 0);
      return sortOrder === 'desc' ? diff : -diff;
    });
    
    // 3. Limit
    if (limit !== 'All') {
      list = list.slice(0, Number(limit));
    }
    
    return list;
  }, [villages, riskFilter, limit, sortOrder]);

  let dataSource = 'pending';
  if (seedingStatus?.inProgress) dataSource = 'seeding';
  else if (riskData.length > 0) dataSource = rankedData?.meta?.isStale ? 'stale' : 'backend';
  else if (seedingStatus?.phase === 'complete' && riskData.length === 0) dataSource = 'stale';

  const { user, openLoginModal } = useAuth();
  const { addToast } = useToast();
  const [forecasts, setForecasts] = useState({});
  const [loadingForecasts, setLoadingForecasts] = useState(false);

  useEffect(() => {
    if (filteredVillages.length === 0) return;
    
    const load = async () => {
      setLoadingForecasts(true);
      const results = await Promise.all(
        filteredVillages.map(async (v) => {
          // Skip if already loaded (optional optimization)
          if (forecasts[v._id]) return { id: v._id, data: forecasts[v._id] };
          
          try {
            const { data } = await fetchForecast(v._id);
            if (!data) return { id: v._id, data: null };
            
            const precipRaw = data?.daily?.precipitation_sum || data?.precipitationForecast || [];
            const probRaw = data?.daily?.precipitation_probability_max || data?.probabilityForecast || [];
            const timeRaw = data?.daily?.time || data?.forecastDates || Array.from({ length: precipRaw.length }, (_, i) => {
              const d = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
              return d.toISOString().split('T')[0];
            });

            const chartData = timeRaw.map((t, i) => ({
              date: t.slice(5),
              precip: Math.round((precipRaw[i] || 0) * 10) / 10,
              prob: probRaw[i] || 0,
              tempMax: data?.daily?.temperature_2m_max?.[i] || 0,
            }));

            const totalPrecip = chartData.reduce((s, d) => s + d.precip, 0);
            const avgProb = chartData.reduce((s, d) => s + d.prob, 0) / (chartData.length || 1);
            const dryDays = chartData.filter(d => d.precip < 0.5).length;
            const maxTemp = Math.max(...chartData.map(d => d.tempMax), 0);
            const trend = chartData.slice(8).reduce((s, d) => s + d.precip, 0) > chartData.slice(0, 8).reduce((s, d) => s + d.precip, 0) + 2 ? 'Improving' : 'Stable';

            return { 
              id: v._id, 
              data: { 
                village: v, 
                chartData, 
                summary: { 
                  totalPrecip: Math.round(totalPrecip * 10) / 10, 
                  avgProb: Math.round(avgProb), 
                  dryDays, 
                  maxTemp: Math.round(maxTemp), 
                  trend 
                } 
              } 
            };
          } catch (e) {
            return { id: v._id, data: null };
          }
        })
      );

      const newForecasts = {};
      results.forEach(r => { if (r.data) newForecasts[r.id] = r.data; });
      setForecasts(prev => ({ ...prev, ...newForecasts }));
      setLoadingForecasts(false);
    };
    load();
  }, [filteredVillages]);

  const handleDispatch = async (village) => {
    if (!user) { openLoginModal(); return; }
    try {
      await api.post('/tanker', { village: village.name, capacityLiters: 10000, dispatchDate: new Date().toISOString() });
      addToast(`Tanker dispatched to ${village.name}`, 'success');
    } catch (err) { addToast(err?.response?.data?.error || 'Dispatch failed', 'error'); }
  };

  if (isLoading && riskData.length === 0) {
    return (
      <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
        <Loader2 size={48} className="spinning" style={{ color: 'var(--accent-blue)' }} />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px' }}>INITIALIZING PREDICTIVE MODELS...</p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '30px', maxWidth: '1600px', margin: '0 auto', minHeight: '100vh' }}>
      <DataSourceBanner dataSource={dataSource} />
      
      {/* Header & Limits */}
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div className="header-icon-container">
          <Activity size={34} />
        </div>
        <div className="header-text">
          <h1 className="header-title">Simulation Center</h1>
          <p className="header-subtitle">16-Day AI-driven Hydrological Forecast & Preemptive Vulnerability Analysis</p>
        </div>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
          {[25, 50, 100].map(n => (
            <button
              key={n}
              onClick={() => setLimit(n)}
              style={{
                padding: '10px 20px', borderRadius: '12px', fontSize: '12px', fontWeight: 800,
                background: limit === n ? 'var(--nav-active-bg)' : 'var(--glass-bg-bright)',
                border: '1px solid',
                borderColor: limit === n ? 'var(--accent-blue)50' : 'var(--divider)',
                color: limit === n ? 'var(--accent-blue)' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              className="hover-glow"
            >
              TOP {n}
            </button>
          ))}
          <button
            onClick={() => setLimit('All')}
            style={{
              padding: '10px 20px', borderRadius: '12px', fontSize: '12px', fontWeight: 800,
              background: limit === 'All' ? 'var(--nav-active-bg)' : 'var(--glass-bg-bright)',
              border: '1px solid',
              borderColor: limit === 'All' ? 'var(--accent-blue)50' : 'var(--divider)',
              color: limit === 'All' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            className="hover-glow"
          >
            VIEW ALL
          </button>
        </div>
      </div>

      {/* Control Bar: Risk Filters & Sort */}
      <div className="glass-card" style={{ padding: '16px 24px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '24px', border: 'var(--glass-border)' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['All', 'Extreme', 'Severe', 'Moderate', 'Normal'].map(level => {
            const isActive = riskFilter === level;
            const config = getRiskLevel(level === 'All' ? 0 : level === 'Extreme' ? 90 : level === 'Severe' ? 70 : level === 'Moderate' ? 40 : 10);
            return (
              <button
                key={level}
                onClick={() => setRiskFilter(level)}
                style={{
                  padding: '10px 24px', borderRadius: '14px', fontSize: '13px', fontWeight: 700,
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
          <button 
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', 
              borderRadius: '14px', background: 'var(--nav-active-bg)', border: '1px solid var(--accent-blue)30',
              color: 'var(--accent-blue)', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
            }}
          >
            <ArrowUpDown size={14} />
            {sortOrder === 'desc' ? 'HIGHEST RISK' : 'LOWEST RISK'}
          </button>
          
          <div style={{ width: '1px', height: '24px', background: 'var(--divider)' }} />
          
          <div className="glass-pill" style={{ display: 'flex', gap: '16px', padding: '10px 20px', background: 'rgba(255,255,255,0.02)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-blue)' }} /> PRECIP (MM)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }} /> PROB (%)
            </span>
          </div>
        </div>
      </div>

      {loadingForecasts && filteredVillages.length > 0 && Object.keys(forecasts).length === 0 && (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <Loader2 size={32} className="spinning" style={{ color: 'var(--accent-blue)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Syncing Forecast Data...</p>
        </div>
      )}

      {filteredVillages.length === 0 && !isLoading && (
        <div className="glass-card" style={{ padding: '80px', textAlign: 'center', borderRadius: '24px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--glass-bg-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Filter size={32} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No Districts Match Filter</h2>
          <p style={{ color: 'var(--text-tertiary)' }}>Try adjusting your risk threshold or expanding the search limit.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '24px' }}>
        {filteredVillages.map((village, idx) => {
          const forecast = forecasts[village._id];
          if (!forecast) return (
            <div key={village._id || idx} className="glass-card" style={{ height: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '24px', opacity: 0.5 }}>
              <Loader2 size={24} className="spinning" style={{ color: 'var(--text-tertiary)' }} />
            </div>
          );
          
          const { chartData, summary } = forecast;
          const risk = getRiskLevel(village.riskScore);
          const isCritical = summary.dryDays > 10 || village.riskScore > 85;
          
          let alertColor = 'var(--accent-green)';
          let alertText = 'Stable Forecast';
          let alertBg = 'rgba(16, 185, 129, 0.1)';
          if (summary.dryDays > 12) { alertColor = 'var(--accent-red)'; alertText = 'Extreme Dry Spell'; alertBg = 'rgba(239, 68, 68, 0.1)'; }
          else if (summary.dryDays > 8) { alertColor = 'var(--accent-amber)'; alertText = 'Extended Dry Period'; alertBg = 'rgba(245, 158, 11, 0.1)'; }
          else if (summary.avgProb < 25) { alertColor = 'var(--accent-blue)'; alertText = 'Low Rainfall Prob'; alertBg = 'rgba(59, 130, 246, 0.1)'; }
          
          return (
            <div key={village._id} className="glass-card hover-glow" style={{ padding: '28px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', borderRadius: '24px', transition: 'all 0.4s ease' }}>
              {isCritical && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--accent-red)', boxShadow: '0 2px 10px var(--accent-red)40' }} />}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                  <h3 className="section-header" style={{ marginBottom: '6px', fontSize: '20px', fontWeight: 800 }}>{village.name}</h3>
                  <p className="caption-text" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{village.district || 'Region'}, {village.state}</p>
                </div>
                <RiskBadge score={village.riskScore} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--divider)', padding: '16px', borderRadius: '16px' }}>
                  <p className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '6px', fontSize: '11px' }}><CloudRain size={14} /> TOTAL PRECIP</p>
                  <p className="data-value" style={{ fontSize: '22px', fontWeight: 900 }}>{summary.totalPrecip}<span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '4px' }}>mm</span></p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--divider)', padding: '16px', borderRadius: '16px' }}>
                  <p className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '6px', fontSize: '11px' }}><Sun size={14} /> DRY DAYS</p>
                  <p className="data-value" style={{ fontSize: '22px', fontWeight: 900, color: summary.dryDays > 10 ? 'var(--accent-red)' : 'var(--text-primary)' }}>{summary.dryDays}<span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '4px' }}>/16</span></p>
                </div>
              </div>
              
              <div style={{ height: '160px', width: '100%', marginBottom: '24px', borderRadius: '12px', overflow: 'hidden' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id={`precip-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id={`prob-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} interval={2} />
                    <YAxis yAxisId="left" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} hide />
                    <Tooltip 
                      contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(16px)', borderRadius: '12px' }}
                      itemStyle={{ fontWeight: 700 }}
                      cursor={{ stroke: 'var(--accent-blue)', strokeOpacity: 0.2, strokeWidth: 2 }}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="precip" stroke="var(--accent-blue)" strokeWidth={3} fillOpacity={1} fill={`url(#precip-${idx})`} />
                    <Area yAxisId="right" type="monotone" dataKey="prob" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill={`url(#prob-${idx})`} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', gap: '12px' }}>
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', 
                  borderRadius: '12px', fontSize: '11px', fontWeight: 800, color: alertColor, 
                  background: alertBg, border: `1px solid ${alertColor}30`, textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                  {summary.dryDays > 10 ? <AlertTriangle size={14} /> : <TrendingUp size={14} />}
                  {alertText}
                </div>
                
                <button 
                  className="glass-btn" 
                  onClick={() => user ? handleDispatch(village) : openLoginModal()} 
                  style={{ 
                    flex: 1, padding: '10px', fontSize: '12px', fontWeight: 700, gap: '8px', 
                    color: 'var(--text-primary)', borderRadius: '12px', border: '1px solid var(--glass-border)'
                  }}
                >
                  <Truck size={14} /> {user ? 'PREEMPTIVE DISPATCH' : 'SIGN IN TO DISPATCH'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
