import { useMemo } from 'react';

import { useGetOfficerDashboardStatsQuery } from '@/services/api/officersApi';
import { useGetAssignedRequestsQuery } from '@/store/api/endpoints';
import { computeOfficerDashboardStats } from '@/utils/officerDashboardStats';

/**
 * Officer dashboard KPIs derived from the same assigned-request query as Today's Assignments.
 * Collections today still comes from the payments RPC (canonical payment source).
 */
export function useOfficerDashboardStats(userId: string | undefined) {
  const {
    data: requests,
    isLoading: requestsLoading,
    isError: requestsError,
    error: requestsQueryError,
    refetch: refetchRequests,
  } = useGetAssignedRequestsQuery(userId, { skip: !userId });

  const {
    data: paymentStats,
    isLoading: paymentsLoading,
    isError: paymentsError,
    error: paymentsQueryError,
    refetch: refetchPayments,
  } = useGetOfficerDashboardStatsQuery();

  const derived = useMemo(
    () => computeOfficerDashboardStats(requests ?? []),
    [requests],
  );

  return {
    requests,
    newRequests: derived.newRequests,
    activeRequests: derived.activeRequests,
    resolvedToday: derived.resolvedToday,
    collectionsToday: paymentStats?.collectionsToday ?? 0,
    isLoading: requestsLoading || paymentsLoading,
    isError: requestsError || paymentsError,
    error: requestsQueryError ?? paymentsQueryError,
    refetch: () => {
      void refetchRequests();
      void refetchPayments();
    },
  };
}
