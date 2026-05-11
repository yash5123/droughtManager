import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, Cell, AreaChart, Area } from 'recharts';
import { Scale, Truck, AlertTriangle, ArrowRightLeft, Droplet, Users, Loader2, Filter, ChevronRight, BarChart3, Database } from 'lucide-react';
import { useVillageData } from '../context/VillageDataContext.jsx';
import { useRankedVillages, useSeedingStatus } from '../hooks/useRiskData.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import RiskBadge from '../components/ui/RiskBadge.jsx';
import LoginPrompt from '../components/ui/LoginPrompt.jsx';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { formatNumber } from '../utils/formatters.js';
import api from '../services/api.js';

const TANKER_CAPACITY = 10000;

// Indian number formatting: 9750000 -> "9.75 Cr", 125000 -> "1.25 L"
function formatIndian(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  if (num >= 1e7) return `${(num / 1e7).toFixed(2)} Cr`;
  if (num >= 1e5) return `${(num / 1e5).toFixed(2)} L`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return String(Math.round(num));
}

export default function SupplyDemand() {
  const { villageCount } = useVillageData();
  const { data: rankedData, isLoading } = useRankedVillages(1000);
  const { data: seedingStatus } = useSeedingStatus();
  
  const [limit, setLimit] = useState(25); // Top 25, 50, All
  const [riskFilter, setRiskFilter] = useState('All'); // All, Extreme, Severe, Moderate, Normal
  const [dispatching, setDispatching] = useState(null);

  const { user, openLoginModal } = useAuth();
  const { addToast } = useToast();

  const rawData = rankedData?.data || [];
  
  // Process real data from server snapshots
  const villages = useMemo(() => {
    return rawData.map(v => {
      const snapshot = v.metricsSnapshot || {};
      const demand = snapshot.demandLitersPerDay || 0;
      const supply = snapshot.supplyLitersPerDay || 0;
      const deficit = Math.max(0, demand - supply);
      const coverage = demand > 0 ? (supply / demand) * 100 : 100;
      const tankersNeeded = Math.ceil(deficit / TANKER_CAPACITY);
      
      return { 
        ...v, 
        demand, 
        supply, 
        deficit, 
        coverage, 
        tankersNeeded,
        population: snapshot.population || v.population || 0
      };
    });
  }, [rawData]);

  // Apply filters
  const filteredData = useMemo(() => {
    let list = [...villages];
    
    // 1. Risk Filter
    if (riskFilter !== 'All') {
      list = list.filter(v => v.riskLevel === riskFilter);
    }
    
    // 2. Sort by deficit
    list.sort((a, b) => b.deficit - a.deficit);
    
    // 3. Limit
    if (limit !== 'All') {
      list = list.slice(0, Number(limit));
    }
    
    return list;
  }, [villages, riskFilter, limit]);

  // Totals (based on current filtered view or global?) — User said "Show all distinct... top 25 top 50"
  // Let's calculate totals based on the filtered view to reflect the context
  const totalDemand = filteredData.reduce((s, v) => s + v.demand, 0);
  const totalSupply = filteredData.reduce((s, v) => s + v.supply, 0);
  const totalDeficit = Math.max(0, totalDemand - totalSupply);
  const criticalCount = filteredData.filter(v => v.coverage < 90).length;

  const chartData = filteredData.slice(0, 15).map(v => ({
    name: v.name.length > 10 ? v.name.slice(0, 8) + '…' : v.name,
    demand: Math.round(v.demand / 1000),
    supply: Math.round(v.supply / 1000),
    deficit: Math.round(v.deficit / 1000),
  }));

  const handleDispatch = async (village) => {
    if (!user) { openLoginModal(); return; }
    setDispatching(village._id);
    try {
      await api.post('/tanker', { village: village.name, capacityLiters: TANKER_CAPACITY, dispatchDate: new Date().toISOString() });
      addToast(`Tanker dispatched to ${village.name}`, 'success');
    } catch (err) { addToast(err?.response?.data?.error || 'Dispatch failed', 'error'); }
    finally { setDispatching(null); }
  };

  const dataSource = rankedData?.data?.length > 0 ? (rankedData?.meta?.isStale ? 'stale' : 'backend') : 'pending';

  if (isLoading && rawData.length === 0) {
    return (
      <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
        <Loader2 size={48} color="var(--accent-blue)" className="spinning" />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px' }}>SYNCHRONIZING RESOURCE MATRIX...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.5s ease-out' }}>
      <DataSourceBanner dataSource={dataSource} />

      {/* Hero Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            width: '56px', height: '56px', borderRadius: '16px', background: 'var(--nav-active-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'var(--glass-border)',
            boxShadow: 'var(--accent-blue-glow)', color: 'var(--accent-blue)'
          }}>
            <ArrowRightLeft size={32} />
          </div>
          <div>
            <h1 className="title" style={{ fontSize: '32px', marginBottom: '4px' }}>Supply vs Demand</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <p className="body-text" style={{ color: 'var(--text-secondary)' }}>Resource Allocation Matrix & Critical Gap Analysis</p>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-tertiary)' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Database size={12} /> SERVER VERIFIED
              </span>
            </div>
          </div>
        </div>

        {/* Global Filters */}
        <div className="glass-panel" style={{ padding: '6px', borderRadius: '14px', display: 'flex', gap: '4px' }}>
          {[25, 50, 'All'].map(s => (
            <button 
              key={s}
              onClick={() => setLimit(s)}
              style={{
                padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                background: limit === s ? 'var(--accent-blue)' : 'transparent',
                color: limit === s ? 'white' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: limit === s ? 'var(--accent-blue-glow)' : 'none'
              }}
            >
              TOP {s}
            </button>
          ))}
        </div>
      </div>

      {/* Main Filter Strip */}
      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
        {['All', 'Extreme', 'Severe', 'Moderate', 'Normal'].map(cat => (
          <button
            key={cat}
            onClick={() => setRiskFilter(cat)}
            style={{
              padding: '10px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
              background: riskFilter === cat ? 'var(--glass-bg-bright)' : 'var(--glass-bg)',
              border: riskFilter === cat ? '2px solid var(--accent-blue)' : '1px solid var(--glass-border)',
              color: riskFilter === cat ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            <div style={{ 
              width: '8px', height: '8px', borderRadius: '50%', 
              background: cat === 'All' ? 'var(--accent-blue)' : 
                          cat === 'Extreme' ? 'var(--accent-red)' :
                          cat === 'Severe' ? 'var(--accent-amber)' :
                          cat === 'Moderate' ? 'var(--accent-cyan)' : 'var(--accent-green)'
            }} />
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* High-Impact Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <MetricCard label="Total Demand" value={totalDemand} icon={Users} color="var(--accent-blue)" subtext="Combined Regional Needs" />
        <MetricCard label="Available Supply" value={totalSupply} icon={Droplet} color="var(--accent-cyan)" subtext="Rainfall & Groundwater" />
        <MetricCard label="Critical Deficit" value={totalDeficit} icon={Scale} color="var(--accent-red)" subtext="Current Resource Gap" isAlert />
        <MetricCard label="Priority Zones" value={criticalCount} icon={AlertTriangle} color="var(--accent-amber)" subtext="Coverage < 90%" isCount />
      </div>

      {/* Analytics Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left: Volume Differential Chart */}
        <div className="glass-card" style={{ padding: '24px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <BarChart3 size={20} color="var(--accent-blue)" />
              <h3 className="section-header">Volume Differential (kL / Day)</h3>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '1px' }}>TOP 15 BY GAP</span>
          </div>

          <div style={{ height: '350px', width: '100%' }}>
            {chartData.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-red)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--accent-red)" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorSupply" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--divider)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ background: 'var(--glass-bg)', border: 'var(--glass-border)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
                  <Bar dataKey="demand" name="DEMAND" fill="url(#colorDemand)" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="supply" name="SUPPLY" fill="url(#colorSupply)" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: Detailed Resource List */}
        <div className="glass-card" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '480px' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="section-header">Critical Gaps</h3>
            <span style={{ fontSize: '11px', background: 'var(--nav-active-bg)', padding: '4px 8px', borderRadius: '6px', color: 'var(--accent-blue)' }}>
              {filteredData.length} REGIONS
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {filteredData.length === 0 ? <EmptyState /> : filteredData.map((v, i) => (
              <div key={v._id || i} className="list-item" style={{ 
                padding: '16px', borderRadius: '12px', marginBottom: '8px', border: '1px solid transparent',
                transition: 'all 0.2s', cursor: 'default'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{v.name}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{v.state} • {formatNumber(v.population)} pop</p>
                  </div>
                  <RiskBadge score={v.riskScore} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ flex: 1, height: '6px', background: 'var(--divider)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${v.coverage}%`, height: '100%', 
                      background: v.coverage < 50 ? 'var(--accent-red)' : v.coverage < 80 ? 'var(--accent-amber)' : 'var(--accent-green)',
                      boxShadow: '0 0 10px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, width: '40px', textAlign: 'right', color: v.coverage < 50 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                    {Math.round(v.coverage)}%
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Deficit</p>
                      <p style={{ fontSize: '14px', fontWeight: 600 }}>{formatIndian(v.deficit)} <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>L</span></p>
                    </div>
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Tankers</p>
                      <p style={{ fontSize: '14px', fontWeight: 600 }}>{v.tankersNeeded}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleDispatch(v)}
                    disabled={dispatching === v._id}
                    className="glass-btn"
                    style={{ padding: '6px 12px', fontSize: '11px', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)' }}
                  >
                    {dispatching === v._id ? <Loader2 size={12} className="spinning" /> : <Truck size={12} />}
                    {dispatching === v._id ? 'INIT...' : 'DISPATCH'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, subtext, isCount, isAlert }) {
  return (
    <div className="glass-card" style={{ 
      padding: '24px', position: 'relative', overflow: 'hidden',
      background: isAlert ? 'var(--risk-severe-tint)' : 'var(--glass-bg)',
      border: isAlert ? '1px solid var(--accent-red)' : '1px solid var(--glass-border)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', position: 'relative', zIndex: 2 }}>
        <div style={{ 
          width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color
        }}>
          <Icon size={20} />
        </div>
      </div>
      
      <div style={{ position: 'relative', zIndex: 2 }}>
        <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)' }}>
            {isCount ? value : formatIndian(value)}
          </h2>
          {!isCount && <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)' }}>L/DAY</span>}
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{subtext}</p>
      </div>

      {/* Decorative large icon background */}
      <Icon size={120} style={{ 
        position: 'absolute', right: '-20px', bottom: '-20px', 
        color, opacity: 0.05, transform: 'rotate(-15deg)' 
      }} />
    </div>
  );
}
