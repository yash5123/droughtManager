import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { RefreshCw, Sun, Moon, Menu } from 'lucide-react';
import { useVillageData } from '../../context/VillageDataContext.jsx';
import { useRankedVillages, useSeedingStatus } from '../../hooks/useRiskData.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../ui/Toast.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import api from '../../services/api.js';

const PAGE_TITLES = {
  '/': 'Overview', '/map': 'Risk Map', '/rainfall': 'Rainfall Analysis',
  '/groundwater': 'Groundwater Monitoring', '/risk': 'Risk Classification',
  '/calculator': 'Risk Calculator', '/supply': 'Supply vs Demand',
  '/prediction': 'Future Prediction', '/tankers': 'Tanker Dispatch',
};

export default function TopBar({ onHamburgerClick }) {
  const location = useLocation();
  const { data: rankedData, isLoading: rankedLoading, refetch: refresh, dataUpdatedAt } = useRankedVillages(10); // small limit just for status
  const { data: seedingStatus, isLoading: seedingLoading } = useSeedingStatus();
  
  const riskData = rankedData?.data || [];
  let dataSource = 'pending';
  if (seedingStatus?.inProgress) dataSource = 'seeding';
  else if (seedingStatus?.dailyJob?.running) dataSource = 'updating';
  else if (riskData.length > 0) dataSource = rankedData?.meta?.isStale ? 'stale' : 'backend';
  else if (seedingStatus?.phase === 'complete' && riskData.length === 0) dataSource = 'stale';
  else if (seedingStatus) dataSource = 'seeding';

  const loading = rankedLoading || seedingLoading;
  const lastRefreshed = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const { user, openLoginModal } = useAuth();
  const { addToast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const title = PAGE_TITLES[location.pathname] || 'AqvaSense';

  const formatTime = (date) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const isLive = dataSource === 'backend';
  const indicatorColor = isLive ? 'var(--accent-green)' : (dataSource === 'updating' ? 'var(--accent-amber)' : 'var(--text-tertiary)');
  const indicatorLabel = isLive ? 'LIVE' : (dataSource === 'updating' ? 'UPDATING' : 'OFFLINE');

  const handleRefresh = async () => {
    refresh();
    if (dataSource === 'stale') {
      try {
        await api.post('/weather/trigger-daily-job');
        addToast('Daily update job triggered. This may take a few minutes.', 'info');
      } catch (err) {
        addToast('Failed to trigger update job', 'error');
      }
    }
  };

  return (
    <header className="topbar glass-panel" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0 }}>
      <button 
        className="hamburger-btn"
        onClick={onHamburgerClick}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>
      <h1 className="page-title topbar-title">{title}</h1>
      
      <div className="topbar-actions">
        {/* Live Status Indicator */}
        <div className="live-status-indicator">
          <div className="status-dot-container">
            <div className={`status-dot ${isLive || dataSource === 'updating' ? 'live-pulse' : ''}`} style={{ backgroundColor: indicatorColor }} />
          </div>
          <span className="status-label">{indicatorLabel}</span>
          <span className="status-time">{dataSource === 'updating' ? formatTime(currentTime) : formatTime(lastRefreshed)}</span>
        </div>

        <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle Theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button className="icon-btn" onClick={handleRefresh} disabled={loading || dataSource === 'updating'} aria-label="Refresh">
          <RefreshCw size={18} className={(loading || dataSource === 'updating') ? 'spinning' : ''} />
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
