import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchTickets, subscribeToTickets } from '@/services/ticketsService';
import { useAppSelector } from '@/store/hooks';
import type { Ticket, TicketFilters } from '@/types/tickets';
import { applyTicketFilters } from '@/utils/ticketViewMappers';
import { computeSLAStatus, isSLABreached } from '@/utils/slaUtils';

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

function recomputeSla(tickets: Ticket[]): Ticket[] {
  return tickets.map((t) => ({
    ...t,
    slaStatus: computeSLAStatus(t),
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
      setAllTickets(recomputeSla(data));
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
      setAllTickets((prev) => recomputeSla(prev));
      setTick((t) => t + 1);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const ticketsWithSla = useMemo(() => recomputeSla(allTickets), [allTickets, tick]);

  const filteredTickets = useMemo(
    () => applyTicketFilters(ticketsWithSla, filters),
    [ticketsWithSla, filters],
  );

  const openCount = useMemo(
    () => allTickets.filter((t) => t.status === 'Open' || t.status === 'Reopened').length,
    [allTickets],
  );

  const breachedCount = useMemo(
    () => allTickets.filter((t) => isSLABreached(t)).length,
    [allTickets],
  );

  const unassignedCount = useMemo(
    () => allTickets.filter((t) => !t.assignedOfficerId).length,
    [allTickets],
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

  return {
    tickets: filteredTickets,
    allTickets: ticketsWithSla,
    openCount,
    breachedCount,
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

export function useTicketPortalBadge() {
  const { openCount, breachedCount } = useTickets();
  return {
    showBadge: openCount > 0 || breachedCount > 0,
    isBreached: breachedCount > 0,
    openCount,
    breachedCount,
  };
}
