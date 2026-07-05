import { useMemo } from 'react';
import type { Plan } from '@prime/types';

import { useCustomerIdentity } from '@/hooks/useCustomerIdentity';
import { getPriceForCycle } from '@/services/api/customerDashboardApi';
import {
  useGetActivePaymentGatewayQuery,
  useGetActiveSubscriptionQuery,
  useGetPlansQuery,
} from '@/services/api';
import { dedupePlansBySpeed } from '@/utils/dedupePlans';

export type PlanSortKey = 'price' | 'speed' | 'popularity';

export function usePlans() {
  const { authUser: user, userId } = useCustomerIdentity();
  const plansQuery = useGetPlansQuery();
  const gatewayQuery = useGetActivePaymentGatewayQuery();
  const subscriptionQuery = useGetActiveSubscriptionQuery(userId, { skip: !userId });

  const plans = useMemo(() => dedupePlansBySpeed(plansQuery.data ?? []), [plansQuery.data]);

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
