import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const VillageDataContext = createContext(null);
const STORAGE_KEY_COUNT = 'aqvasense_village_count';

export function VillageDataProvider({ children }) {
  const [villageCount, setVillageCountRaw] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY_COUNT);
    return stored ? parseInt(stored) : 10;
  });

  const setVillageCount = useCallback((count) => {
    setVillageCountRaw(count);
    localStorage.setItem(STORAGE_KEY_COUNT, count.toString());
  }, []);

  const value = useMemo(() => ({
    villageCount,
    setVillageCount,
  }), [villageCount, setVillageCount]);

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
