import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, RefreshCw } from 'lucide-react';
import { useVillageData } from '../../context/VillageDataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const PAGE_TITLES = {
  '/': 'Overview', '/map': 'Risk Map', '/rainfall': 'Rainfall Analysis',
  '/groundwater': 'Groundwater Monitoring', '/risk': 'Risk Classification',
  '/calculator': 'Risk Calculator', '/supply': 'Supply vs Demand',
  '/prediction': 'Future Prediction', '/tankers': 'Tanker Dispatch',
};

export default function TopBar() {
  const location = useLocation();
  const { villageCount, setVillageCount, refreshCountdown, dataSource, refresh, loading } = useVillageData();
  const { user, openLoginModal } = useAuth();
  const title = PAGE_TITLES[location.pathname] || 'AqvaSense';
  const fmt = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b flex-shrink-0"
      style={{ backgroundColor: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}>
      <h1 className="text-base font-semibold text-display">{title}</h1>
      <div className="hidden sm:flex items-center gap-1 px-1 py-0.5 rounded-lg" />
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dataSource==='backend' ? 'bg-emerald-400 pulse-live' : 'bg-amber-400'}`} />
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: dataSource==='backend' ? '#22c55e' : '#f59e0b' }}>
            {dataSource==='backend' ? 'LIVE' : 'SEED'}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)] font-mono">{fmt(refreshCountdown)}</span>
        </div>
        <button onClick={refresh} disabled={loading} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-elevated)] transition-colors disabled:opacity-50" aria-label="Refresh">
          <RefreshCw className={`w-4 h-4 text-[var(--color-text-muted)] ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button className="p-1.5 rounded-lg hover:bg-[var(--color-bg-elevated)] transition-colors" aria-label="Alerts">
          <Bell className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
        {user ? (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'rgba(6,182,212,0.15)', color: 'var(--color-cyan)' }}>
            {user.name?.[0]?.toUpperCase()||'U'}
          </div>
        ) : (
          <button onClick={() => openLoginModal()} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'rgba(6,182,212,0.1)', color: 'var(--color-cyan)' }}>Sign In</button>
        )}
      </div>
    </header>
  );
}
