import { useMemo } from 'react';
import type { Plan } from '@prime/types';

import { getPriceForCycle } from '@/services/api/customerDashboardApi';
import {
  useGetActivePaymentGatewayQuery,
  useGetActiveSubscriptionQuery,
  useGetPlansQuery,
} from '@/services/api';
import { useAppSelector } from '@/store/hooks';

export type PlanSortKey = 'price' | 'speed' | 'popularity';

export function usePlans() {
  const user = useAppSelector((s) => s.auth.user);
  const plansQuery = useGetPlansQuery();
  const gatewayQuery = useGetActivePaymentGatewayQuery();
  const subscriptionQuery = useGetActiveSubscriptionQuery(user?.id ?? '', { skip: !user?.id });

  const plans = useMemo(() => {
    const list = [...(plansQuery.data ?? [])];
    list.sort((a, b) => a.speedMbps - b.speedMbps);
    return list;
  }, [plansQuery.data]);

  const currentPlanId = subscriptionQuery.data?.planId ?? null;

  const paymentGateway = gatewayQuery.data?.display_name ?? 'Easebuzz';

  return {
    user,
    plans,
    getPriceForCycle: (plan: Plan) => getPriceForCycle(plan, 'monthly'),
    currentPlanId,
    subscription: subscriptionQuery.data ?? null,
    paymentGateway,
    isLoading: plansQuery.isLoading || gatewayQuery.isLoading,
    error: plansQuery.error ?? gatewayQuery.error,
    refetch: plansQuery.refetch,
  };
}
