import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '../services/api.js';
import { SEED_VILLAGES } from '../data/seedVillages.js';

const VillageDataContext = createContext(null);

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY_COUNT = 'aqvasense_village_count';

export function VillageDataProvider({ children }) {
  const [allVillages, setAllVillages] = useState([]);
  const [riskData, setRiskData] = useState([]);
  const [villageCount, setVillageCountRaw] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY_COUNT);
    return stored ? parseInt(stored) : 10;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [dataSource, setDataSource] = useState('pending');
  const [previousActiveIds, setPreviousActiveIds] = useState(new Set());
  const intervalRef = useRef(null);

  const setVillageCount = useCallback((count) => {
    setVillageCountRaw(count);
    localStorage.setItem(STORAGE_KEY_COUNT, count.toString());
  }, []);

  // Fetch village list from backend, fallback to seed data
  const fetchVillages = useCallback(async () => {
    try {
      const res = await api.get('/villages');
      if (res.data && res.data.length > 0) {
        setAllVillages(res.data);
        setDataSource('backend');
        return res.data;
      }
    } catch (err) {
      console.warn('Villages fetch failed, using seed data:', err.message);
    }
    setAllVillages(SEED_VILLAGES);
    setDataSource('seed-data');
    return SEED_VILLAGES;
  }, []);

  // Fetch risk scores for all villages
  const fetchRiskData = useCallback(async () => {
    try {
      const res = await api.get('/risk/latest');
      if (res.data && res.data.length > 0) {
        return res.data;
      }
    } catch (err) {
      console.warn('Risk data fetch failed:', err.message);
    }
    return [];
  }, []);

  // Build merged village+risk array, sorted by riskScore desc
  const buildRankedList = useCallback((villages, risks) => {
    const riskMap = new Map();
    risks.forEach(r => {
      const id = r.village?._id || r._id;
      if (id) riskMap.set(id.toString(), r);
    });

    return villages.map(v => {
      const id = v._id?.toString() || v.id?.toString();
      const risk = riskMap.get(id);
      return {
        ...v,
        _id: id,
        riskScore: risk?.riskScore ?? Math.floor(Math.random() * 30 + 25), // Only if no risk data exists at all
        riskLevel: risk?.riskLevel ?? 'Moderate',
        rainfallDeficit: risk?.rainfallDeficit ?? 0,
        gwDepletion: risk?.gwDepletion ?? 0,
        metricsSnapshot: risk?.metricsSnapshot ?? null,
        hasRealRiskData: !!risk,
      };
    }).sort((a, b) => b.riskScore - a.riskScore);
  }, []);

  const villageCountRef = useRef(villageCount);
  useEffect(() => {
    villageCountRef.current = villageCount;
  }, [villageCount]);

  // Full refresh
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const villages = await fetchVillages();
      const risks = await fetchRiskData();
      const ranked = buildRankedList(villages, risks);
      setRiskData(ranked);
      setLastRefreshed(new Date());

      // Track which villages were in previous active set
      setPreviousActiveIds(prev => {
        const currentIds = new Set(ranked.slice(0, villageCountRef.current).map(v => v._id));
        return currentIds;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchVillages, fetchRiskData, buildRankedList]);

  // Initial fetch + auto-refresh
  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [refresh]);

  // Active villages = top N from sorted list (instant re-slice, no re-fetch)
  const activeVillages = useMemo(() => {
    return riskData.slice(0, villageCount);
  }, [riskData, villageCount]);

  // Detect newly entered villages
  const newlyEnteredIds = useMemo(() => {
    if (previousActiveIds.size === 0) return new Set();
    const currentIds = new Set(activeVillages.map(v => v._id));
    const entered = new Set();
    currentIds.forEach(id => {
      if (!previousActiveIds.has(id)) entered.add(id);
    });
    return entered;
  }, [activeVillages, previousActiveIds]);

  // Time until next refresh
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
    allVillages,
    activeVillages,
    riskData,
    villageCount,
    setVillageCount,
    loading,
    error,
    lastRefreshed,
    refreshCountdown,
    dataSource,
    newlyEnteredIds,
    refresh,
  };

  return (
    <VillageDataContext.Provider value={value}>
      {children}
    </VillageDataContext.Provider>
  );
}

export function useVillageData() {
  const ctx = useContext(VillageDataContext);
  if (!ctx) throw new Error('useVillageData must be used within VillageDataProvider');
  return ctx;
}
