import type { RecentActivity, UpcomingRecharge } from '@/types/api/admin';

import { baseApi } from './baseApi';

export type RechargeFilter = 'all' | 'today' | 'tomorrow' | 'under_7' | 'under_14';
export type RechargeSort = 'expiry_asc' | 'expiry_desc';

function daysUntil(dateStr: string): number {
  const end = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.ceil((end - now) / 86400000);
}

export const adminDashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUpcomingRecharges: builder.query<
      UpcomingRecharge[],
      { filter?: RechargeFilter; search?: string; sort?: RechargeSort }
    >({
      query: ({ filter = 'all', search = '', sort = 'expiry_asc' }) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('subscriptions')
            .select('*, users(name, email, phone, city), plans(name, price)')
            .eq('status', 'active')
            .order('end_at', { ascending: sort === 'expiry_asc' });
          if (error) throw error;

          let rows = (data ?? []).map((row) => {
            const user = row.users as { name?: string; email?: string; phone?: string; city?: string } | null;
            const plan = row.plans as { name?: string; price?: number } | null;
            const expiry = String(row.end_at ?? '');
            return {
              id: row.id as string,
              customerName: user?.name ?? 'Customer',
              email: user?.email ?? '',
              phone: user?.phone ?? '',
              city: user?.city ?? '',
              planName: plan?.name ?? 'Plan',
              price: Number(plan?.price ?? 0),
              expiryDate: expiry,
              daysRemaining: daysUntil(expiry),
            };
          });

          if (search.trim()) {
            const q = search.toLowerCase();
            rows = rows.filter(
              (r) =>
                r.customerName.toLowerCase().includes(q) ||
                r.email.toLowerCase().includes(q) ||
                r.phone.includes(q) ||
                r.city.toLowerCase().includes(q),
            );
          }

          if (filter !== 'all') {
            rows = rows.filter((r) => {
              if (filter === 'today') return r.daysRemaining <= 0;
              if (filter === 'tomorrow') return r.daysRemaining === 1;
              if (filter === 'under_7') return r.daysRemaining <= 7;
              if (filter === 'under_14') return r.daysRemaining <= 14;
              return true;
            });
          }

          if (sort === 'expiry_desc') rows = [...rows].reverse();
          return rows;
        },
      }),
      providesTags: ['Subscriptions', 'Analytics'],
    }),

    getRecentActivities: builder.query<RecentActivity[], { page?: number; limit?: number }>({
      query: ({ page = 1, limit = 20 }) => ({
        handler: async (client) => {
          const offset = (page - 1) * limit;
          const { data, error } = await client
            .from('audit_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .range(offset, offset + limit - 1);
          if (error) throw error;

          return (data ?? []).map((row) => ({
            id: row.id as string,
            title: String(row.action ?? 'Activity'),
            description: String(row.target_entity ?? ''),
            status: String(row.status ?? 'pending'),
            timestamp: String(row.timestamp ?? new Date().toISOString()),
            icon: '📋',
          }));
        },
      }),
      providesTags: ['Audit'],
    }),

    sendBulkRechargeNotification: builder.mutation<void, { userIds: string[]; title: string; body: string }>({
      query: (body) => ({
        handler: async (client) => {
          const { error } = await client.from('notification_queue').insert({
            title: body.title,
            body: body.body,
            audience: JSON.stringify(body.userIds),
            status: 'pending',
          });
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

export const {
  useGetUpcomingRechargesQuery,
  useGetRecentActivitiesQuery,
  useSendBulkRechargeNotificationMutation,
} = adminDashboardApi;
