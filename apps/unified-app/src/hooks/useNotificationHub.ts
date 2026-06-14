import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  fetchNotificationStats,
  fetchNotifications,
  subscribeToNotifications,
} from '@/services/broadcastNotificationService';
import type { AppNotification, NotificationFilters } from '@/types/notifications';
import { applyNotificationFilters, countActiveFilters } from '@/utils/notificationUtils';

const DEFAULT_FILTERS: NotificationFilters = {
  tab: 'sent',
  searchQuery: '',
  sortBy: 'newest',
  priority: 'all',
  eventType: 'all',
  audienceType: 'all',
  dateRange: { from: null, to: null },
};

export function useNotificationHub(initialTab: 'drafts' | 'sent' = 'sent') {
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>([]);
  const [filters, setFilters] = useState<NotificationFilters>({ ...DEFAULT_FILTERS, tab: initialTab });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.searchQuery), 300);
    return () => clearTimeout(t);
  }, [filters.searchQuery]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchNotifications();
      setAllNotifications(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void load();
    const unsub = subscribeToNotifications(setAllNotifications);
    const poll = setInterval(() => void load(), 30000);
    return () => {
      unsub();
      clearInterval(poll);
    };
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const updateFilters = useCallback((patch: Partial<NotificationFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters((prev) => ({ ...DEFAULT_FILTERS, tab: prev.tab }));
  }, []);

  const setTab = useCallback((tab: 'drafts' | 'sent') => {
    setFilters((prev) => ({ ...DEFAULT_FILTERS, tab, sortBy: prev.sortBy }));
  }, []);

  const effectiveFilters = useMemo(
    () => ({ ...filters, searchQuery: debouncedSearch }),
    [filters, debouncedSearch],
  );

  const drafts = useMemo(() => allNotifications.filter((n) => n.isDraft), [allNotifications]);
  const sentHistory = useMemo(() => allNotifications.filter((n) => !n.isDraft), [allNotifications]);

  const filteredDrafts = useMemo(
    () => applyNotificationFilters(drafts, effectiveFilters),
    [drafts, effectiveFilters],
  );
  const filteredSent = useMemo(
    () => applyNotificationFilters(sentHistory, effectiveFilters),
    [sentHistory, effectiveFilters],
  );

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  return {
    drafts: filteredDrafts,
    sentHistory: filteredSent,
    sentCount: sentHistory.length,
    draftCount: drafts.length,
    allNotifications,
    filters,
    effectiveFilters,
    updateFilters,
    resetFilters,
    setTab,
    activeFilterCount,
    loading,
    refreshing,
    onRefresh,
    error,
    reload: load,
  };
}

export function useNotificationsSidebarBadge() {
  const [draftCount, setDraftCount] = useState(0);
  const [hasUpcomingScheduled, setHasUpcomingScheduled] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const all = await fetchNotifications();
        const drafts = all.filter((n) => n.isDraft);
        setDraftCount(drafts.length);
        const oneHour = Date.now() + 60 * 60 * 1000;
        const upcoming = all.some(
          (n) =>
            n.status === 'scheduled' &&
            n.schedule.scheduledAt &&
            n.schedule.scheduledAt.getTime() <= oneHour &&
            n.schedule.scheduledAt.getTime() > Date.now(),
        );
        setHasUpcomingScheduled(upcoming);
      } catch {
        /* ignore */
      }
    };
    void check();
    const unsub = subscribeToNotifications(() => void check());
    return unsub;
  }, []);

  return {
    draftCount,
    hasUpcomingScheduled,
    showAmberDot: draftCount > 0,
    showIndigoDot: hasUpcomingScheduled,
    showBadge: draftCount > 0 || hasUpcomingScheduled,
  };
}

export function useNotificationsDashboardStats() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchNotificationStats>> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchNotificationStats();
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const unsub = subscribeToNotifications(() => void load());
    return unsub;
  }, [load]);

  return { stats, loading, reload: load };
}
