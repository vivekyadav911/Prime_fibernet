import { useEffect } from 'react';

import { getSupabase } from '@/services/supabase';
import { useAppSelector } from '@/store/hooks';
import {
  useGetActiveSubscriptionQuery,
  useGetCustomerProfileQuery,
  useGetMyRequestsQuery,
} from '@/store/api/endpoints';

export function useDashboard() {
  const user = useAppSelector((s) => s.auth.user);
  const userId = user?.id ?? '';

  const profileQuery = useGetCustomerProfileQuery(undefined, { skip: !userId });
  const subscriptionQuery = useGetActiveSubscriptionQuery(userId, { skip: !userId });
  const requestsQuery = useGetMyRequestsQuery(userId, { skip: !userId });

  useEffect(() => {
    if (!userId) return;

    const client = getSupabase();
    const channel = client
      .channel(`dashboard-subscriptions-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void subscriptionQuery.refetch();
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [userId, subscriptionQuery.refetch]);

  useEffect(() => {
    if (!userId) return;

    const client = getSupabase();
    const channel = client
      .channel(`dashboard-requests-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void requestsQuery.refetch();
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [userId, requestsQuery.refetch]);

  const subscription = subscriptionQuery.data ?? null;
  const showPaymentBanner =
    subscription?.daysUntilExpiry != null &&
    subscription.daysUntilExpiry <= 7 &&
    subscription.daysUntilExpiry >= 0;

  const recentRequests = (requestsQuery.data ?? []).slice(0, 3);
  const isLoading =
    profileQuery.isLoading || subscriptionQuery.isLoading || requestsQuery.isLoading;
  const error = profileQuery.error ?? subscriptionQuery.error ?? requestsQuery.error;

  const refetchAll = () => {
    void profileQuery.refetch();
    void subscriptionQuery.refetch();
    void requestsQuery.refetch();
  };

  return {
    user,
    profile: profileQuery.data ?? null,
    subscription,
    recentRequests,
    showPaymentBanner,
    isLoading,
    error,
    refetch: refetchAll,
  };
}
