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

  const currentPlanId = subscriptionQuery.data?.planId ?? null;

  const plans = useMemo(() => {
    const deduped = dedupePlansBySpeed(plansQuery.data ?? []);
    if (!currentPlanId) return deduped;
    const current = deduped.find((plan) => plan.id === currentPlanId);
    if (!current) return deduped;
    return [current, ...deduped.filter((plan) => plan.id !== currentPlanId)];
  }, [currentPlanId, plansQuery.data]);

  const currentPlan = useMemo(
    () => plans.find((plan) => plan.id === currentPlanId) ?? null,
    [currentPlanId, plans],
  );

  const paymentGateway = gatewayQuery.data?.display_name ?? 'Easebuzz';

  return {
    user,
    plans,
    currentPlan,
    getPriceForCycle: (plan: Plan) => getPriceForCycle(plan, 'monthly'),
    currentPlanId,
    subscription: subscriptionQuery.data ?? null,
    paymentGateway,
    isLoading: plansQuery.isLoading,
    error: plansQuery.error ?? gatewayQuery.error,
    refetch: plansQuery.refetch,
  };
}
