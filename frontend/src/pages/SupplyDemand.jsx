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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      <DataSourceBanner dataSource={dataSource} />

      {/* Standardized Header with Live Status */}
      <div className="page-header" style={{ position: 'relative' }}>
        <div className="header-icon-container" style={{ background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-cyan) 100%)', boxShadow: '0 8px 24px -6px var(--accent-blue)' }}>
          <ArrowRightLeft size={32} color="#fff" />
        </div>
        <div className="header-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="header-title">Resource Allocation Matrix</h1>
            <div className="glass-pill" style={{ padding: '2px 8px', fontSize: '10px', color: 'var(--accent-green)', background: 'var(--risk-normal-tint)', border: '1px solid var(--accent-green)30' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)', marginRight: '6px', display: 'inline-block' }} className="live-pulse" />
              LIVE TELEMETRY
            </div>
          </div>
          <p className="header-subtitle">Real-time Supply-Demand differential analysis across {villages.length} administrative domains.</p>
        </div>
        
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '4px', borderRadius: '12px', display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.03)' }}>
            {[25, 50, 'All'].map(s => (
              <button 
                key={s}
                onClick={() => setLimit(s)}
                style={{
                  padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                  background: limit === s ? 'var(--accent-blue)' : 'transparent',
                  color: limit === s ? 'white' : 'var(--text-secondary)',
                  border: 'none', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: limit === s ? '0 4px 12px var(--accent-blue)40' : 'none'
                }}
              >
                TOP {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Command Center - Risk Filtering */}
      <div style={{ display: 'flex', gap: '10px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--divider)' }}>
        {['All', 'Extreme', 'Severe', 'Moderate', 'Normal'].map(cat => (
          <button
            key={cat}
            onClick={() => setRiskFilter(cat)}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
              background: riskFilter === cat ? 'var(--glass-bg-bright)' : 'transparent',
              border: '1px solid',
              borderColor: riskFilter === cat ? 'var(--accent-blue)60' : 'transparent',
              color: riskFilter === cat ? 'var(--text-primary)' : 'var(--text-tertiary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s',
              letterSpacing: '0.5px'
            }}
          >
            <div style={{ 
              width: '10px', height: '10px', borderRadius: '50%', 
              background: cat === 'All' ? 'var(--accent-blue)' : 
                          cat === 'Extreme' ? 'var(--accent-red)' :
                          cat === 'Severe' ? 'var(--accent-amber)' :
                          cat === 'Moderate' ? 'var(--accent-cyan)' : 'var(--accent-green)',
              boxShadow: riskFilter === cat ? `0 0 10px ${cat === 'All' ? 'var(--accent-blue)' : cat === 'Extreme' ? 'var(--accent-red)' : cat === 'Severe' ? 'var(--accent-amber)' : cat === 'Moderate' ? 'var(--accent-cyan)' : 'var(--accent-green)'}60` : 'none'
            }} />
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Global Impact Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <MetricCard label="Total Volumetric Demand" value={totalDemand} icon={Users} color="var(--accent-blue)" subtext="Combined regional requirements" />
        <MetricCard label="Aggregated Supply" value={totalSupply} icon={Droplet} color="var(--accent-cyan)" subtext="Net input from all sources" />
        <MetricCard label="Resource Deficit" value={totalDeficit} icon={Scale} color="var(--accent-red)" subtext="Total volumetric gap" isAlert />
        <MetricCard label="Priority Redzones" value={criticalCount} icon={AlertTriangle} color="var(--accent-amber)" subtext="Supply coverage below 90%" isCount />
      </div>

      {/* Main Analytics Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Differential Map/Chart */}
        <div className="glass-card" style={{ padding: '28px', border: '1px solid var(--divider)', background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart3 size={20} color="var(--accent-blue)" />
              </div>
              <div>
                <h3 className="section-header" style={{ marginBottom: '2px' }}>Supply-Demand Equilibrium</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Volumetric differential across top priority zones</p>
              </div>
            </div>
          </div>

          <div style={{ height: '380px', width: '100%' }}>
            {chartData.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 20, left: -20 }}>
                  <defs>
                    <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-red)" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="var(--accent-red)" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorSupply" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--divider)" opacity={0.4} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 11, fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 11, fontWeight: 500 }} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{ 
                      background: 'rgba(15, 23, 42, 0.9)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '12px', 
                      backdropFilter: 'blur(16px)',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.4)'
                    }}
                    itemStyle={{ fontSize: '12px', fontWeight: 700, padding: '4px 0' }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '30px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }} />
                  <Bar dataKey="demand" name="EST. DEMAND" fill="url(#colorDemand)" radius={[6, 6, 0, 0]} barSize={24} />
                  <Bar dataKey="supply" name="AVAIL. SUPPLY" fill="url(#colorSupply)" radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Priority Action List */}
        <div className="glass-card" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '530px', border: '1px solid var(--divider)' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
            <div>
              <h3 className="section-header" style={{ marginBottom: '2px' }}>Priority Zones</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Gaps requiring immediate dispatch</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--accent-blue)', display: 'block' }}>{filteredData.length}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>NODES</span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredData.length === 0 ? <EmptyState /> : filteredData.map((v, i) => (
              <div key={v._id || i} style={{ 
                padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--divider)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative', overflow: 'hidden'
              }} className="list-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: 'var(--text-tertiary)' }}>
                      {i + 1}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{v.name}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{v.state}</span>
                        <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--text-tertiary)' }} />
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{formatNumber(v.population)} pop</span>
                      </div>
                    </div>
                  </div>
                  <RiskBadge score={v.riskScore} />
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Supply Coverage</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: v.coverage < 50 ? 'var(--accent-red)' : v.coverage < 80 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
                      {Math.round(v.coverage)}%
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${Math.min(100, v.coverage)}%`, height: '100%', 
                      background: v.coverage < 50 ? 'linear-gradient(90deg, var(--accent-red) 0%, #ff6b6b 100%)' : 
                                  v.coverage < 80 ? 'linear-gradient(90deg, var(--accent-amber) 0%, #fbbf24 100%)' : 
                                  'linear-gradient(90deg, var(--accent-green) 0%, #34d399 100%)',
                      boxShadow: `0 0 12px ${v.coverage < 50 ? 'var(--accent-red)' : v.coverage < 80 ? 'var(--accent-amber)' : 'var(--accent-green)'}40`,
                      transition: 'width 1s ease-out'
                    }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gap (L/D)</p>
                      <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{formatIndian(v.deficit)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payloads</p>
                      <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{v.tankersNeeded}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleDispatch(v)}
                    disabled={dispatching === v._id}
                    className="primary-btn"
                    style={{ 
                      padding: '10px 20px', fontSize: '12px', gap: '8px',
                      background: 'var(--accent-blue)', border: 'none',
                      opacity: dispatching === v._id ? 0.7 : 1
                    }}
                  >
                    {dispatching === v._id ? <Loader2 size={16} className="spinning" /> : <Truck size={16} />}
                    {dispatching === v._id ? 'INIT...' : 'DEPLOY'}
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
