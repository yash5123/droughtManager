import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, Cell } from 'recharts';
import { Scale, Truck, AlertTriangle, ArrowRightLeft, Droplet, Users, Loader2 } from 'lucide-react';
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

const LITERS_PER_PERSON_DAY = 55;
const TANKER_CAPACITY = 10000;
const EST_POPULATION = 50000; // fallback estimate when DB has 0

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
  const { data: rankedData } = useRankedVillages(1000);
  const { data: seedingStatus } = useSeedingStatus();
  
  const riskData = rankedData?.data || [];
  const activeVillages = React.useMemo(() => riskData.slice(0, villageCount), [riskData, villageCount]);

  let dataSource = 'pending';
  if (seedingStatus?.inProgress) dataSource = 'seeding';
  else if (riskData.length > 0) dataSource = rankedData?.meta?.isStale ? 'stale' : 'backend';
  else if (seedingStatus?.phase === 'complete' && riskData.length === 0) dataSource = 'stale';
  else if (seedingStatus) dataSource = 'seeding';

  const { user, openLoginModal } = useAuth();
  const { addToast } = useToast();
  const [dispatching, setDispatching] = useState(null);

  const villages = activeVillages.map(v => {
    const pop = (v.population && v.population > 0) ? v.population : EST_POPULATION;
    const isEstimated = !v.population || v.population === 0;
    const dailyDemand = pop * LITERS_PER_PERSON_DAY;
    const supplyFactor = v.riskScore >= 76 ? 0.3 : v.riskScore >= 51 ? 0.5 : v.riskScore >= 26 ? 0.75 : 0.95;
    const dailySupply = Math.round(dailyDemand * supplyFactor);
    const deficit = Math.max(0, dailyDemand - dailySupply);
    const coverage = dailyDemand > 0 ? (dailySupply / dailyDemand) * 100 : 100;
    const tankersNeeded = Math.ceil(deficit / TANKER_CAPACITY);
    return { ...v, pop, isEstimated, dailyDemand, dailySupply, deficit, coverage, tankersNeeded };
  });

  const totalDemand = villages.reduce((s, v) => s + (v.dailyDemand || 0), 0);
  const totalSupply = villages.reduce((s, v) => s + (v.dailySupply || 0), 0);
  const totalDeficit = Math.max(0, totalDemand - totalSupply);
  const criticalCount = villages.filter(v => v.coverage < 100 && (v.riskLevel === 'Severe' || v.riskLevel === 'Extreme')).length;

  // Top 15 by deficit, sorted, standardized to kL/day
  const chartData = [...villages]
    .sort((a, b) => b.deficit - a.deficit)
    .slice(0, 15)
    .map(v => ({
      name: v.name.length > 8 ? v.name.slice(0, 7) + '…' : v.name,
      demand: Math.round(v.dailyDemand / 1000),
      supply: Math.round(v.dailySupply / 1000),
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      <DataSourceBanner dataSource={dataSource} />
      
      {/* Notice Banner */}
      <div className="glass-panel" style={{ 
        padding: '16px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px',
        background: 'var(--risk-extreme-tint)', borderLeft: '3px solid var(--accent-red)', borderRight: 'none', borderTop: 'none', borderBottom: 'none'
      }}>
        <AlertTriangle size={24} style={{ color: 'var(--accent-red)', filter: 'drop-shadow(var(--accent-red-glow))' }} />
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Predictive Mode Active</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Generating supply deficit estimations based on risk factors and population metrics.</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ArrowRightLeft size={28} style={{ color: 'var(--accent-blue)', filter: 'drop-shadow(var(--accent-blue-glow))' }} />
        <div>
          <h2 className="title">Resource Allocation Matrix</h2>
          <p className="body-text" style={{ color: 'var(--text-secondary)' }}>Real-time Supply vs Demand Analysis</p>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <MetricCard label="Total Daily Demand" value={totalDemand} icon={Users} color="var(--accent-blue)" tintColor="var(--glass-bg)" />
        <MetricCard label="Available Supply" value={totalSupply} icon={Droplet} color="var(--accent-cyan)" tintColor="var(--glass-bg)" />
        <MetricCard label="System Deficit" value={totalDeficit} icon={Scale} color="var(--accent-amber)" tintColor="var(--risk-severe-tint)" />
        <MetricCard label="Critical Zones" value={criticalCount} icon={AlertTriangle} color="var(--accent-red)" tintColor="var(--risk-extreme-tint)" isCount />
      </div>

      {/* Dual Layout Area */}
      <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
        
        {/* Left: Comparative Chart */}
        <div className="glass-card" style={{ flex: '1 1 60%', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 className="section-header" style={{ marginBottom: '24px' }}>Volume Differential (× 1000 L/day)</h3>
          
          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', paddingBottom: '8px', minHeight: '240px' }}>
            <div style={{ minWidth: `${Math.max(100, chartData.length * 60)}px`, height: '260px' }}>
              {chartData.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }} barGap={0} barCategoryGap="25%">
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--glass-bg)', border: 'var(--glass-border)', backdropFilter: 'blur(10px)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: 12 }} 
                    cursor={{ fill: 'var(--text-tertiary)', opacity: 0.1 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }} iconType="circle" />
                  <Bar dataKey="demand" name="DEMAND" radius={[4, 4, 0, 0]} maxBarSize={30}>
                    {chartData.map((entry, index) => <Cell key={`cell-d-${index}`} fill="var(--accent-red)" />)}
                  </Bar>
                  <Bar dataKey="supply" name="SUPPLY" radius={[4, 4, 0, 0]} maxBarSize={30}>
                    {chartData.map((entry, index) => <Cell key={`cell-s-${index}`} fill="var(--accent-blue)" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Right: Region List with Progress Bars */}
        <div className="glass-card" style={{ flex: '1 1 40%', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 className="section-header" style={{ marginBottom: '16px' }}>Region Deployment Status</h3>
          
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {villages.slice(0, 12).map((v, i) => (
              <div key={v._id || i} style={{ 
                background: 'rgba(255,255,255,0.02)', border: 'var(--glass-border)', borderRadius: '16px', padding: '16px',
                position: 'relative', overflow: 'hidden'
              }}>
                {v.tankersNeeded > 5 && <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: 'var(--accent-red)', boxShadow: 'var(--accent-red-glow)' }} />}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{v.name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{v.state}</div>
                  </div>
                  <RiskBadge score={v.riskScore} />
                </div>
                
                {/* Coverage Progress Bar */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Coverage</span>
                    <span style={{ color: v.coverage < 50 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{v.coverage.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--glass-border)', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${v.coverage}%`, height: '100%', background: 'var(--accent-blue)', boxShadow: 'var(--accent-blue-glow)' }} />
                    <div style={{ width: `${100 - v.coverage}%`, height: '100%', background: 'var(--accent-red)', opacity: 0.5 }} />
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', background: 'var(--glass-bg)', padding: '12px', borderRadius: '8px' }}>
                  <div>
                    <p className="card-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Deficit</p>
                    <p className="data-value" style={{ fontSize: '16px' }}>{formatNumber(Math.round(v.deficit / 1000))}k <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>L</span></p>
                  </div>
                  <div>
                    <p className="card-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Tankers Req</p>
                    <p className="data-value" style={{ fontSize: '16px', color: v.tankersNeeded > 3 ? 'var(--accent-amber)' : 'var(--text-primary)' }}>{v.tankersNeeded}</p>
                  </div>
                </div>
                
                {user ? (
                  <button className="primary-btn" onClick={() => handleDispatch(v)} disabled={dispatching === v._id}
                    style={{ width: '100%', height: '40px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {dispatching === v._id ? <Loader2 size={16} className="spinning" /> : <Truck size={16} />} 
                    {dispatching === v._id ? 'INITIATING DISPATCH...' : 'DISPATCH TANKER'}
                  </button>
                ) : (
                  <LoginPrompt message="Sign in to dispatch" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, tintColor, isCount }) {
  return (
    <div className="glass-card" style={{ padding: '24px', backgroundColor: tintColor, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <Icon size={20} style={{ color, filter: `drop-shadow(0 0 12px ${color})` }} />
      </div>
      <div>
        <div className="card-label" style={{ color: 'var(--text-secondary)' }}>{label}</div>
        <div className="data-value" style={{ color: 'var(--text-primary)', marginTop: '4px', fontSize: isCount ? '36px' : '24px' }}>
          {isCount ? value : formatIndian(value)}
          {!isCount && <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginLeft: '6px' }}>L/day</span>}
        </div>
      </div>
      <Icon size={80} style={{ position: 'absolute', bottom: '-10px', right: '-10px', color, opacity: 0.08 }} />
    </div>
  );
}
