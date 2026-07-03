import type { PlanChangeRequest } from '@/types/customer';
import { formatSupabaseError } from '@/utils/supabaseError';

import { baseApi } from './baseApi';

export type AdminPlanChangeRequest = PlanChangeRequest & {
  customerName: string;
  customerAccountId: string | null;
  currentPlanName: string | null;
  requestedPlanName: string | null;
};

function mapRow(row: Record<string, unknown>): AdminPlanChangeRequest {
  const customer = row.customer as Record<string, unknown> | null;
  const currentPlan = row.current_plan as Record<string, unknown> | null;
  const requestedPlan = row.requested_plan as Record<string, unknown> | null;

  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    currentPlanId: (row.current_plan_id as string) ?? null,
    requestedPlanId: (row.requested_plan_id as string) ?? null,
    requestedCycle: row.requested_cycle as PlanChangeRequest['requestedCycle'],
    reason: (row.reason as string) ?? null,
    status: row.status as PlanChangeRequest['status'],
    adminNotes: (row.admin_notes as string) ?? null,
    reviewedAt: (row.reviewed_at as string) ?? null,
    effectiveDate: (row.effective_date as string) ?? null,
    createdAt: String(row.created_at),
    customerName: String(customer?.name ?? 'Customer'),
    customerAccountId: (customer?.customer_id as string) ?? null,
    currentPlanName: (currentPlan?.name as string) ?? null,
    requestedPlanName: (requestedPlan?.name as string) ?? null,
  };
}

export const adminPlanChangesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listPlanChangeRequests: builder.query<AdminPlanChangeRequest[], { status?: string } | void>({
      query: (params) => ({
        handler: async (client) => {
          let query = client
            .from('plan_change_requests')
            .select(
              `
              *,
              customer:users!plan_change_requests_customer_id_fkey(id, name, customer_id),
              current_plan:plans!plan_change_requests_current_plan_id_fkey(id, name),
              requested_plan:plans!plan_change_requests_requested_plan_id_fkey(id, name)
            `,
            )
            .order('created_at', { ascending: false });

          if (params?.status && params.status !== 'all') {
            query = query.eq('status', params.status);
          }

          const { data, error } = await query;
          if (error) throw new Error(formatSupabaseError(error));
          return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
        },
      }),
      providesTags: ['PlanChangeRequests'],
    }),

    reviewPlanChangeRequest: builder.mutation<
      void,
      { id: string; action: 'approve' | 'reject'; adminNotes?: string }
    >({
      query: ({ id, action, adminNotes }) => ({
        handler: async (client) => {
          const status = action === 'approve' ? 'approved' : 'rejected';
          const { data: request, error } = await client
            .from('plan_change_requests')
            .update({
              status,
              admin_notes: adminNotes?.trim() || null,
              reviewed_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select(
              `
              *,
              customer:users!plan_change_requests_customer_id_fkey(id, name, auth_user_id)
            `,
            )
            .single();
          if (error) throw new Error(formatSupabaseError(error));

          const customer = request.customer as Record<string, unknown> | null;
          const authUserId = customer?.auth_user_id as string | undefined;

          if (action === 'approve' && request.requested_plan_id) {
            const { data: plan } = await client
              .from('plans')
              .select('name, speed_mbps')
              .eq('id', request.requested_plan_id)
              .maybeSingle();

            await client
              .from('subscriptions')
              .update({
                plan_id: request.requested_plan_id,
                plan_name: plan?.name ?? null,
                speed_mbps: plan?.speed_mbps ?? null,
                billing_cycle: request.requested_cycle,
              })
              .eq('user_id', request.customer_id)
              .eq('status', 'active');
          }

          if (authUserId) {
            await client.from('portal_notifications').insert({
              recipient_auth_id: authUserId,
              type: 'plan_change_update',
              category: 'plan',
              title: action === 'approve' ? 'Plan change approved' : 'Plan change declined',
              body:
                action === 'approve'
                  ? 'Your plan change request has been approved. Updates may take a few minutes to reflect.'
                  : adminNotes?.trim() || 'Your plan change request was declined. Contact support for details.',
              action_url: '/customer/plans',
              data: { plan_change_request_id: id, status },
            });
          }
        },
      }),
      invalidatesTags: ['PlanChangeRequests', 'Subscriptions', 'PortalNotifications', 'CustomerDashboard'],
    }),
  }),
});

export const {
  useListPlanChangeRequestsQuery,
  useReviewPlanChangeRequestMutation,
} = adminPlanChangesApi;
