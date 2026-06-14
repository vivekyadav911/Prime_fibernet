import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  deletePlan as deletePlanService,
  duplicatePlan as duplicatePlanService,
  fetchPlans,
  isPlansRealtimeAvailable,
  migratePlansCollection,
  subscribeToPlans,
  togglePlanStatus as togglePlanStatusService,
} from '@/services/planService';
import { useAppSelector } from '@/store/hooks';
import type { Plan, PlanFilters } from '@/types/plans';
import { DEFAULT_PLAN_FILTERS } from '@/types/plans';
import { applyPlanFilters, computePlanStats, countActiveFilters } from '@/utils/planUtils';

const VIEW_MODE_KEY = 'adminPlansViewMode';

export function usePlans() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const adminName = useAppSelector((s) => s.auth.user?.name ?? 'Admin');

  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [filters, setFilters] = useState<PlanFilters>(DEFAULT_PLAN_FILTERS);
  const [viewMode, setViewModeState] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(VIEW_MODE_KEY).then((v) => {
      if (v === 'grid' || v === 'list') setViewModeState(v);
    });
  }, []);

  const setViewMode = useCallback((mode: 'grid' | 'list') => {
    setViewModeState(mode);
    void AsyncStorage.setItem(VIEW_MODE_KEY, mode);
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await fetchPlans();
      setAllPlans(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plans');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void load();
    void (async () => {
      try {
        await migratePlansCollection();
        await load(true);
      } catch (e) {
        console.warn('[usePlans] migration failed:', e);
      }
    })();
  }, [isAuthenticated, load]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = subscribeToPlans(setAllPlans);

    let pollInterval: ReturnType<typeof setInterval> | undefined;
    if (!isPlansRealtimeAvailable()) {
      pollInterval = setInterval(() => {
        void load(true);
      }, 30_000);
    }

    return () => {
      unsubscribe();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isAuthenticated, load]);

  const filteredPlans = useMemo(
    () => applyPlanFilters(allPlans, filters),
    [allPlans, filters],
  );

  const stats = useMemo(
    () => computePlanStats(allPlans.filter((p) => !p.isDeleted)),
    [allPlans],
  );

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const updateFilters = useCallback((partial: Partial<PlanFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_PLAN_FILTERS);
  }, []);

  const onRefresh = useCallback(() => {
    void load(true);
  }, [load]);

  const togglePlanStatus = useCallback(
    async (id: string, isActive: boolean) => {
      const previous = allPlans;
      setAllPlans((plans) =>
        plans.map((p) => (p.id === id ? { ...p, isActive } : p)),
      );
      try {
        await togglePlanStatusService(id, isActive, adminName);
      } catch (e) {
        setAllPlans(previous);
        throw e;
      }
    },
    [allPlans, adminName],
  );

  const deletePlan = useCallback(
    async (id: string) => {
      await deletePlanService(id, adminName);
      setAllPlans((plans) => plans.filter((p) => p.id !== id));
    },
    [adminName],
  );

  const duplicatePlan = useCallback(
    async (id: string, newDisplayName: string, newPlanTag: string) => {
      const created = await duplicatePlanService(id, newDisplayName, newPlanTag, adminName);
      setAllPlans((plans) => [...plans, created]);
      return created;
    },
    [adminName],
  );

  return {
    plans: filteredPlans,
    allPlans,
    stats,
    filters,
    updateFilters,
    resetFilters,
    activeFilterCount,
    viewMode,
    setViewMode,
    loading,
    refreshing,
    onRefresh,
    error,
    togglePlanStatus,
    deletePlan,
    duplicatePlan,
    reload: load,
  };
}

export function usePlansSidebarBadge() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    const check = async () => {
      try {
        const plans = await fetchPlans();
        const reviewCount = plans.filter((p) => !p.isActive && p.subscriberCount > 0).length;
        setCount(reviewCount);
      } catch {
        setCount(0);
      }
    };
    void check();
    const unsubscribe = subscribeToPlans((plans) => {
      setCount(plans.filter((p) => !p.isActive && p.subscriberCount > 0).length);
    });
    const poll = setInterval(() => void check(), 60_000);
    return () => {
      unsubscribe();
      clearInterval(poll);
    };
  }, [isAuthenticated]);

  return { showBadge: count > 0, count };
}

export function usePlansDashboardStats() {
  const [stats, setStats] = useState(computePlanStats([]));
  const [loading, setLoading] = useState(true);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;
    void (async () => {
      setLoading(true);
      try {
        const plans = await fetchPlans();
        setStats(computePlanStats(plans.filter((p) => !p.isDeleted)));
      } catch {
        setStats(computePlanStats([]));
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated]);

  return { stats, loading };
}
