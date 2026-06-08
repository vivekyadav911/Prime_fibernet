import type { Subscription } from '@prime/types';

import { baseApi } from './baseApi';

export const subscriptionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getActiveSubscription: builder.query<Subscription | null, string>({
      query: (userId) => ({
        handler: async (client) => {
          const now = new Date().toISOString();
          const { data, error } = await client
            .from('subscriptions')
            .select('*, plans!inner(*)')
            .eq('user_id', userId)
            .gte('end_at', now)
            .order('end_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (error) throw error;
          if (!data) return null;

          const endAt = data.end_at as string;
          const daysUntilExpiry = Math.ceil((new Date(endAt).getTime() - Date.now()) / 86400000);
          const plans = data.plans as { name?: string } | { name?: string }[] | null;
          const planName = Array.isArray(plans) ? plans[0]?.name : plans?.name;

          return {
            id: data.id as string,
            userId: data.user_id as string,
            planId: data.plan_id as string,
            planName,
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
