import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, RefreshCw, Sun, Moon } from 'lucide-react';
import { useVillageData } from '../../context/VillageDataContext.jsx';
import { useRankedVillages, useSeedingStatus } from '../../hooks/useRiskData.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../ui/Toast.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

const PAGE_TITLES = {
  '/': 'Overview', '/map': 'Risk Map', '/rainfall': 'Rainfall Analysis',
  '/groundwater': 'Groundwater Monitoring', '/risk': 'Risk Classification',
  '/calculator': 'Risk Calculator', '/supply': 'Supply vs Demand',
  '/prediction': 'Future Prediction', '/tankers': 'Tanker Dispatch',
};

export default function TopBar() {
  const location = useLocation();
  const { data: rankedData, isLoading: rankedLoading, refetch: refresh, dataUpdatedAt } = useRankedVillages(10); // small limit just for status
  const { data: seedingStatus, isLoading: seedingLoading } = useSeedingStatus();
  
  const riskData = rankedData?.data || [];
  let dataSource = 'pending';
  if (seedingStatus?.inProgress) dataSource = 'seeding';
  else if (riskData.length > 0) dataSource = rankedData?.meta?.isStale ? 'stale' : 'backend';
  else if (seedingStatus?.phase === 'complete' && riskData.length === 0) dataSource = 'stale';
  else if (seedingStatus) dataSource = 'seeding';

  const loading = rankedLoading || seedingLoading;
  const lastRefreshed = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const { user, openLoginModal } = useAuth();
  const { addToast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const handleAlerts = () => {
    addToast('You have no new alerts at this time.', 'info');
  };

  const title = PAGE_TITLES[location.pathname] || 'AqvaSense';

  const formatTime = (date) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const isLive = dataSource === 'backend';
  const indicatorColor = isLive ? 'var(--accent-green)' : 'var(--text-tertiary)';
  const indicatorLabel = isLive ? 'LIVE' : 'OFFLINE';

  return (
    <header className="topbar glass-panel" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0 }}>
      <h1 className="page-title">{title}</h1>
      
      <div className="topbar-actions">
        {/* Live Status Indicator */}
        <div className="live-status-indicator">
          <div className="status-dot-container">
            <div className={`status-dot ${isLive ? 'live-pulse' : ''}`} style={{ backgroundColor: indicatorColor }} />
          </div>
          <span className="status-label">{indicatorLabel}</span>
          <span className="status-time">{formatTime(lastRefreshed)}</span>
        </div>

        <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle Theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button className="icon-btn" onClick={refresh} disabled={loading} aria-label="Refresh">
          <RefreshCw size={18} className={loading ? 'spinning' : ''} />
        </button>

        <button className="icon-btn notification-btn" onClick={handleAlerts} aria-label="Alerts">
          <Bell size={18} />
          <span className="notification-badge" />
        </button>

        {user ? (
          <div className="user-avatar" style={{ cursor: 'pointer' }}>
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>
        ) : (
          <div className="user-avatar" style={{ cursor: 'pointer' }} onClick={() => openLoginModal()}>
            ?
          </div>
        )}
      </div>
    </header>
  );
}
