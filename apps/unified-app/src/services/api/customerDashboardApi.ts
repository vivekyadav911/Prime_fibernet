import type { SubscriptionStatus } from '@prime/types';

import type { CustomerDashboard } from '@/types/customer';
import { baseApi } from './baseApi';
import { mapPlan } from './mappers';

export const customerDashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomerDashboard: builder.query<CustomerDashboard, string>({
      query: (userId) => ({
        handler: async (client) => {
          const { data: user, error: userErr } = await client
            .from('users')
            .select(
              'id, name, email, phone, customer_id, outstanding_amount, payment_status, next_due_date',
            )
            .eq('id', userId)
            .maybeSingle();
          if (userErr) throw userErr;
          if (!user) throw new Error('Customer not found');

          const { data: subRow } = await client
            .from('subscriptions')
            .select('*, plans(speed_mbps, data_limit_gb, is_unlimited, price, price_quarterly, price_annual)')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('end_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          let subscription: CustomerDashboard['subscription'] = null;
          if (subRow) {
            const endAt = String(subRow.end_at ?? '');
            const endMs = new Date(endAt).getTime();
            const daysUntilExpiry = Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24));
            const planJoin = subRow.plans as Record<string, unknown> | null;
            const billingCycle = (subRow.billing_cycle as 'monthly' | 'quarterly' | 'annual') ?? 'monthly';
            const mappedPlan = planJoin ? mapPlan(planJoin) : null;
            const planPrice = mappedPlan ? getPriceForCycle(mappedPlan, billingCycle) : 0;
            subscription = {
              id: String(subRow.id),
              planName: String(subRow.plan_name ?? ''),
              speedMbps: Number(subRow.speed_mbps ?? planJoin?.speed_mbps ?? 0),
              planPrice,
              status: (subRow.status as SubscriptionStatus) ?? 'active',
              endAt,
              daysUntilExpiry,
              isExpiringSoon: daysUntilExpiry <= 7 && daysUntilExpiry >= 0,
              isOverdue: daysUntilExpiry < 0 || user.payment_status === 'overdue',
              billingCycle,
              dataLimitGb:
                planJoin?.data_limit_gb != null ? Number(planJoin.data_limit_gb) : null,
              isUnlimited: Boolean(planJoin?.is_unlimited),
            };
          }

          const nextDueDate =
            (user.next_due_date as string | null) ?? subscription?.endAt ?? null;

          const { data: payments } = await client
            .from('payments')
            .select('id, total_amount, status, created_at')
            .eq('customer_id', userId)
            .order('created_at', { ascending: false })
            .limit(3);

          const { count: openTickets } = await client
            .from('tickets')
            .select('id', { count: 'exact', head: true })
            .eq('customer_id', userId)
            .not('status', 'in', '("Resolved","Closed")');

          const { data: auth } = await client.auth.getUser();
          let unreadNotifications = 0;
          if (auth.user) {
            const { count } = await client
              .from('portal_notifications')
              .select('id', { count: 'exact', head: true })
              .eq('recipient_auth_id', auth.user.id)
              .eq('is_read', false);
            unreadNotifications = count ?? 0;
          }

          return {
            profile: {
              id: String(user.id),
              name: String(user.name),
              email: String(user.email),
              phone: (user.phone as string) ?? null,
              customerId: (user.customer_id as string) ?? null,
            },
            subscription,
            outstanding: Number(user.outstanding_amount ?? 0),
            nextDueDate,
            recentPayments: (payments ?? []).map((p) => ({
              id: String(p.id),
              amount: Number(p.total_amount),
              status: String(p.status),
              createdAt: String(p.created_at),
            })),
            openTickets: openTickets ?? 0,
            unreadNotifications,
          };
        },
      }),
      providesTags: ['CustomerDashboard'],
    }),
  }),
});

export const { useGetCustomerDashboardQuery } = customerDashboardApi;

/** Price for billing cycle from plan row */
export function getPriceForCycle(
  plan: ReturnType<typeof mapPlan>,
  cycle: 'monthly' | 'quarterly' | 'annual',
): number {
  if (cycle === 'quarterly' && plan.priceQuarterly != null) return plan.priceQuarterly;
  if (cycle === 'annual' && plan.priceAnnual != null) return plan.priceAnnual;
  if (cycle === 'quarterly') return Math.round(plan.price * 2.85);
  if (cycle === 'annual') return Math.round(plan.price * 10);
  return plan.price;
}
