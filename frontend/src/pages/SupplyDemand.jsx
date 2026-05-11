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
import { getRiskLevel } from '../utils/riskLevels.js';
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
      list = list.filter(v => getRiskLevel(v.riskScore).label === riskFilter);
    }
    
    // 2. Sort by riskScore descending (matches Overview logic)
    list.sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));
    
    // 3. Limit
    if (limit !== 'All') {
      list = list.slice(0, Number(limit));
    }
    
    return list;
  }, [villages, riskFilter, limit]);

  // Totals (based on current filtered view or global?) — User said "Show all distinct... top 25 top 50"
  // Let's calculate totals based on the filtered view to reflect the context
  const totalDemand = filteredData.reduce((s, v) => s + (v.demand || 0), 0);
  const totalSupply = filteredData.reduce((s, v) => s + (v.supply || 0), 0);
  const totalDeficit = filteredData.reduce((s, v) => s + (v.deficit || 0), 0);
  const criticalCount = filteredData.filter(v => v.coverage < 90).length;
  
  const chartData = filteredData.slice(0, 25).map(v => ({
    name: v.name.length > 12 ? v.name.slice(0, 10) + '…' : v.name,
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

  if (isLoading && rawData.length === 0) {
    return (
      <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
        <Loader2 size={48} color="var(--accent-blue)" className="spinning" />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px' }}>SYNCHRONIZING RESOURCE MATRIX...</p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '30px', maxWidth: '1600px', margin: '0 auto', background: 'var(--bg-gradient)', minHeight: '100vh' }}>
      <DataSourceBanner status={seedingStatus} />
      
      {/* Dynamic Strategic Header */}
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div className="header-icon-container">
          <ArrowRightLeft size={34} />
        </div>
        <div className="header-text">
          <h1 className="header-title">Resource Matrix</h1>
          <p className="header-subtitle">Real-time Supply-Demand differential analysis across {villages.length} administrative domains.</p>
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
                cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: limit === n ? '0 4px 12px var(--accent-blue)20' : 'none'
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

      {/* Strategic Insights Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
        <MetricCard 
          title="REGIONAL DEMAND" 
          value={formatIndian(totalDemand)} 
          unit="L/D"
          subtitle="Estimated consumption aggregate"
          icon={<Users size={20} color="var(--accent-blue)" />}
          color="var(--accent-blue)"
        />
        <MetricCard 
          title="AVAILABLE SUPPLY" 
          value={formatIndian(totalSupply)} 
          unit="L/D"
          subtitle="Total volumetric resource output"
          icon={<Droplet size={20} color="var(--accent-cyan)" />}
          color="var(--accent-cyan)"
        />
        <MetricCard 
          title="EQUILIBRIUM GAP" 
          value={formatIndian(totalDeficit)} 
          unit="L/D"
          subtitle="Unmet volumetric requirement"
          icon={<Scale size={20} color="var(--accent-red)" />}
          color="var(--accent-red)"
        />
        <MetricCard 
          title="ACTION PRIORITY" 
          value={criticalCount} 
          unit="ZONES"
          subtitle="Zones with coverage < 90%"
          icon={<AlertTriangle size={20} color="var(--accent-amber)" />}
          color="var(--accent-amber)"
        />
      </div>

      {/* Analytics Command Center - Risk Filtering */}
      <div style={{ display: 'flex', gap: '10px', padding: '10px', background: 'var(--glass-bg-bright)', borderRadius: '20px', border: '1px solid var(--divider)', boxShadow: 'var(--glass-shadow)', marginBottom: '32px' }}>
        {['All', 'Extreme', 'Severe', 'Moderate', 'Normal'].map(cat => (
          <button
            key={cat}
            onClick={() => setRiskFilter(cat)}
            style={{
              flex: 1, padding: '14px', borderRadius: '14px', fontSize: '11px', fontWeight: 800,
              background: riskFilter === cat ? 'var(--nav-active-bg)' : 'transparent',
              border: '1px solid',
              borderColor: riskFilter === cat ? 'var(--accent-blue)30' : 'transparent',
              color: riskFilter === cat ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              letterSpacing: '1px', textTransform: 'uppercase'
            }}
            className="hover-glow"
          >
            <div style={{ 
              width: '8px', height: '8px', borderRadius: '50%', 
              background: cat === 'All' ? 'var(--accent-blue)' : 
                          cat === 'Extreme' ? 'var(--accent-red)' :
                          cat === 'Severe' ? 'var(--accent-amber)' :
                          cat === 'Moderate' ? 'var(--accent-cyan)' : 'var(--accent-green)',
              boxShadow: `0 0 10px ${cat === 'All' ? 'var(--accent-blue)' : cat === 'Extreme' ? 'var(--accent-red)' : cat === 'Severe' ? 'var(--accent-amber)' : cat === 'Moderate' ? 'var(--accent-cyan)' : 'var(--accent-green)'}80`
            }} />
            {cat}
          </button>
        ))}
      </div>

      {/* Main Analytics Engine */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Differential Map/Chart */}
        <div className="glass-card" style={{ padding: '32px', border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--accent-blue-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--accent-blue)20' }}>
                <BarChart3 size={24} color="var(--accent-blue)" />
              </div>
              <div>
                <h3 className="section-header" style={{ marginBottom: '4px', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>Supply-Demand Equilibrium</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Volumetric differential across top priority zones</p>
              </div>
            </div>
            <div className="glass-pill" style={{ padding: '6px 14px', fontSize: '11px', fontWeight: 800, color: 'var(--accent-blue)', background: 'var(--accent-blue-tint)', border: '1px solid var(--accent-blue)20' }}>
              UNIT: KILOLITERS / DAY
            </div>
          </div>

          <div style={{ height: '450px', width: '100%' }}>
            {chartData.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 40, left: -20 }} barGap={2} barCategoryGap="20%">
                  <defs>
                    <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-red)" stopOpacity={1}/>
                      <stop offset="95%" stopColor="var(--accent-red)" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorSupply" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={1}/>
                      <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--divider)" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--text-tertiary)', fontSize: 10, fontWeight: 700 }} 
                    dy={15} 
                    angle={-45} 
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 11, fontWeight: 700 }} />
                  <Tooltip 
                    cursor={{ fill: 'var(--nav-hover-bg)', radius: 10 }}
                    contentStyle={{ 
                      background: 'var(--glass-bg-bright)', 
                      border: 'var(--glass-border)', 
                      borderRadius: '16px', 
                      backdropFilter: 'blur(24px)',
                      boxShadow: 'var(--glass-shadow-elevated)',
                      padding: '16px',
                      color: 'var(--text-primary)'
                    }}
                    itemStyle={{ fontSize: '12px', fontWeight: 800, padding: '4px 0' }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="rect" iconSize={10} wrapperStyle={{ paddingBottom: '40px', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.5px' }} />
                  <Bar dataKey="demand" name="EST. DEMAND" fill="url(#colorDemand)" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="supply" name="AVAIL. SUPPLY" fill="url(#colorSupply)" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Priority Action List */}
        <div className="glass-card" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '560px', border: 'var(--glass-border)', overflow: 'hidden', boxShadow: 'var(--glass-shadow)' }}>
          <div style={{ padding: '28px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass-bg-bright)' }}>
            <div>
              <h3 className="section-header" style={{ marginBottom: '4px', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Priority Hotspots</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Critical nodes requiring immediate dispatch</p>
            </div>
            <div style={{ textAlign: 'right', background: 'var(--accent-blue-tint)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--accent-blue)20' }}>
              <span style={{ fontSize: '22px', fontWeight: 900, color: 'var(--accent-blue)', display: 'block', lineHeight: 1 }}>{filteredData.length}</span>
              <span style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Targets</span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--glass-bg)' }}>
            {filteredData.length === 0 ? <EmptyState /> : filteredData.map((v, i) => (
              <div key={v._id || i} style={{ 
                padding: '24px', paddingLeft: '32px', borderRadius: '20px', background: 'var(--glass-bg-bright)', border: 'var(--glass-border)',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)', position: 'relative',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
              }} className="hotspot-item hover-glow">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', minWidth: '48px', flexShrink: 0, borderRadius: '14px', background: 'var(--nav-active-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 900, color: 'var(--accent-blue)', border: 'var(--glass-border)' }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{v.name}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{v.state}</span>
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--divider)', opacity: 0.5 }} />
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>{formatNumber(v.population)} pop</span>
                      </div>
                    </div>
                  </div>
                  <RiskBadge score={v.riskScore} />
                </div>

                <div style={{ background: 'var(--nav-active-bg)', padding: '20px', borderRadius: '16px', border: 'var(--glass-border)', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Supply Coverage</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: v.coverage < 50 ? 'var(--accent-red)' : v.coverage < 80 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
                        {Math.round(v.coverage)}%
                      </span>
                    </div>
                  </div>
                  <div style={{ height: '8px', background: 'var(--glass-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${Math.min(100, v.coverage)}%`, height: '100%', 
                      background: v.coverage < 50 ? 'linear-gradient(90deg, var(--accent-red) 0%, #ff6b6b 100%)' : 
                                  v.coverage < 80 ? 'linear-gradient(90deg, var(--accent-amber) 0%, #fbbf24 100%)' : 
                                  'linear-gradient(90deg, var(--accent-green) 0%, #34d399 100%)',
                      boxShadow: `0 0 15px ${v.coverage < 50 ? 'var(--accent-red)' : v.coverage < 80 ? 'var(--accent-amber)' : 'var(--accent-green)'}40`,
                      transition: 'width 1.5s cubic-bezier(0.16, 1, 0.3, 1)'
                    }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Gap (L/D)</p>
                      <p style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{formatIndian(v.deficit)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Payloads</p>
                      <p style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{v.tankersNeeded}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleDispatch(v)}
                    disabled={dispatching === v._id}
                    className="primary-btn"
                    style={{ 
                      padding: '12px 24px', fontSize: '12px', gap: '10px',
                      background: 'var(--accent-blue)', border: 'none', borderRadius: '12px',
                      opacity: dispatching === v._id ? 0.7 : 1,
                      boxShadow: '0 8px 20px -6px var(--accent-blue)60',
                      fontWeight: 800, letterSpacing: '0.5px'
                    }}
                  >
                    {dispatching === v._id ? <Loader2 size={16} className="spinning" /> : <Truck size={16} />}
                    {dispatching === v._id ? 'INITIATING...' : 'DEPLOY ASSET'}
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
      background: isAlert ? 'var(--risk-extreme-tint)' : 'var(--glass-bg)',
      border: isAlert ? `1px solid ${color}40` : 'var(--glass-border)',
      transition: 'var(--transition-default)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', position: 'relative', zIndex: 2 }}>
        <div style={{ 
          width: '40px', height: '40px', borderRadius: '12px', background: `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color,
          border: `1px solid ${color}30`
        }}>
          <Icon size={20} />
        </div>
      </div>
      
      <div style={{ position: 'relative', zIndex: 2 }}>
        <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            {isCount ? value : formatIndian(value)}
          </h2>
          {!isCount && <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.5px' }}>L/D</span>}
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 500, opacity: 0.8 }}>{subtext}</p>
      </div>

      <Icon size={120} style={{ 
        position: 'absolute', right: '-20px', bottom: '-20px', 
        color, opacity: 0.03, transform: 'rotate(-12deg)',
        pointerEvents: 'none'
      }} />
    </div>
  );
}
