import type { AuditLog } from '@prime/types';

import { baseApi } from './baseApi';

export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly';

function periodStart(period: AnalyticsPeriod): Date {
  const now = new Date();
  switch (period) {
    case 'daily':
      return new Date(now.getTime() - 7 * 86400000);
    case 'weekly':
      return new Date(now.getTime() - 30 * 86400000);
    case 'monthly':
      return new Date(now.getTime() - 90 * 86400000);
    default:
      return new Date(now.getTime() - 30 * 86400000);
  }
}

export type DashboardKpis = {
  activeSubscribers: number;
  mrr: number;
  openRequests: number;
  officersOnline: number;
};

export type AnalyticsReport = {
  totalRevenue: number;
  avgResolutionHours: number;
  attendanceRate: number;
};

export type AnalyticsData = {
  period: AnalyticsPeriod;
  generatedAt: string;
  summary: Record<string, unknown>;
  revenueSeries: Record<string, unknown>[];
  requestSeries: Record<string, unknown>[];
  userSeries: Record<string, unknown>[];
  planStats: Record<string, unknown>;
  cityDistribution: Record<string, number>;
  topCities: Record<string, unknown>[];
  requestStatusCounts: Record<string, number>;
  requestTypeCounts: Record<string, number>;
  officerStats: Record<string, unknown>;
};

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardKpis: builder.query<DashboardKpis, void>({
      query: () => ({
        handler: async (client) => {
          const [subs, payments, requests, activeShifts] = await Promise.all([
            client.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
            client.from('payments').select('total_amount').eq('status', 'confirmed'),
            client
              .from('service_requests')
              .select('id', { count: 'exact', head: true })
              .neq('status', 'resolved'),
            client
              .from('shifts')
              .select('id', { count: 'exact', head: true })
              .eq('shift_date', new Date().toISOString().slice(0, 10))
              .eq('status', 'active'),
          ]);
          const mrr = (payments.data ?? []).reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
          return {
            activeSubscribers: subs.count ?? 0,
            mrr,
            openRequests: requests.count ?? 0,
            officersOnline: activeShifts.count ?? 0,
          };
        },
      }),
      providesTags: ['Analytics'],
    }),

    getAnalyticsReport: builder.query<AnalyticsReport, void>({
      query: () => ({
        handler: async (client) => {
          const [payments, shifts] = await Promise.all([
            client.from('user_payments').select('amount').eq('payment_status', 'success'),
            client.from('shifts').select('status').limit(200),
          ]);
          const totalRevenue = (payments.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
          const completedShifts = (shifts.data ?? []).filter((s) => s.status === 'completed').length;
          const attendanceRate = shifts.data?.length ? (completedShifts / shifts.data.length) * 100 : 0;
          return {
            totalRevenue,
            avgResolutionHours: 24,
            attendanceRate: Math.round(attendanceRate),
          };
        },
      }),
      providesTags: ['Analytics'],
    }),

    getAnalytics: builder.query<AnalyticsData, AnalyticsPeriod>({
      query: (period) => ({
        handler: async (client) => {
          const startDate = periodStart(period);
          const endDate = new Date();
          const startIso = startDate.toISOString();
          const endIso = endDate.toISOString();

          const [
            revenueData,
            userData,
            requestData,
            planData,
            revenueSeries,
            userSeries,
            requestSeries,
            officerData,
          ] = await Promise.all([
            client.rpc('get_revenue_analytics', { start_date: startIso, end_date: endIso }),
            client.rpc('get_user_analytics', { start_date: startIso, end_date: endIso }),
            client.rpc('get_service_request_analytics', { start_date: startIso, end_date: endIso }),
            client.rpc('get_plan_analytics', { start_date: startIso, end_date: endIso }),
            client.rpc('get_analytics_time_series', {
              start_date: startIso,
              end_date: endIso,
              metric: 'revenue',
              interval_type: period === 'daily' ? 'day' : 'week',
            }),
            client.rpc('get_analytics_time_series', {
              start_date: startIso,
              end_date: endIso,
              metric: 'users',
              interval_type: period === 'daily' ? 'day' : 'week',
            }),
            client.rpc('get_analytics_time_series', {
              start_date: startIso,
              end_date: endIso,
              metric: 'requests',
              interval_type: period === 'daily' ? 'day' : 'week',
            }),
            client.rpc('get_officer_performance_analytics', { start_date: startIso, end_date: endIso }),
          ]);

          const revenue = (revenueData.data ?? {}) as Record<string, unknown>;
          const users = (userData.data ?? {}) as Record<string, unknown>;
          const requests = (requestData.data ?? {}) as Record<string, unknown>;
          const plans = (planData.data ?? {}) as Record<string, unknown>;
          const officers = (officerData.data ?? {}) as Record<string, unknown>;
          const cities = (users.cities as Record<string, number>) ?? {};

          return {
            period,
            generatedAt: new Date().toISOString(),
            summary: {
              revenue,
              users,
              requests,
              activeSubscriptions: revenue.subscriptions ?? 0,
              activeUsers: users.activeUsers ?? 0,
            },
            revenueSeries: (revenueSeries.data ?? []) as Record<string, unknown>[],
            requestSeries: (requestSeries.data ?? []) as Record<string, unknown>[],
            userSeries: (userSeries.data ?? []) as Record<string, unknown>[],
            planStats: (plans.planStats as Record<string, unknown>) ?? {},
            cityDistribution: cities,
            topCities: Object.entries(cities)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([city, count]) => ({ city, count })),
            requestStatusCounts: (requests.statusCounts as Record<string, number>) ?? {},
            requestTypeCounts: (requests.typeCounts as Record<string, number>) ?? {},
            officerStats: officers,
          };
        },
      }),
      providesTags: ['Analytics'],
    }),

    getPublicCompanySettings: builder.query<Record<string, string | null>, void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.rpc('get_public_company_settings');
          if (error) throw error;
          const row = Array.isArray(data) ? data[0] : data;
          return (row ?? {}) as Record<string, string | null>;
        },
      }),
      providesTags: ['Settings'],
    }),

    getAdminSettings: builder.query<Record<string, unknown>, void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.from('general_settings').select('*').limit(1).maybeSingle();
          if (error) throw error;
          return (data ?? {}) as Record<string, unknown>;
        },
      }),
      providesTags: ['Settings'],
    }),

    updateAdminSettings: builder.mutation<void, Record<string, unknown>>({
      query: (updates) => ({
        handler: async (client) => {
          const { data: existing } = await client.from('general_settings').select('id').limit(1).maybeSingle();
          if (existing?.id) {
            const { error } = await client.from('general_settings').update(updates).eq('id', existing.id);
            if (error) throw error;
          } else {
            const { error } = await client.from('general_settings').insert(updates);
            if (error) throw error;
          }
        },
      }),
      invalidatesTags: ['Settings'],
    }),

    getFaqs: builder.query<{ id: string; question: string; answer: string }[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('faqs')
            .select('id, question, answer')
            .eq('is_published', true)
            .order('order_index', { ascending: true });
          if (error) throw error;
          return (data ?? []) as { id: string; question: string; answer: string }[];
        },
      }),
      providesTags: ['Settings'],
    }),

    getAuditLogs: builder.query<AuditLog[], { action?: string } | void>({
      query: (filters) => ({
        handler: async (client) => {
          let query = client.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100);
          if (filters?.action) query = query.eq('action', filters.action);
          const { data, error } = await query;
          if (error) throw error;
          return (data ?? []).map((row) => ({
            id: row.id as string,
            timestamp: row.timestamp as string,
            actorId: (row.actor_id as string) ?? null,
            action: row.action as string,
            targetEntity: (row.target_entity as string) ?? null,
            status: (row.status as string) ?? null,
          }));
        },
      }),
      providesTags: ['Audit'],
    }),

    sendBulkNotification: builder.mutation<void, { title: string; body: string; audience: string }>({
      query: (body) => ({
        handler: async (client) => {
          const { error } = await client.from('notification_queue').insert({
            title: body.title,
            body: body.body,
            audience: body.audience,
            status: 'pending',
          });
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Notifications'],
    }),

    getNotificationHistory: builder.query<
      { id: string; title: string; audience: string; status: string; sentCount: number; createdAt: string }[],
      void
    >({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('notification_queue')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
          if (error) throw error;
          return (data ?? []).map((row) => ({
            id: row.id as string,
            title: row.title as string,
            audience: row.audience as string,
            status: row.status as string,
            sentCount: Number(row.sent_count ?? 0),
            createdAt: row.created_at as string,
          }));
        },
      }),
      providesTags: ['Notifications'],
    }),

    exportBackup: builder.mutation<{ url: string }, void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('admin-backup-export', {
            body: { tables: ['user_payments', 'service_requests'] },
          });
          if (error) throw error;
          return data as { url: string };
        },
      }),
    }),

    sendChatMessage: builder.mutation<{ reply: string }, { message: string; userId: string }>({
      query: (body) => ({
        handler: async (client) => {
          await client.from('chatbot_conversations').insert({
            user_id: body.userId,
            message: body.message,
          });
          const { data, error } = await client.functions.invoke('gemini-rag-chatbot', { body });
          if (error) throw error;
          const reply = (data as { reply?: string })?.reply ?? 'Sorry, I could not help right now.';
          const { data: conv } = await client
            .from('chatbot_conversations')
            .select('id')
            .eq('user_id', body.userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (conv?.id) {
            await client.from('chatbot_conversations').update({ reply }).eq('id', conv.id);
          }
          return { reply };
        },
      }),
    }),
  }),
});

export const {
  useGetDashboardKpisQuery,
  useGetAnalyticsReportQuery,
  useGetAnalyticsQuery,
  useGetPublicCompanySettingsQuery,
  useGetAdminSettingsQuery,
  useUpdateAdminSettingsMutation,
  useGetFaqsQuery,
  useGetAuditLogsQuery,
  useSendBulkNotificationMutation,
  useGetNotificationHistoryQuery,
  useExportBackupMutation,
  useSendChatMessageMutation,
} = analyticsApi;
