import type { Plan } from '@prime/types';

import { baseApi } from './baseApi';
import { mapPlan } from './mappers';

export const plansApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlans: builder.query<Plan[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('plans')
            .select('*')
            .eq('is_active', true)
            .order('speed_mbps', { ascending: true });
          if (error) throw error;
          return (data ?? []).map((row) => mapPlan(row as Record<string, unknown>));
        },
      }),
      providesTags: ['Plans'],
      keepUnusedDataFor: 60,
    }),

    getPlanById: builder.query<Plan, string>({
      query: (planId) => ({
        handler: async (client) => {
          const { data, error } = await client.from('plans').select('*').eq('id', planId).maybeSingle();
          if (error) throw error;
          if (!data) throw new Error('Plan not found');
          return mapPlan(data as Record<string, unknown>);
        },
      }),
      providesTags: (_result, _error, planId) => [{ type: 'Plans', id: planId }],
    }),

    getAllPlans: builder.query<Plan[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.from('plans').select('*').order('price', { ascending: true });
          if (error) throw error;
          return (data ?? []).map((row) => mapPlan(row as Record<string, unknown>));
        },
      }),
      providesTags: ['Plans'],
    }),

    createPlan: builder.mutation<void, Partial<Plan>>({
      query: (plan) => ({
        handler: async (client) => {
          const { error } = await client.from('plans').insert({
            name: plan.name,
            speed_mbps: plan.speedMbps,
            price: plan.price,
            validity_days: plan.validityDays,
            features: plan.features,
            is_active: plan.isActive ?? true,
          });
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Plans'],
    }),

    updatePlan: builder.mutation<void, { id: string } & Partial<Plan>>({
      query: ({ id, ...plan }) => ({
        handler: async (client) => {
          const { error } = await client
            .from('plans')
            .update({
              name: plan.name,
              speed_mbps: plan.speedMbps,
              price: plan.price,
              validity_days: plan.validityDays,
              features: plan.features,
              is_active: plan.isActive,
            })
            .eq('id', id);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Plans'],
    }),

    deletePlan: builder.mutation<void, string>({
      query: (id) => ({
        handler: async (client) => {
          const { error } = await client.from('plans').update({ is_active: false }).eq('id', id);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Plans'],
    }),
  }),
});

export const {
  useGetPlansQuery,
  useGetPlanByIdQuery,
  useGetAllPlansQuery,
  useCreatePlanMutation,
  useUpdatePlanMutation,
  useDeletePlanMutation,
} = plansApi;
