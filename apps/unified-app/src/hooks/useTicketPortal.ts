import { useCallback, useMemo, useState } from 'react';

import { useAdminRequests } from '@/hooks/useAdminRequests';
import { useTickets } from '@/hooks/useTickets';
import { useAppSelector } from '@/store/hooks';
import type { PortalTicketFilters, PortalViewMode } from '@/types/portalTicket';
import type { Officer } from '@/types/requests';
import { applyPortalFilters, buildPortalItems } from '@/utils/portalTicketMappers';

export const DEFAULT_PORTAL_FILTERS: PortalTicketFilters = {
  status: 'All',
  source: 'All',
  assignment: 'all',
  sortBy: 'newest',
  searchQuery: '',
  slaBreached: null,
};

export function useTicketPortal() {
  const adminName = useAppSelector((s) => s.auth.user?.name ?? 'Admin');
  const {
    allTickets,
    loading: ticketsLoading,
    error: ticketsError,
    reload: reloadTickets,
    refreshing,
    onRefresh,
  } = useTickets();
  const {
    allRequests,
    loading: requestsLoading,
    error: requestsError,
    refresh: refreshRequests,
    assignOfficer: assignRequestOfficer,
    addNote,
  } = useAdminRequests();

  const [filters, setFilters] = useState<PortalTicketFilters>(DEFAULT_PORTAL_FILTERS);
  const [viewMode, setViewMode] = useState<PortalViewMode>('assignment');

  const allItems = useMemo(
    () => buildPortalItems(allTickets, allRequests),
    [allTickets, allRequests],
  );

  const filteredItems = useMemo(
    () => applyPortalFilters(allItems, filters),
    [allItems, filters],
  );

  const unassignedItems = useMemo(
    () => filteredItems.filter((item) => !item.assignedOfficerId),
    [filteredItems],
  );

  const assignedItems = useMemo(
    () => filteredItems.filter((item) => Boolean(item.assignedOfficerId)),
    [filteredItems],
  );

  const updateFilters = useCallback((patch: Partial<PortalTicketFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_PORTAL_FILTERS);
  }, []);

  const reload = useCallback(async () => {
    await Promise.all([reloadTickets(true), refreshRequests()]);
  }, [reloadTickets, refreshRequests]);

  const assignOfficer = useCallback(
    async (itemId: string, officer: Officer, isReassign = false) => {
      const item = allItems.find((i) => i.id === itemId);
      if (!item) return;

      if (item.kind === 'request' && item.requestId) {
        await assignRequestOfficer(item.requestId, officer, isReassign);
        return;
      }

      if (item.kind === 'ticket' && item.ticketId) {
        const { assignOfficer: assignTicketOfficer, reassignOfficer } = await import(
          '@/services/ticketsService'
        );
        if (isReassign) {
          await reassignOfficer(item.ticketId, officer, adminName);
        } else {
          await assignTicketOfficer(item.ticketId, officer, adminName);
        }
        await reloadTickets(true);
      }
    },
    [adminName, allItems, assignRequestOfficer, reloadTickets],
  );

  return {
    allItems,
    filteredItems,
    unassignedItems,
    assignedItems,
    filters,
    viewMode,
    setViewMode,
    updateFilters,
    resetFilters,
    assignOfficer,
    addNote,
    loading: (ticketsLoading || requestsLoading) && !allItems.length,
    refreshing,
    onRefresh: async () => {
      await onRefresh();
      await refreshRequests();
    },
    error: ticketsError ?? requestsError,
    reload,
  };
}
