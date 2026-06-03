import { useQuery } from '@tanstack/react-query';
import api from '../services/api.js';

export function useRankedVillages(limit = 1000) {
  return useQuery({
    queryKey: ['rankedVillages', limit],
    queryFn: async () => {
      const { data } = await api.get('/villages/ranked', { params: { limit } });
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: (query) => {
      // If we know we are stale or seeding, refetch faster
      const data = query.state.data;
      if (!data) return 5 * 60 * 1000;
      if (data.meta?.isStale) return 30 * 1000; // 30s polling if stale
      return 5 * 60 * 1000;
    }
  });
}

export function useSeedingStatus() {
  return useQuery({
    queryKey: ['seedingStatus'],
    queryFn: async () => {
      const { data } = await api.get('/villages/seeding-status');
      return data;
    },
    // Poll fast while seeding is active
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;
      const isSeeding = data.phase && data.phase !== 'complete';
      const isJobRunning = data.dailyJob?.running;
      return (isSeeding || isJobRunning) ? 3000 : 60000;
    }
  });
}
