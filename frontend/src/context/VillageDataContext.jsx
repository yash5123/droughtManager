import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '../services/api.js';

const VillageDataContext = createContext(null);

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY_COUNT = 'aqvasense_village_count';

export function VillageDataProvider({ children }) {
  const [riskData, setRiskData] = useState([]);
  const [meta, setMeta] = useState(null);
  
  const [villageCount, setVillageCountRaw] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY_COUNT);
    return stored ? parseInt(stored) : 10;
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [dataSource, setDataSource] = useState('pending'); // 'backend' | 'seeding' | 'stale' | 'error'
  const [seedingStatus, setSeedingStatus] = useState(null);
  const [previousActiveIds, setPreviousActiveIds] = useState(new Set());
  const intervalRef = useRef(null);

  const setVillageCount = useCallback((count) => {
    setVillageCountRaw(count);
    localStorage.setItem(STORAGE_KEY_COUNT, count.toString());
  }, []);

  /**
   * Fetch seeding status from backend.
   * Used to show progress during initial database build.
   */
  const fetchSeedingStatus = useCallback(async () => {
    try {
      const res = await api.get('/villages/seeding-status');
      setSeedingStatus(res.data);
      return res.data;
    } catch (err) {
      console.warn('Could not fetch seeding status:', err.message);
      return null;
    }
  }, []);

  /**
   * Fetch ranked risk data from the backend.
   * This is the primary data source — pre-computed, pre-sorted.
   */
  const fetchRankedData = useCallback(async () => {
    try {
      const res = await api.get('/villages/ranked', { params: { limit: 200 } });
      if (res.data && res.data.data) {
        return res.data;
      }
      throw new Error('Invalid response format');
    } catch (err) {
      console.warn('Ranked data fetch failed:', err.message);
      return null;
    }
  }, []);

  const villageCountRef = useRef(villageCount);
  useEffect(() => {
    villageCountRef.current = villageCount;
  }, [villageCount]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch both in parallel
      const [rankedResult, seedStatus] = await Promise.all([
        fetchRankedData(),
        fetchSeedingStatus()
      ]);

      // Determine data source state
      if (seedStatus && seedStatus.inProgress) {
        setDataSource('seeding');
      } else if (rankedResult && rankedResult.data.length > 0) {
        if (rankedResult.meta?.isStale) {
          setDataSource('stale');
        } else {
          setDataSource('backend');
        }
      } else if (seedStatus && seedStatus.phase === 'complete' && rankedResult?.data?.length === 0) {
        // Seeding done but no risk data yet — daily job hasn't run
        setDataSource('stale');
      } else {
        setDataSource('seeding');
      }

      if (rankedResult && rankedResult.data.length > 0) {
        setRiskData(rankedResult.data);
        setMeta(rankedResult.meta);
        
        setPreviousActiveIds(prev => {
          const currentIds = new Set(rankedResult.data.slice(0, villageCountRef.current).map(v => v._id));
          return currentIds;
        });
      }

      setLastRefreshed(new Date());
    } catch (err) {
      setError(err.message);
      setDataSource('error');
    } finally {
      setLoading(false);
    }
  }, [fetchRankedData, fetchSeedingStatus]);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [refresh]);

  const activeVillages = useMemo(() => {
    return riskData.slice(0, villageCount);
  }, [riskData, villageCount]);

  const newlyEnteredIds = useMemo(() => {
    if (previousActiveIds.size === 0) return new Set();
    const currentIds = new Set(activeVillages.map(v => v._id));
    const entered = new Set();
    currentIds.forEach(id => {
      if (!previousActiveIds.has(id)) entered.add(id);
    });
    return entered;
  }, [activeVillages, previousActiveIds]);

  const [refreshCountdown, setRefreshCountdown] = useState(REFRESH_INTERVAL / 1000);
  useEffect(() => {
    const tick = setInterval(() => {
      if (lastRefreshed) {
        const elapsed = Date.now() - lastRefreshed.getTime();
        const remaining = Math.max(0, Math.ceil((REFRESH_INTERVAL - elapsed) / 1000));
        setRefreshCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [lastRefreshed]);

  const value = {
    allVillages: riskData, // All fetched data (up to 200)
    activeVillages,
    riskData,
    meta,
    villageCount,
    setVillageCount,
    loading,
    error,
    lastRefreshed,
    refreshCountdown,
    dataSource,
    seedingStatus,
    newlyEnteredIds,
    refresh,
  };

  return (
    <VillageDataContext.Provider value={value}>
      {children}
    </VillageDataContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useVillageData() {
  const ctx = useContext(VillageDataContext);
  if (!ctx) throw new Error('useVillageData must be used within VillageDataProvider');
  return ctx;
}
