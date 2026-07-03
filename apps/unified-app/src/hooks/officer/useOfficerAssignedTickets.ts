import { useGetOfficerAssignedPortalItemsQuery } from '@/services/api/officerPortalApi';

/** Assigned portal tickets + orphan requests for the signed-in officer. */
export function useOfficerAssignedTickets(userId: string | undefined) {
  const query = useGetOfficerAssignedPortalItemsQuery(userId, { skip: !userId });
  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
