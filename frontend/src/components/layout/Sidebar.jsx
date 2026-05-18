import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, CloudRain, Droplets, ShieldAlert, Calculator, Scale, TrendingUp, Truck, ChevronLeft, ChevronRight, User, LogOut, Sun, Moon, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

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

export default function Sidebar({ isMobileOpen, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, openLoginModal, logout } = useAuth();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className={`sidebar glass-panel ${isMobileOpen ? 'mobile-open' : ''}`} style={{ width: collapsed ? '68px' : '220px' }}>
      <div className="sidebar-brand">
        {!collapsed && <Droplets size={24} style={{ color: 'var(--accent-cyan)', filter: 'drop-shadow(var(--accent-cyan-glow))' }} />}
        {!collapsed && <span className="brand-text">AqvaSense</span>}
        
        {/* Desktop: collapse toggle */}
        <button 
          className="glass-btn sidebar-collapse-btn" 
          onClick={() => setCollapsed(!collapsed)} 
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{ width: '28px', height: '28px', padding: 0, marginLeft: collapsed ? 'auto' : 'auto', marginRight: collapsed ? 'auto' : '0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Mobile: close button */}
        <button 
          className="glass-btn sidebar-close-btn"
          onClick={onMobileClose}
          aria-label="Close menu"
          style={{ width: '28px', height: '28px', padding: 0, marginLeft: 'auto', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
        >
          <X size={18} />
        </button>
      </div>
      
      <div className="sidebar-divider" />

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="nav-group">
            {!collapsed && <p className="nav-group-label card-label" style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>{group.label}</p>}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink key={item.path} to={item.path} className={`nav-item ${isActive ? 'active' : ''}`}>
                  <Icon size={18} className="nav-icon" />
                  {!collapsed && <span className="nav-label">{item.label}</span>}
                  {!collapsed && item.protected && !user && (
                    <span style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Section (Pinned Bottom) */}
      <div className="sidebar-footer">
        {user ? (
          <div className="user-profile">
            <div className="user-avatar">
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="user-info">
                <p className="user-name">{user.name}</p>
                <p className="user-email">{user.email}</p>
              </div>
            )}
            {!collapsed && (
              <button className="icon-btn" onClick={logout} aria-label="Sign out">
                <LogOut size={16} />
              </button>
            )}
          </div>
        ) : (
          <button className="glass-btn login-btn" onClick={() => openLoginModal()}>
            <User size={16} />
            {!collapsed && <span style={{ marginLeft: '8px' }}>Sign In</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
