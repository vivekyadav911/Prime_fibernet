import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchTickets, subscribeToTickets } from '@/services/ticketsService';
import { useAppSelector } from '@/store/hooks';
import type { Ticket, TicketFilters, TicketStats } from '@/types/tickets';
import { applyTicketFilters } from '@/utils/ticketViewMappers';
import {
  buildSlaStatusFromTicket,
  computeTicketStats,
  isOpenTicketSlaBreached,
} from '@/utils/slaUtils';

export const DEFAULT_TICKET_FILTERS: TicketFilters = {
  status: 'All',
  priority: 'All',
  complaintType: 'All',
  assignment: 'all',
  slaBreached: null,
  dateRange: { from: null, to: null },
  sortBy: 'newest',
  searchQuery: '',
};

function refreshSlaFields(tickets: Ticket[]): Ticket[] {
  return tickets.map((t) => ({
    ...t,
    slaStatus: buildSlaStatusFromTicket(t),
  }));
}

export function useTickets(initialFilters?: Partial<TicketFilters>) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [filters, setFilters] = useState<TicketFilters>({
    ...DEFAULT_TICKET_FILTERS,
    ...initialFilters,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await fetchTickets();
      setAllTickets(refreshSlaFields(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void load();
  }, [isAuthenticated, load]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const unsubscribe = subscribeToTickets(() => {
      void load(true);
    });
    return unsubscribe;
  }, [isAuthenticated, load]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAllTickets((prev) => refreshSlaFields(prev));
      setTick((t) => t + 1);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const ticketsWithSla = useMemo(() => refreshSlaFields(allTickets), [allTickets, tick]);

  const filteredTickets = useMemo(
    () => applyTicketFilters(ticketsWithSla, filters),
    [ticketsWithSla, filters],
  );

  const stats = useMemo<TicketStats>(
    () => computeTicketStats(filteredTickets),
    [filteredTickets],
  );

  const updateFilters = useCallback((patch: Partial<TicketFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_TICKET_FILTERS);
  }, []);

  const onRefresh = useCallback(async () => {
    await load(true);
  }, [load]);

  const unassignedCount = useMemo(
    () => allTickets.filter((t) => !t.assignedOfficerId).length,
    [allTickets],
  );

  return {
    tickets: filteredTickets,
    allTickets: ticketsWithSla,
    stats,
    openCount: stats.totalOpen,
    breachedCount: stats.slaBreaches,
    unassignedCount,
    filters,
    updateFilters,
    resetFilters,
    loading,
    refreshing,
    onRefresh,
    error,
    reload: load,
  };
}

/** Canonical ticket KPIs — same logic as dashboard, list, and detail surfaces */
export function useTicketStats() {
  const { stats, allTickets, loading, error, reload } = useTickets();
  const openBreachedTickets = useMemo(
    () => allTickets.filter((t) => isOpenTicketSlaBreached(t)),
    [allTickets],
  );
  return {
    stats,
    allTickets,
    openBreachedTickets,
    loading,
    error,
    reload,
  };
}

/** @deprecated Use useTicketPortalNavBadge from useTicketPortalStats */
export function useTicketPortalBadge() {
  // ponytail: lazy require avoids useTickets ↔ useTicketPortalStats circular import at module load
  const { useTicketPortalNavBadge } = require('@/hooks/useTicketPortalStats') as typeof import('@/hooks/useTicketPortalStats');
  const { attentionCount, isBreached, openCount, breachedCount, unassignedCount } =
    useTicketPortalNavBadge();
  return {
    showBadge: attentionCount > 0,
    isBreached,
    openCount,
    breachedCount,
    unassignedCount,
  };
}
