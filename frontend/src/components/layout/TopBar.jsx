import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, RefreshCw, Sun, Moon, Database, Loader2 } from 'lucide-react';
import { useVillageData } from '../../context/VillageDataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../ui/Toast.jsx';

const PAGE_TITLES = {
  '/': 'Overview', '/map': 'Risk Map', '/rainfall': 'Rainfall Analysis',
  '/groundwater': 'Groundwater Monitoring', '/risk': 'Risk Classification',
  '/calculator': 'Risk Calculator', '/supply': 'Supply vs Demand',
  '/prediction': 'Future Prediction', '/tankers': 'Tanker Dispatch',
};

export default function TopBar() {
  const location = useLocation();
  const { dataSource, seedingStatus, refresh, loading, error, lastRefreshed, meta } = useVillageData();
  const { user, openLoginModal } = useAuth();
  const { addToast } = useToast();
  const [theme, setTheme] = React.useState('dark');

  React.useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const handleAlerts = () => {
    addToast('You have no new alerts at this time.', 'info');
  };

  const title = PAGE_TITLES[location.pathname] || 'AqvaSense';

  // Determine indicator state
  let indicatorColor = 'bg-gray-400';
  let indicatorLabel = 'PENDING';
  let indicatorGlow = '';
  let isLive = false;

  if (error || dataSource === 'error') {
    indicatorColor = 'bg-red-500';
    indicatorLabel = 'ERROR';
  } else if (dataSource === 'seeding') {
    indicatorColor = 'bg-orange-500';
    indicatorLabel = 'SEEDING';
  } else if (dataSource === 'stale') {
    indicatorColor = 'bg-amber-400';
    indicatorLabel = 'STALE';
  } else if (dataSource === 'backend') {
    indicatorColor = 'bg-emerald-400';
    indicatorLabel = 'LIVE';
    indicatorGlow = 'shadow-[0_0_8px_rgba(52,211,153,0.5)]';
    isLive = true;
  }

  const formatTime = (date) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Seeding progress
  const isSeeding = dataSource === 'seeding' && seedingStatus;
  const seedPhase = seedingStatus?.phase || 'idle';
  const seedTotal = seedingStatus?.totalDistricts || 0;
  const seedGeocoded = seedingStatus?.geocodedCount || 0;
  const seedBaselined = seedingStatus?.baselinedCount || 0;
  const seedCurrent = seedingStatus?.currentDistrict || '';

  let seedProgress = 0;
  let seedLabel = '';
  if (seedPhase === 'importing') {
    seedProgress = 10;
    seedLabel = `Importing districts... ${seedingStatus?.importedCount || 0} found`;
  } else if (seedPhase === 'geocoding') {
    seedProgress = seedTotal > 0 ? 10 + (seedGeocoded / seedTotal) * 45 : 15;
    seedLabel = `Geocoding... ${seedGeocoded} of ${seedTotal}`;
  } else if (seedPhase === 'baselines') {
    seedProgress = seedTotal > 0 ? 55 + (seedBaselined / seedTotal) * 45 : 60;
    seedLabel = `Climate baselines... ${seedBaselined} of ${seedTotal}`;
  }

  return (
    <div className="flex flex-col flex-shrink-0">
      <header className="h-14 flex items-center justify-between px-4 border-b bg-[var(--color-bg-surface)] border-[var(--color-border)]">
        <h1 className="text-base font-semibold text-display">{title}</h1>
        <div className="hidden sm:flex items-center gap-1 px-1 py-0.5 rounded-lg" />
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${indicatorColor} ${indicatorGlow} ${isLive ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: isLive ? '#34d399' : dataSource === 'error' ? '#ef4444' : dataSource === 'seeding' ? '#f97316' : dataSource === 'stale' ? '#fbbf24' : '#9ca3af' }}>
              {indicatorLabel}
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] font-mono ml-2">
              Last: {formatTime(lastRefreshed)}
            </span>
          </div>
          <button onClick={refresh} disabled={loading} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-elevated)] transition-colors disabled:opacity-50" aria-label="Refresh">
            <RefreshCw className={`w-4 h-4 text-[var(--color-text-muted)] ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={toggleTheme} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-elevated)] transition-colors" aria-label="Toggle Theme">
            {theme === 'dark' ? <Sun className="w-4 h-4 text-[var(--color-text-muted)]" /> : <Moon className="w-4 h-4 text-[var(--color-text-muted)]" />}
          </button>
          <button onClick={handleAlerts} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-elevated)] transition-colors" aria-label="Alerts">
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

      {/* Seeding progress banner */}
      {isSeeding && (
        <div className="w-full border-b border-orange-500/20 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10">
          <div className="px-4 py-2.5 flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-orange-400 animate-spin flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-orange-300">{seedLabel}</span>
                <span className="text-[10px] font-mono text-orange-400/70">{Math.round(seedProgress)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-orange-950/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-1000 ease-out"
                  style={{ width: `${seedProgress}%` }}
                />
              </div>
              {seedCurrent && (
                <p className="text-[10px] text-orange-400/50 mt-1 truncate font-mono">
                  <Database className="w-3 h-3 inline mr-1" />
                  {seedCurrent}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stale data warning */}
      {dataSource === 'stale' && !isSeeding && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2 text-amber-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Risk data may be outdated — daily update pending. Last updated: {meta?.latestDate ? new Date(meta.latestDate).toLocaleDateString() : 'unknown'}</span>
        </div>
      )}
    </div>
  );
}
