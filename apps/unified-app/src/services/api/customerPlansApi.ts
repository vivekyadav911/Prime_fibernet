import type { BillingCycle } from '@prime/types';

import type { PlanChangeRequest } from '@/types/customer';
import { baseApi } from './baseApi';

function mapPlanChangeRequest(row: Record<string, unknown>): PlanChangeRequest {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    currentPlanId: (row.current_plan_id as string) ?? null,
    requestedPlanId: (row.requested_plan_id as string) ?? null,
    requestedCycle: row.requested_cycle as BillingCycle,
    reason: (row.reason as string) ?? null,
    status: row.status as PlanChangeRequest['status'],
    adminNotes: (row.admin_notes as string) ?? null,
    reviewedAt: (row.reviewed_at as string) ?? null,
    effectiveDate: (row.effective_date as string) ?? null,
    createdAt: String(row.created_at),
  };
}

export type SubmitPlanChangeInput = {
  currentPlanId: string | null;
  requestedPlanId: string;
  requestedCycle: BillingCycle;
  reason?: string;
};

export const customerPlansApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyPlanChangeRequests: builder.query<PlanChangeRequest[], void>({
      query: () => ({
        handler: async (client) => {
          const { data: auth } = await client.auth.getUser();
          if (!auth.user) return [];

          const { data: userRow } = await client
            .from('users')
            .select('id')
            .or(`auth_user_id.eq.${auth.user.id},id.eq.${auth.user.id}`)
            .eq('role', 'customer')
            .maybeSingle();

          if (!userRow?.id) return [];

          const { data, error } = await client
            .from('plan_change_requests')
            .select('*')
            .eq('customer_id', userRow.id)
            .order('created_at', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => mapPlanChangeRequest(row as Record<string, unknown>));
        },
      }),
      providesTags: ['PlanChangeRequests'],
    }),

    submitPlanChangeRequest: builder.mutation<PlanChangeRequest, SubmitPlanChangeInput>({
      query: (input) => ({
        handler: async (client) => {
          const { data: auth } = await client.auth.getUser();
          if (!auth.user) throw new Error('Sign in required');

          const { data: userRow, error: userErr } = await client
            .from('users')
            .select('id, name')
            .or(`auth_user_id.eq.${auth.user.id},id.eq.${auth.user.id}`)
            .eq('role', 'customer')
            .maybeSingle();
          if (userErr) throw userErr;
          if (!userRow?.id) throw new Error('Customer profile not found');

          const { data, error } = await client
            .from('plan_change_requests')
            .insert({
              customer_id: userRow.id,
              current_plan_id: input.currentPlanId,
              requested_plan_id: input.requestedPlanId,
              requested_cycle: input.requestedCycle,
              reason: input.reason ?? null,
              status: 'pending',
            })
            .select('*')
            .single();
          if (error) throw error;

          await client.rpc('notify_collection_admins', {
            p_type: 'plan_change',
            p_title: 'Plan change request',
            p_body: `${userRow.name} requested a plan change`,
            p_data: { customer_id: userRow.id, reference_id: data.id },
          });

          return mapPlanChangeRequest(data as Record<string, unknown>);
        },
      }),
      invalidatesTags: ['PlanChangeRequests', 'PortalNotifications'],
    }),
  }),
});

export const {
  useGetMyPlanChangeRequestsQuery,
  useSubmitPlanChangeRequestMutation,
} = customerPlansApi;
