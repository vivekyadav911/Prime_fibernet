import { useGetCustomerProfileQuery } from '@/services/api';
import { useAppSelector } from '@/store/hooks';

const DEV_EMAIL_SUFFIX = '@prime.local';

/**
 * Canonical customer identity for all customer-portal data queries.
 * Prefer `users.id` from RPC `current_customer_user_id`, not raw auth id alone.
 */
export function useCustomerIdentity() {
  const authUser = useAppSelector((s) => s.auth.user);
  const profileQuery = useGetCustomerProfileQuery(undefined, { skip: !authUser });
  const profile = profileQuery.data;
  // Wait for profile RPC before falling back to auth id — avoids a stale dashboard fetch.
  const userId =
    profile?.id ??
    (profileQuery.isLoading || profileQuery.isFetching ? '' : authUser?.id ?? '');
  const email = profile?.email ?? authUser?.email ?? '';
  const isDevAccount = __DEV__ && email.endsWith(DEV_EMAIL_SUFFIX);

  return {
    authUser,
    profile,
    userId,
    email,
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    error: profileQuery.error,
    refetch: profileQuery.refetch,
    isDevAccount,
  };
}
