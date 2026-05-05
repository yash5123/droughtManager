import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Scale, Truck, AlertTriangle } from 'lucide-react';
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
  const [supplyData, setSupplyData] = useState(null);
  const [dispatching, setDispatching] = useState(null);

  // Try backend first, fall back to client-side estimation
  useEffect(() => {
    api.get('/supply').then(r => setSupplyData({ source: 'backend', data: r.data })).catch(() => setSupplyData(null));
  }, []);

  const villages = activeVillages.map(v => {
    const dailyDemand = v.population * LITERS_PER_PERSON_DAY;
    const supplyFactor = v.riskScore > 70 ? 0.3 : v.riskScore > 50 ? 0.5 : v.riskScore > 25 ? 0.75 : 0.95;
    const dailySupply = Math.round(dailyDemand * supplyFactor);
    const deficit = dailyDemand - dailySupply;
    const tankersNeeded = Math.ceil(deficit / TANKER_CAPACITY);
    return { ...v, dailyDemand, dailySupply, deficit, tankersNeeded };
  });

  const totalDemand = villages.reduce((s, v) => s + v.dailyDemand, 0);
  const totalSupply = villages.reduce((s, v) => s + v.dailySupply, 0);
  const totalDeficit = totalDemand - totalSupply;
  const criticalCount = villages.filter(v => v.tankersNeeded > 3).length;

  const chartData = villages.slice(0, 12).map(v => ({
    name: v.name.length > 8 ? v.name.slice(0, 7) + '…' : v.name,
    demand: Math.round(v.dailyDemand / 1000),
    supply: Math.round(v.dailySupply / 1000),
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
    <div className="space-y-5 animate-fade-in">
      <DataSourceBanner dataSource={dataSource} />
      {!supplyData && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'rgba(59,130,246,0.08)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
          <AlertTriangle className="w-3.5 h-3.5" /> Showing client-side estimates. Backend supply data unavailable.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Daily Demand" value={totalDemand} unit="L" color="#3b82f6" />
        <MetricCard label="Daily Supply" value={totalSupply} unit="L" color="#22c55e" />
        <MetricCard label="Deficit" value={totalDeficit} unit="L" color="#ef4444" />
        <MetricCard label="Critical Villages" value={criticalCount} unit="" color="#f97316" />
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-display mb-3">Demand vs Supply (× 1000 L/day)</h3>
        {chartData.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#556380', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#556380', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#111a2e', border: '1px solid #1e2d4a', borderRadius: 8, color: '#e8edf5', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#8896b3' }} />
              <Bar dataKey="demand" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={24} name="Demand" />
              <Bar dataKey="supply" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={24} name="Supply" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {villages.slice(0, 12).map((v, i) => (
          <div key={v._id || i} className="card p-3 card-hover">
            <div className="flex justify-between items-start mb-2">
              <div><p className="text-sm font-medium">{v.name}</p><p className="text-[10px] text-[var(--color-text-muted)]">{v.state}</p></div>
              <RiskBadge score={v.riskScore} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div><p className="text-xs font-mono font-bold text-blue-400">{formatNumber(Math.round(v.dailyDemand / 1000))}k</p><p className="text-[9px] text-[var(--color-text-muted)]">Demand</p></div>
              <div><p className="text-xs font-mono font-bold text-emerald-400">{formatNumber(Math.round(v.dailySupply / 1000))}k</p><p className="text-[9px] text-[var(--color-text-muted)]">Supply</p></div>
              <div><p className="text-xs font-mono font-bold text-red-400">{v.tankersNeeded}</p><p className="text-[9px] text-[var(--color-text-muted)]">Tankers</p></div>
            </div>
            {user ? (
              <button onClick={() => handleDispatch(v)} disabled={dispatching === v._id}
                className="w-full py-1.5 rounded-md text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ backgroundColor: 'rgba(6,182,212,0.1)', color: 'var(--color-cyan)' }}>
                <Truck className="w-3.5 h-3.5" /> {dispatching === v._id ? 'Dispatching...' : 'Dispatch'}
              </button>
            ) : (
              <LoginPrompt message="Sign in to dispatch" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, unit, color }) {
  const display = useCountUp(Math.min(value, 99999999), 1000);
  return (
    <div className="card p-3 card-hover">
      <p className="text-xl font-bold font-mono" style={{ color }}>{formatNumber(display)}<span className="text-xs ml-0.5">{unit}</span></p>
      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{label}</p>
    </div>
  );
}
