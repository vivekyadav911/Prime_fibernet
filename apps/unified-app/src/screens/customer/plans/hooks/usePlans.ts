import { useCallback, useMemo, useState } from 'react';
import type { BillingCycle, Plan, PaymentGateway } from '@prime/types';

import { getPriceForCycle } from '@/services/api/customerDashboardApi';
import {
  useCreatePaymentOrderMutation,
  useGetActiveSubscriptionQuery,
  useGetPlansQuery,
  useGetPublicCompanySettingsQuery,
  useVerifyPaymentMutation,
} from '@/store/api/endpoints';
import { useAppSelector } from '@/store/hooks';
import {
  PLAN_FILTER_CATEGORIES,
  type PlanFilterCategory,
  planMatchesCategory,
} from '@/utils/planTier';

export type PlanSortKey = 'price' | 'speed' | 'popularity';

export function usePlans() {
  const user = useAppSelector((s) => s.auth.user);
  const plansQuery = useGetPlansQuery();
  const settingsQuery = useGetPublicCompanySettingsQuery();
  const subscriptionQuery = useGetActiveSubscriptionQuery(user?.id ?? '', { skip: !user?.id });
  const [createOrder] = useCreatePaymentOrderMutation();
  const [verifyPayment] = useVerifyPaymentMutation();

  const [category, setCategory] = useState<PlanFilterCategory>('All');
  const [sortBy, setSortBy] = useState<PlanSortKey>('price');
  const [search, setSearch] = useState('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  const filteredPlans = useMemo(() => {
    let list = [...(plansQuery.data ?? [])];

    list = list.filter((plan) => planMatchesCategory(plan.speedMbps, category));

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.features.some((f) => f.toLowerCase().includes(q)),
      );
    }

    switch (sortBy) {
      case 'speed':
        list.sort((a, b) => b.speedMbps - a.speedMbps);
        break;
      case 'popularity':
        list.sort((a, b) => b.validityDays - a.validityDays);
        break;
      case 'price':
      default:
        list.sort((a, b) => getPriceForCycle(a, billingCycle) - getPriceForCycle(b, billingCycle));
    }

    return list;
  }, [plansQuery.data, category, sortBy, search, billingCycle]);

  const currentPlanId = subscriptionQuery.data?.planId ?? null;

  const subscribeToPlan = async (plan: Plan) => {
    if (!user) throw new Error('Sign in to subscribe');
    const amount = getPriceForCycle(plan, billingCycle);
    return createOrder({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      planId: plan.id,
      planName: plan.name,
      amount,
      billingCycle,
    }).unwrap();
  };

  return {
    user,
    plans: filteredPlans,
    allCategories: PLAN_FILTER_CATEGORIES,
    category,
    setCategory,
    sortBy,
    setSortBy,
    search,
    setSearch,
    billingCycle,
    setBillingCycle,
    getPriceForCycle: (plan: Plan) => getPriceForCycle(plan, billingCycle),
    currentPlanId,
    paymentGateway: (settingsQuery.data?.payment_gateway as PaymentGateway) ?? 'razorpay',
    isLoading: plansQuery.isLoading || settingsQuery.isLoading,
    error: plansQuery.error ?? settingsQuery.error,
    refetch: plansQuery.refetch,
    subscribeToPlan,
    verifyPayment,
  };
}
