import type { SubscriptionStatus } from '@prime/types';

import { daysUntilSubscriptionEnd } from '@/services/customer/activeSubscription';
import { fetchActiveSubscriptionRow } from '@/services/customer/fetchActiveSubscriptionRow';
import { buildSubscriptionBillAmount, resolveCurrentOutstanding } from '@/services/customer/customerOutstanding';
import type { CustomerDashboard } from '@/types/customer';
import type { PaymentStatus } from '@/types/payments';
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

          const subRow = await fetchActiveSubscriptionRow(client, userId);

          let subscriptionPlanPrice = 0;
          let subscription: CustomerDashboard['subscription'] = null;
          if (subRow) {
            const endAt = String(subRow.end_at ?? '');
            const daysUntilExpiry = daysUntilSubscriptionEnd(endAt);
            const planJoinRaw = subRow.plans;
            const planJoin = Array.isArray(planJoinRaw)
              ? (planJoinRaw[0] as Record<string, unknown> | undefined) ?? null
              : (planJoinRaw as Record<string, unknown> | null);
            const billingCycle = (subRow.billing_cycle as 'monthly' | 'quarterly' | 'annual') ?? 'monthly';
            const mappedPlan = planJoin ? mapPlan(planJoin) : null;
            const planPrice = mappedPlan ? getPriceForCycle(mappedPlan, billingCycle) : 0;
            subscriptionPlanPrice = planPrice;
            subscription = {
              id: String(subRow.id),
              planName: String(subRow.plan_name ?? planJoin?.name ?? ''),
              speedMbps: Number(subRow.speed_mbps ?? planJoin?.speed_mbps ?? 0),
              planPrice,
              status: (subRow.status as SubscriptionStatus) ?? 'active',
              endAt,
              daysUntilExpiry,
              isExpiringSoon: daysUntilExpiry <= 7 && daysUntilExpiry >= 0,
              isOverdue: daysUntilExpiry < 0 || user.payment_status === 'overdue',
              billingCycle,
              dataLimitGb:
                planJoin?.data_limit_gb != null
                  ? Number(planJoin.data_limit_gb)
                  : mappedPlan?.dataLimitGb ?? null,
              isUnlimited:
                planJoin?.is_unlimited != null
                  ? Boolean(planJoin.is_unlimited)
                  : mappedPlan?.isUnlimited ?? true,
            };
          }

          const { data: openPayments } = await client
            .from('payments')
            .select('id, total_amount, status, billing_period_start, created_at')
            .eq('customer_id', userId)
            .in('status', ['initiated', 'pending_review', 'failed', 'cancelled']);

          const userOutstanding = Number(user.outstanding_amount ?? 0);
          const isOverdue = user.payment_status === 'overdue';
          const resolved = resolveCurrentOutstanding(
            (openPayments ?? []).map((row) => ({
              id: String(row.id),
              total_amount: Number(row.total_amount ?? 0),
              status: String(row.status) as PaymentStatus,
              billing_period_start: (row.billing_period_start as string | null) ?? null,
              created_at: String(row.created_at),
            })),
            userOutstanding,
            subscriptionPlanPrice,
          );
          const hasDue = resolved.amount > 0;
          const billParts = buildSubscriptionBillAmount(subscriptionPlanPrice, {
            isOverdue: isOverdue && hasDue,
          });
          const pendingOutstanding =
            subscriptionPlanPrice > 0 && hasDue ? billParts.outstandingAmount : resolved.amount;

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
            outstanding: pendingOutstanding,
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
      providesTags: ['CustomerDashboard', 'Subscriptions'],
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
