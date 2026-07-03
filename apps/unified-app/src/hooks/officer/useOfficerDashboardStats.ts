import { useMemo } from 'react';

import { useGetOfficerDashboardStatsQuery } from '@/services/api/officersApi';
import { useGetOfficerAssignedPortalItemsQuery } from '@/services/api/officerPortalApi';
import { computeOfficerPortalDashboardStats } from '@/utils/officerDashboardStats';

/**
 * Officer dashboard KPIs derived from the same portal-item query as Today's Assignments.
 */
export function useOfficerDashboardStats(userId: string | undefined) {
  const {
    data: items,
    isLoading: itemsLoading,
    isError: itemsError,
    error: itemsQueryError,
    refetch: refetchItems,
  } = useGetOfficerAssignedPortalItemsQuery(userId, { skip: !userId });

  const {
    data: paymentStats,
    isLoading: paymentsLoading,
    isError: paymentsError,
    error: paymentsQueryError,
    refetch: refetchPayments,
  } = useGetOfficerDashboardStatsQuery();

  const derived = useMemo(() => computeOfficerPortalDashboardStats(items ?? []), [items]);

  return {
    items,
    requests: items,
    newRequests: derived.newTickets,
    activeRequests: derived.activeTickets,
    resolvedToday: derived.resolvedToday,
    collectionsToday: paymentStats?.collectionsToday ?? 0,
    isLoading: itemsLoading || paymentsLoading,
    isError: itemsError || paymentsError,
    error: itemsQueryError ?? paymentsQueryError,
    refetch: () => {
      void refetchItems();
      void refetchPayments();
    },
  };
}
