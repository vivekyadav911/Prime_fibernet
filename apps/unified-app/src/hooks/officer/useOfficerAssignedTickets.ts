import { useGetOfficerAssignedPortalItemsQuery } from '@/services/api/officerPortalApi';

const OFFICER_PORTAL_QUERY_OPTS = {
  refetchOnMountOrArgChange: 30,
  refetchOnFocus: true,
  refetchOnReconnect: true,
} as const;

/** Assigned portal tickets + orphan requests for the signed-in officer. */
export function useOfficerAssignedTickets(userId: string | undefined) {
  const query = useGetOfficerAssignedPortalItemsQuery(userId, {
    skip: !userId,
    ...OFFICER_PORTAL_QUERY_OPTS,
  });
  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
