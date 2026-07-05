import type { Subscription } from '@prime/types';

import { daysUntilSubscriptionEnd } from '@/services/customer/activeSubscription';
import { fetchActiveSubscriptionRow } from '@/services/customer/fetchActiveSubscriptionRow';

import { baseApi } from './baseApi';

export const subscriptionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getActiveSubscription: builder.query<Subscription | null, string>({
      query: (userId) => ({
        handler: async (client) => {
          const data = await fetchActiveSubscriptionRow(client, userId);
          if (!data) return null;

          const endAt = data.end_at as string;
          const daysUntilExpiry = daysUntilSubscriptionEnd(endAt);
          const plans = data.plans as { name?: string } | { name?: string }[] | null;
          const planName = Array.isArray(plans) ? plans[0]?.name : plans?.name;

          return {
            id: data.id as string,
            userId: data.user_id as string,
            planId: data.plan_id as string,
            planName: planName ?? (data.plan_name as string | undefined),
            startAt: data.start_at as string,
            endAt,
            status: (data.status as Subscription['status']) ?? 'active',
            daysUntilExpiry,
          };
        },
      }),
      providesTags: ['Subscriptions'],
    }),
  }),
});

export const { useGetActiveSubscriptionQuery } = subscriptionsApi;
