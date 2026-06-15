import { useGetOfficerDashboardStatsQuery } from '@/services/api/officersApi';

export function useRequestCounts() {
  const { data, ...rest } = useGetOfficerDashboardStatsQuery();
  return {
    ...rest,
    newRequests: data?.newRequests ?? 0,
    activeRequests: data?.activeRequests ?? 0,
    resolvedToday: data?.resolvedToday ?? 0,
    collectionsToday: data?.collectionsToday ?? 0,
  };
}
