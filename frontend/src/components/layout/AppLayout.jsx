import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, CloudRain, Droplets, Truck } from 'lucide-react';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';

const MOBILE_NAV = [
  { path: '/', icon: LayoutDashboard, label: 'Overview' },
  { path: '/map', icon: Map, label: 'Map' },
  { path: '/rainfall', icon: CloudRain, label: 'Rain' },
  { path: '/groundwater', icon: Droplets, label: 'Water' },
  { path: '/tankers', icon: Truck, label: 'Tankers' },
];

export default function AppLayout({ children }) {
  const location = useLocation();
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg-base)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around border-t z-50"
        style={{ backgroundColor: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}>
        {MOBILE_NAV.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <NavLink key={path} to={path} className="flex flex-col items-center gap-0.5 py-1 min-w-[48px]">
              <Icon className="w-5 h-5" style={{ color: active ? 'var(--color-cyan)' : 'var(--color-text-muted)' }} />
              <span className="text-[10px]" style={{ color: active ? 'var(--color-cyan)' : 'var(--color-text-muted)' }}>{label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
