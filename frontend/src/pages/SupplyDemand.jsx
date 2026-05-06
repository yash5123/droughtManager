import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, Cell } from 'recharts';
import { Scale, Truck, AlertTriangle, ArrowRightLeft, Droplet, Users } from 'lucide-react';
import { useVillageData } from '../context/VillageDataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import RiskBadge from '../components/ui/RiskBadge.jsx';
import LoginPrompt from '../components/ui/LoginPrompt.jsx';
import DataSourceBanner from '../components/ui/DataSourceBanner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { useCountUp } from '../hooks/useCountUp.js';
import { formatNumber } from '../utils/formatters.js';
import api from '../services/api.js';

const LITERS_PER_PERSON_DAY = 50;
const TANKER_CAPACITY = 10000;

export default function SupplyDemand() {
  const { activeVillages, dataSource } = useVillageData();
  const { user, openLoginModal } = useAuth();
  const { addToast } = useToast();
  const [dispatching, setDispatching] = useState(null);

  const villages = activeVillages.map(v => {
    const dailyDemand = v.population * LITERS_PER_PERSON_DAY;
    const supplyFactor = v.riskScore > 70 ? 0.3 : v.riskScore > 50 ? 0.5 : v.riskScore > 25 ? 0.75 : 0.95;
    const dailySupply = Math.round(dailyDemand * supplyFactor);
    const deficit = dailyDemand - dailySupply;
    const coverage = dailyDemand > 0 ? (dailySupply / dailyDemand) * 100 : 0;
    const tankersNeeded = Math.ceil(deficit / TANKER_CAPACITY);
    return { ...v, dailyDemand, dailySupply, deficit, coverage, tankersNeeded };
  });

  const totalDemand = villages.reduce((s, v) => s + v.dailyDemand, 0);
  const totalSupply = villages.reduce((s, v) => s + v.dailySupply, 0);
  const totalDeficit = totalDemand - totalSupply;
  const criticalCount = villages.filter(v => v.tankersNeeded > 3).length;

  const chartData = villages.slice(0, 10).map(v => ({
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
    } catch (err) { addToast(err.response?.data?.error || 'Dispatch failed', 'error'); }
    finally { setDispatching(null); }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      <DataSourceBanner dataSource={dataSource} />
      
      <div className="flex items-center gap-3 px-4 py-3 rounded border bg-[var(--color-surface-container-high)]" style={{ borderColor: 'var(--color-tertiary)', color: 'var(--color-tertiary)' }}>
        <AlertTriangle className="w-5 h-5 flex-shrink-0" /> 
        <div>
          <p className="text-sm font-bold uppercase tracking-wider">Predictive Mode Active</p>
          <p className="text-xs opacity-80">Generating supply deficit estimations based on Open-Meteo risk factors and population metrics.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2 border-b border-[var(--color-outline-variant)] pb-3">
        <ArrowRightLeft className="w-6 h-6 text-[var(--color-primary)]" />
        <div>
          <h2 className="text-base font-bold text-display text-[var(--color-on-surface)]">Resource Allocation Matrix</h2>
          <p className="text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider">Real-time Supply vs Demand Analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Daily Demand" value={totalDemand} unit="L" icon={Users} color="var(--color-primary)" />
        <MetricCard label="Available Supply" value={totalSupply} unit="L" icon={Droplet} color="var(--color-secondary)" />
        <MetricCard label="System Deficit" value={totalDeficit} unit="L" icon={Scale} color="var(--color-tertiary)" />
        <MetricCard label="Critical Zones" value={criticalCount} unit="" icon={AlertTriangle} color="var(--color-error)" isAlert={true} />
      </div>

      {/* Dual Layout Area */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Left: Comparative Chart */}
        <div className="card p-5 border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] flex flex-col relative overflow-hidden min-h-[400px]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-primary)]/5 blur-3xl rounded-full pointer-events-none"></div>
          
          <h3 className="text-sm font-bold text-display uppercase tracking-wider text-[var(--color-on-surface)] mb-6 flex items-center gap-2 relative z-10">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></span>
            Volume Differential (× 1000 L/day)
          </h3>
          
          {chartData.length === 0 ? <EmptyState /> : (
            <div className="flex-1 relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }} barGap={2} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 10 }} axisLine={{ stroke: 'var(--color-outline-variant)' }} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-surface-container-highest)', border: '1px solid var(--color-outline-variant)', borderRadius: 4, color: 'var(--color-on-surface)', fontSize: 12, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} 
                    cursor={{ fill: 'var(--color-on-surface)', opacity: 0.05 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold', paddingTop: '20px' }} iconType="circle" />
                  <Bar dataKey="demand" name="DEMAND" radius={[2, 2, 0, 0]} maxBarSize={30}>
                    {chartData.map((entry, index) => <Cell key={`cell-d-${index}`} fill="var(--color-primary)" opacity={0.8} />)}
                  </Bar>
                  <Bar dataKey="supply" name="SUPPLY" radius={[2, 2, 0, 0]} maxBarSize={30}>
                    {chartData.map((entry, index) => <Cell key={`cell-s-${index}`} fill="var(--color-secondary)" opacity={0.9} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Right: Region List with Progress Bars */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-display uppercase tracking-wider text-[var(--color-on-surface)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-tertiary)]"></span>
            Region Deployment Status
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
            {villages.slice(0, 12).map((v, i) => (
              <div key={v._id || i} className="card p-4 border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] transition-all group relative overflow-hidden">
                {v.tankersNeeded > 5 && <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 blur-xl rounded-full"></div>}
                
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div className="max-w-[70%]">
                    <p className="text-sm font-bold text-[var(--color-on-surface)] truncate">{v.name}</p>
                    <p className="text-[9px] text-[var(--color-on-surface-variant)] uppercase tracking-widest">{v.state}</p>
                  </div>
                  <RiskBadge score={v.riskScore} />
                </div>
                
                {/* Coverage Progress Bar */}
                <div className="mb-4 relative z-10">
                  <div className="flex justify-between text-[10px] font-mono mb-1">
                    <span className="text-[var(--color-on-surface-variant)]">COVERAGE</span>
                    <span style={{ color: v.coverage < 50 ? 'var(--color-error)' : 'var(--color-secondary)' }}>
                      {v.coverage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--color-surface-container-highest)] overflow-hidden flex">
                    <div className="h-full transition-all" style={{ width: `${v.coverage}%`, backgroundColor: 'var(--color-secondary)' }} />
                    <div className="h-full transition-all" style={{ width: `${100 - v.coverage}%`, backgroundColor: 'var(--color-error)', opacity: 0.5 }} />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4 border-t border-[var(--color-outline-variant)] pt-3 relative z-10">
                  <div>
                    <p className="text-[9px] text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-0.5">Deficit</p>
                    <p className="text-sm font-mono font-bold text-[var(--color-error)]">{formatNumber(Math.round(v.deficit / 1000))}k <span className="text-[9px] font-sans">L</span></p>
                  </div>
                  <div>
                    <p className="text-[9px] text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-0.5">Tankers Req</p>
                    <p className="text-sm font-mono font-bold text-[var(--color-tertiary)]">{v.tankersNeeded}</p>
                  </div>
                </div>
                
                {user ? (
                  <button onClick={() => handleDispatch(v)} disabled={dispatching === v._id}
                    className="w-full py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-[var(--color-outline-variant)] group-hover:border-[var(--color-secondary)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-bg-base)] text-[var(--color-secondary)] relative z-10">
                    <Truck className="w-3.5 h-3.5" /> 
                    {dispatching === v._id ? 'INITIATING DISPATCH...' : 'DISPATCH TANKER'}
                  </button>
                ) : (
                  <div className="relative z-10"><LoginPrompt message="Sign in to dispatch" /></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line no-unused-vars
function MetricCard({ label, value, unit, icon: Icon, color, isAlert }) {
  const display = useCountUp(Math.min(value, 99999999), 1000);
  return (
    <div className={`card p-4 border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] relative overflow-hidden group ${isAlert && value > 0 ? 'border-l-2 border-l-[var(--color-error)]' : ''}`}>
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="w-16 h-16" style={{ color }} />
      </div>
      <div className="relative z-10 flex flex-col h-full justify-between">
        <p className="text-[10px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <Icon className="w-3 h-3" style={{ color }} /> {label}
        </p>
        <p className="text-2xl font-bold font-mono text-[var(--color-on-surface)]" style={{ textShadow: `0 0 15px ${color}30` }}>
          {formatNumber(display)}
          <span className="text-xs font-sans text-[var(--color-on-surface-variant)] ml-1">{unit}</span>
        </p>
      </div>
      {/* Bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-50 transition-all duration-500 group-hover:opacity-100 group-hover:h-1" style={{ backgroundColor: color }}></div>
    </div>
  );
}
