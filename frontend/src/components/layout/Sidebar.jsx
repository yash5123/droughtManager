import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, CloudRain, Droplets, ShieldAlert, Calculator, Scale, TrendingUp, Truck, ChevronLeft, ChevronRight, Search, User, LogOut, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useVillageData } from '../../context/VillageDataContext.jsx';

const NAV_GROUPS = [
  {
    label: 'Monitoring',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Overview' },
      { path: '/map', icon: Map, label: 'Risk Map' },
      { path: '/rainfall', icon: CloudRain, label: 'Rainfall' },
      { path: '/groundwater', icon: Droplets, label: 'Groundwater' },
    ]
  },
  {
    label: 'Analysis',
    items: [
      { path: '/risk', icon: ShieldAlert, label: 'Risk Classification' },
      { path: '/calculator', icon: Calculator, label: 'Risk Calculator' },
      { path: '/supply', icon: Scale, label: 'Supply vs Demand' },
      { path: '/prediction', icon: TrendingUp, label: 'Prediction' },
    ]
  },
  {
    label: 'Operations',
    items: [
      { path: '/tankers', icon: Truck, label: 'Tanker Dispatch', protected: true },
    ]
  }
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, openLoginModal, logout } = useAuth();
  const { dataSource } = useVillageData();
  const location = useLocation();

  return (
    <aside
      className="hidden md:flex flex-col h-full border-r transition-all duration-300 flex-shrink-0"
      style={{
        width: collapsed ? '64px' : '240px',
        backgroundColor: 'var(--color-bg-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-14 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[var(--color-cyan)]" />
            <span className="text-sm font-bold text-display tracking-tight">AqvaSense</span>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-[var(--color-bg-elevated)] transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" /> : <ChevronLeft className="w-4 h-4 text-[var(--color-text-muted)]" />}
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border outline-none focus:border-[var(--color-cyan)] transition-colors"
              style={{ backgroundColor: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 hide-scrollbar">
        {NAV_GROUPS.map((group) => {
          const filtered = group.items.filter(item =>
            !searchQuery || item.label.toLowerCase().includes(searchQuery.toLowerCase())
          );
          if (filtered.length === 0) return null;
          return (
            <div key={group.label} className="mb-3">
              {!collapsed && (
                <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  {group.label}
                </p>
              )}
              {filtered.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2.5 mx-2 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 group relative ${
                      isActive ? 'font-medium' : 'hover:bg-[var(--color-bg-elevated)]'
                    }`}
                    style={{
                      backgroundColor: isActive ? 'rgba(6, 182, 212, 0.1)' : undefined,
                      color: isActive ? 'var(--color-cyan)' : 'var(--color-text-secondary)',
                    }}
                  >
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r" style={{ backgroundColor: 'var(--color-cyan)' }} />}
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                    {!collapsed && item.protected && !user && (
                      <span className="ml-auto opacity-50"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></span>
                    )}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50"
                        style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}>
                        {item.label}
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Status Indicator */}
      <div className="px-3 py-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <span className={`w-2 h-2 rounded-full ${dataSource === 'backend' ? 'bg-emerald-400 pulse-live' : 'bg-amber-400'}`} />
            <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">
              {dataSource === 'backend' ? 'Live' : 'Seed Data'}
            </span>
          </div>
        )}
      </div>

      {/* User */}
      <div className="px-3 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
        {user ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: 'var(--color-cyan)' }}>
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{user.name}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] truncate">{user.email}</p>
                </div>
                <button onClick={logout} className="p-1 rounded hover:bg-[var(--color-bg-elevated)]" aria-label="Sign out">
                  <LogOut className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                </button>
              </>
            )}
          </div>
        ) : (
          <button onClick={() => openLoginModal()}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--color-bg-elevated)]"
            style={{ color: 'var(--color-cyan)' }}>
            <User className="w-4 h-4" />
            {!collapsed && 'Sign In'}
          </button>
        )}
      </div>
    </aside>
  );
}
