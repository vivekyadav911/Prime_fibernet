import type { BillingCycle } from '@prime/types';

import type { PlanChangeRequest } from '@/types/customer';
import { formatSupabaseError } from '@/utils/supabaseError';

import { baseApi } from './baseApi';
import type { TypedSupabaseClient } from './supabase';

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

async function resolveCustomerId(client: TypedSupabaseClient): Promise<string> {
  const { data: customerId, error } = await client.rpc('current_customer_user_id');
  if (error) throw new Error(formatSupabaseError(error, 'Could not resolve customer profile'));
  if (!customerId) throw new Error('Customer profile not found for this account');
  return String(customerId);
}

export const customerPlansApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyPlanChangeRequests: builder.query<PlanChangeRequest[], void>({
      query: () => ({
        handler: async (client) => {
          const customerId = await resolveCustomerId(client);

          const { data, error } = await client
            .from('plan_change_requests')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });
          if (error) throw new Error(formatSupabaseError(error, 'Could not load plan change requests'));
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

          const customerId = await resolveCustomerId(client);

          const { data: userRow, error: userErr } = await client
            .from('users')
            .select('id, name')
            .eq('id', customerId)
            .maybeSingle();
          if (userErr) throw new Error(formatSupabaseError(userErr, 'Could not load customer profile'));
          if (!userRow?.id) throw new Error('Customer profile not found');

          const { data: requestedPlan, error: planErr } = await client
            .from('plans')
            .select('id, name')
            .eq('id', input.requestedPlanId)
            .eq('is_active', true)
            .maybeSingle();
          if (planErr) throw new Error(formatSupabaseError(planErr, 'Could not verify plan'));
          if (!requestedPlan) {
            throw new Error('Selected plan is not available. Choose another plan from the list.');
          }

          if (input.currentPlanId) {
            const { data: currentPlan, error: currentErr } = await client
              .from('plans')
              .select('id')
              .eq('id', input.currentPlanId)
              .maybeSingle();
            if (currentErr) throw new Error(formatSupabaseError(currentErr, 'Could not verify current plan'));
            if (!currentPlan) {
              throw new Error('Current plan record is invalid. Try again from the Plans screen.');
            }
          }

          const { data, error } = await client
            .from('plan_change_requests')
            .insert({
              customer_id: customerId,
              current_plan_id: input.currentPlanId,
              requested_plan_id: input.requestedPlanId,
              requested_cycle: input.requestedCycle,
              reason: input.reason ?? null,
              status: 'pending',
            })
            .select('*')
            .single();
          if (error) {
            throw new Error(formatSupabaseError(error, 'Could not submit plan change request'));
          }

          const { error: _notifyErr } = await client.rpc('notify_collection_admins', {
            p_type: 'plan_change',
            p_title: 'Plan change request',
            p_body: `${userRow.name} requested a plan change to ${requestedPlan.name ?? 'a new plan'}`,
            p_data: { customer_id: customerId, reference_id: data.id },
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
