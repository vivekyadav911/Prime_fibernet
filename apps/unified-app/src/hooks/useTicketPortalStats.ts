import { useMemo } from 'react';

import { useAdminRequests } from '@/hooks/useAdminRequests';
import { useTickets } from '@/hooks/useTickets';
import { useGetSupportDashboardStatsQuery } from '@/services/api/adminSupportApi';
import type { TicketPortalStats } from '@/types/portalTicket';
import { buildPortalItems, computePortalStats } from '@/utils/portalTicketMappers';
import { isOpenTicketSlaBreached } from '@/utils/slaUtils';

/**
 * Canonical Ticket Portal KPIs — every stat row, summary card, and badge must use this hook.
 */
export function useTicketPortalStats(): {
  stats: TicketPortalStats;
  openBreachedItems: ReturnType<typeof buildPortalItems>;
  allItems: ReturnType<typeof buildPortalItems>;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
} {
  const {
    allTickets,
    loading: ticketsLoading,
    error: ticketsError,
    reload: reloadTickets,
  } = useTickets();
  const {
    allRequests,
    loading: requestsLoading,
    error: requestsError,
    refresh: refreshRequests,
  } = useAdminRequests();
  const { data: supportStats, isLoading: supportStatsLoading } = useGetSupportDashboardStatsQuery();

  const allItems = useMemo(
    () => buildPortalItems(allTickets, allRequests),
    [allTickets, allRequests],
  );

  const stats = useMemo(
    () =>
      computePortalStats(
        allItems,
        supportStats?.ticketsToday ?? 0,
        supportStats?.avgCsatScore ?? null,
      ),
    [allItems, supportStats?.avgCsatScore, supportStats?.ticketsToday],
  );

  const openBreachedItems = useMemo(
    () =>
      allItems.filter((item) => {
        if (item.ticket) return isOpenTicketSlaBreached(item.ticket);
        return item.slaBreached;
      }),
    [allItems],
  );

  const loading = ticketsLoading || requestsLoading || supportStatsLoading;
  const error = ticketsError ?? requestsError;

  const reload = async () => {
    await Promise.all([reloadTickets(true), refreshRequests()]);
  };

  return {
    stats,
    openBreachedItems,
    allItems,
    loading,
    error,
    reload,
  };
}

/** Sidebar badge: unassigned + SLA-breached items needing attention. */
export function useTicketPortalNavBadge() {
  const { stats } = useTicketPortalStats();
  const attentionCount = stats.unassigned + stats.slaBreaches;
  return {
    showBadge: attentionCount > 0,
    attentionCount,
    isBreached: stats.slaBreaches > 0,
    openCount: stats.totalOpen,
    breachedCount: stats.slaBreaches,
    unassignedCount: stats.unassigned,
  };
}
