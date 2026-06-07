import type { AppRole, Plan, ServiceRequest, Payment, UserProfile } from '@prime/types';

import { getSupabase } from '@/services/supabase';

import { baseApi } from './baseApi';

function mapPlan(row: Record<string, unknown>): Plan {
  return {
    id: row.id as string,
    name: row.name as string,
    speedMbps: row.speed_mbps as number,
    price: Number(row.price),
    validityDays: row.validity_days as number,
    features: (row.features as string[]) ?? [],
    isActive: row.is_active as boolean,
  };
}

export const plansApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlans: builder.query<Plan[], void>({
      queryFn: async () => {
        const { data, error } = await getSupabase()
          .from('plans')
          .select('*')
          .eq('is_active', true);
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: (data ?? []).map(mapPlan) };
      },
      providesTags: ['Plans'],
    }),
    createPlan: builder.mutation<void, Partial<Plan>>({
      queryFn: async (plan) => {
        const { error } = await getSupabase().from('plans').insert({
          name: plan.name,
          speed_mbps: plan.speedMbps,
          price: plan.price,
          validity_days: plan.validityDays,
          features: plan.features,
          is_active: plan.isActive ?? true,
        });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: undefined };
      },
      invalidatesTags: ['Plans'],
    }),
  }),
});

export const paymentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPaymentHistory: builder.query<Payment[], string>({
      queryFn: async (userId) => {
        const { data, error } = await getSupabase()
          .from('user_payments')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            userId: row.user_id,
            amount: Number(row.amount),
            paymentStatus: row.payment_status,
            transactionId: row.transaction_id,
            createdAt: row.created_at,
          })),
        };
      },
      providesTags: ['Payments'],
    }),
    createPaymentOrder: builder.mutation<{ orderId: string }, { planId: string; amount: number }>({
      queryFn: async (body) => {
        const { data, error } = await getSupabase().functions.invoke('payment-webhook', {
          body,
        });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: data as { orderId: string } };
      },
    }),
  }),
});

export const requestsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyRequests: builder.query<ServiceRequest[], string>({
      queryFn: async (userId) => {
        const { data, error } = await getSupabase()
          .from('service_requests')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            userId: row.user_id,
            officerId: row.officer_id,
            requestType: row.request_type,
            status: row.status,
            priority: row.priority,
            address: row.address,
            description: row.description,
            createdAt: row.created_at,
          })),
        };
      },
      providesTags: ['Requests'],
    }),
    getAssignedRequests: builder.query<ServiceRequest[], string>({
      queryFn: async (officerId) => {
        const { data, error } = await getSupabase()
          .from('service_requests')
          .select('*')
          .eq('officer_id', officerId)
          .order('priority', { ascending: true });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            userId: row.user_id,
            officerId: row.officer_id,
            requestType: row.request_type,
            status: row.status,
            priority: row.priority,
            address: row.address,
            description: row.description,
            createdAt: row.created_at,
          })),
        };
      },
      providesTags: ['Requests'],
    }),
    createRequest: builder.mutation<void, { userId: string; requestType: string; address: string; description?: string }>({
      queryFn: async (body) => {
        const { error } = await getSupabase().from('service_requests').insert({
          user_id: body.userId,
          request_type: body.requestType,
          address: body.address,
          description: body.description,
          status: 'pending',
          priority: 'P2',
        });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: undefined };
      },
      invalidatesTags: ['Requests'],
    }),
    updateRequestStatus: builder.mutation<void, { id: string; status: string }>({
      queryFn: async ({ id, status }) => {
        const { error } = await getSupabase().from('service_requests').update({ status }).eq('id', id);
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: undefined };
      },
      invalidatesTags: ['Requests'],
    }),
  }),
});

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllUsers: builder.query<UserProfile[], void>({
      queryFn: async () => {
        const { data, error } = await getSupabase().from('users').select('*').limit(100);
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            email: row.email,
            name: row.name,
            phone: row.phone,
            role: row.role as AppRole,
            isBlocked: row.is_blocked,
          })),
        };
      },
      providesTags: ['Users'],
    }),
    blockUser: builder.mutation<void, { userId: string; reason: string }>({
      queryFn: async ({ userId }) => {
        const { error } = await getSupabase().from('users').update({ is_blocked: true }).eq('id', userId);
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: undefined };
      },
      invalidatesTags: ['Users'],
    }),
  }),
});

export const officersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    clockIn: builder.mutation<void, { officerId: string; latitude: number; longitude: number }>({
      queryFn: async ({ officerId, latitude, longitude }) => {
        const { error } = await getSupabase().from('shifts').insert({
          officer_id: officerId,
          shift_date: new Date().toISOString().slice(0, 10),
          check_in_time: new Date().toISOString(),
          status: 'active',
          location: `POINT(${longitude} ${latitude})`,
        });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: undefined };
      },
    }),
    clockOut: builder.mutation<void, { shiftId: string }>({
      queryFn: async ({ shiftId }) => {
        const { error } = await getSupabase()
          .from('shifts')
          .update({ check_out_time: new Date().toISOString(), status: 'completed' })
          .eq('id', shiftId);
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: undefined };
      },
    }),
  }),
});

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardKpis: builder.query<
      { activeSubscribers: number; mrr: number; openRequests: number; officersOnline: number },
      void
    >({
      queryFn: async () => {
        // Placeholder until DB views exist
        return {
          data: {
            activeSubscribers: 0,
            mrr: 0,
            openRequests: 0,
            officersOnline: 0,
          },
        };
      },
      providesTags: ['Analytics'],
    }),
  }),
});

export const chatbotApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendChatMessage: builder.mutation<{ reply: string }, { message: string; userId: string }>({
      queryFn: async (body) => {
        const { data, error } = await getSupabase().functions.invoke('chatbot-service', { body });
        if (error) return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        return { data: data as { reply: string } };
      },
    }),
  }),
});

export const { useGetPlansQuery, useCreatePlanMutation } = plansApi;
export const { useGetPaymentHistoryQuery, useCreatePaymentOrderMutation } = paymentsApi;
export const {
  useGetMyRequestsQuery,
  useGetAssignedRequestsQuery,
  useCreateRequestMutation,
  useUpdateRequestStatusMutation,
} = requestsApi;
export const { useGetAllUsersQuery, useBlockUserMutation } = usersApi;
export const { useClockInMutation, useClockOutMutation } = officersApi;
export const { useGetDashboardKpisQuery } = analyticsApi;
export const { useSendChatMessageMutation } = chatbotApi;
