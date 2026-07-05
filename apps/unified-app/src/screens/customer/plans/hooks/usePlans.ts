import { useEffect, useMemo } from 'react';
import type { Plan } from '@prime/types';

import { useCustomerIdentity } from '@/hooks/useCustomerIdentity';
import { getPriceForCycle } from '@/services/api/customerDashboardApi';
import {
  useGetActivePaymentGatewayQuery,
  useGetActiveSubscriptionQuery,
  useGetPlansQuery,
} from '@/services/api';
import { plansApi } from '@/services/api/plansApi';
import { getSupabase } from '@/services/supabase';
import { useAppDispatch } from '@/store/hooks';

export type PlanSortKey = 'price' | 'speed' | 'popularity';

export function usePlans() {
  const dispatch = useAppDispatch();
  const { authUser: user, userId } = useCustomerIdentity();
  const plansQuery = useGetPlansQuery();
  const { refetch: refetchPlans } = plansQuery;
  const gatewayQuery = useGetActivePaymentGatewayQuery();
  const subscriptionQuery = useGetActiveSubscriptionQuery(userId, { skip: !userId });

  useEffect(() => {
    const client = getSupabase();
    const channel = client
      .channel('customer-plans-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => {
        dispatch(plansApi.util.invalidateTags(['Plans']));
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          void refetchPlans();
        }
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [dispatch, refetchPlans]);

  const currentPlanId = subscriptionQuery.data?.planId ?? null;

  const plans = useMemo(() => {
    const sorted = plansQuery.data ?? [];
    if (!currentPlanId) return sorted;
    const current = sorted.find((plan) => plan.id === currentPlanId);
    if (!current) return sorted;
    return [current, ...sorted.filter((plan) => plan.id !== currentPlanId)];
  }, [currentPlanId, plansQuery.data]);

  const currentPlan = useMemo(
    () => plans.find((plan) => plan.id === currentPlanId) ?? null,
    [currentPlanId, plans],
  );

  const paymentGateway = gatewayQuery.data?.display_name ?? 'Easebuzz';
  const gatewaySlug = gatewayQuery.data?.slug ?? null;

  return {
    user,
    plans,
    currentPlan,
    getPriceForCycle: (plan: Plan) => getPriceForCycle(plan, 'monthly'),
    currentPlanId,
    subscription: subscriptionQuery.data ?? null,
    paymentGateway,
    gatewaySlug,
    isLoading: plansQuery.isLoading,
    error: plansQuery.error ?? gatewayQuery.error,
    refetch: plansQuery.refetch,
  };
}
