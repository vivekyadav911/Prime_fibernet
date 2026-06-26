import type { TicketPriority } from '@/types/tickets';
import type {
  CannedResponse,
  ChatMessage,
  ChatSession,
  CustomerComplaint,
  CustomerInteraction,
  Faq,
  FaqCategory,
  FaqFormData,
  SlaPolicy,
  SupportAnalyticsData,
  SupportAnalyticsPeriod,
  SupportDashboardStats,
} from '@/types/support';

import { baseApi } from './baseApi';

function mapFaqCategory(row: Record<string, unknown>): FaqCategory {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    icon: row.icon ? String(row.icon) : null,
    color: String(row.color ?? '#5B4FCF'),
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active ?? true),
    createdAt: String(row.created_at),
  };
}

function mapFaq(row: Record<string, unknown>): Faq {
  const category = row.faq_categories ?? row.category;
  return {
    id: String(row.id),
    categoryId: row.category_id ? String(row.category_id) : null,
    question: String(row.question),
    answer: String(row.answer),
    isPublished: Boolean(row.is_published),
    sortOrder: Number(row.order_index ?? 0),
    isFeatured: Boolean(row.is_featured ?? false),
    viewCount: Number(row.view_count ?? 0),
    helpfulCount: Number(row.helpful_count ?? 0),
    notHelpfulCount: Number(row.not_helpful_count ?? 0),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    publishedAt: row.published_at ? String(row.published_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
    category:
      category && typeof category === 'object' && !Array.isArray(category)
        ? mapFaqCategory(category as Record<string, unknown>)
        : undefined,
  };
}

function mapChatSession(row: Record<string, unknown>): ChatSession {
  return {
    id: String(row.id),
    customerId: row.customer_id ? String(row.customer_id) : null,
    customerName: String(row.customer_name),
    customerPhone: row.customer_phone ? String(row.customer_phone) : null,
    accountNumber: row.account_number ? String(row.account_number) : null,
    agentId: row.agent_id ? String(row.agent_id) : null,
    agentName: row.agent_name ? String(row.agent_name) : null,
    status: String(row.status) as ChatSession['status'],
    channel: String(row.channel ?? 'app'),
    startedAt: String(row.started_at),
    acceptedAt: row.accepted_at ? String(row.accepted_at) : null,
    endedAt: row.ended_at ? String(row.ended_at) : null,
    waitTimeSeconds: row.wait_time_seconds != null ? Number(row.wait_time_seconds) : null,
    durationSeconds: row.duration_seconds != null ? Number(row.duration_seconds) : null,
    linkedTicketId: row.linked_ticket_id ? String(row.linked_ticket_id) : null,
    csatScore: row.csat_score != null ? Number(row.csat_score) : null,
    csatComment: row.csat_comment ? String(row.csat_comment) : null,
  };
}

function mapChatMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    senderType: String(row.sender_type) as ChatMessage['senderType'],
    senderId: row.sender_id ? String(row.sender_id) : null,
    senderName: String(row.sender_name),
    message: row.message ? String(row.message) : null,
    messageType: String(row.message_type ?? 'text') as ChatMessage['messageType'],
    attachmentUrl: row.attachment_url ? String(row.attachment_url) : null,
    attachmentName: row.attachment_name ? String(row.attachment_name) : null,
    isRead: Boolean(row.is_read),
    readAt: row.read_at ? String(row.read_at) : null,
    createdAt: String(row.created_at),
  };
}

function mapComplaint(row: Record<string, unknown>): CustomerComplaint {
  return {
    id: String(row.id),
    complaintNumber: String(row.complaint_number),
    customerId: row.customer_id ? String(row.customer_id) : null,
    customerName: String(row.customer_name),
    accountNumber: row.account_number ? String(row.account_number) : null,
    complaintType: String(row.complaint_type),
    description: String(row.description),
    severity: String(row.severity ?? 'normal') as CustomerComplaint['severity'],
    status: String(row.status ?? 'received') as CustomerComplaint['status'],
    assignedTo: row.assigned_to ? String(row.assigned_to) : null,
    resolution: row.resolution ? String(row.resolution) : null,
    resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
    linkedTicketId: row.linked_ticket_id ? String(row.linked_ticket_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

function mapSlaPolicy(row: Record<string, unknown>): SlaPolicy {
  return {
    id: String(row.id),
    name: String(row.name),
    priority: String(row.priority) as TicketPriority,
    firstResponseHours: Number(row.first_response_hours),
    resolutionHours: Number(row.resolution_hours),
    escalationAfterHours: row.escalation_after_hours != null ? Number(row.escalation_after_hours) : null,
    escalateToLevel: Number(row.escalate_to_level ?? 1),
    notifyAgent: Boolean(row.notify_agent ?? true),
    notifySupervisor: Boolean(row.notify_supervisor ?? true),
    isActive: Boolean(row.is_active ?? true),
  };
}

function mapCanned(row: Record<string, unknown>): CannedResponse {
  return {
    id: String(row.id),
    title: String(row.title),
    shortcut: row.shortcut ? String(row.shortcut) : null,
    body: String(row.body),
    category: row.category ? String(row.category) : null,
    isActive: Boolean(row.is_active ?? true),
    useCount: Number(row.use_count ?? 0),
  };
}

function periodStart(period: SupportAnalyticsPeriod): string {
  const now = new Date();
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  }
  if (period === 'week') {
    return new Date(now.getTime() - 7 * 86400000).toISOString();
  }
  return new Date(now.getTime() - 30 * 86400000).toISOString();
}

export const adminSupportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSupportDashboardStats: builder.query<SupportDashboardStats, void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.from('support_dashboard_stats').select('*').single();
          if (error) throw error;
          const row = data as Record<string, unknown>;
          return {
            openTickets: Number(row.open_tickets ?? 0),
            inProgressTickets: Number(row.in_progress_tickets ?? 0),
            resolvedTickets: Number(row.resolved_tickets ?? 0),
            slaBreaches: Number(row.sla_breaches ?? 0),
            overdueTickets: Number(row.overdue_tickets ?? 0),
            avgResolutionHours: Number(row.avg_resolution_hours ?? 0),
            avgCsatScore: Number(row.avg_csat_score ?? 0),
            ticketsToday: Number(row.tickets_today ?? 0),
            ticketsThisWeek: Number(row.tickets_this_week ?? 0),
          };
        },
      }),
      providesTags: ['Support'],
    }),

    getFaqCategories: builder.query<FaqCategory[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('faq_categories')
            .select('*')
            .order('sort_order', { ascending: true });
          if (error) throw error;
          return (data ?? []).map((row) => mapFaqCategory(row as Record<string, unknown>));
        },
      }),
      providesTags: ['Support'],
    }),

    getFaqsAdmin: builder.query<Faq[], { categoryId?: string; publishedOnly?: boolean } | void>({
      query: (filters) => ({
        handler: async (client) => {
          let q = client
            .from('faqs')
            .select('*, faq_categories(*)')
            .order('order_index', { ascending: true });
          if (filters?.categoryId) q = q.eq('category_id', filters.categoryId);
          if (filters?.publishedOnly) q = q.eq('is_published', true);
          const { data, error } = await q;
          if (error) throw error;
          return (data ?? []).map((row) => mapFaq(row as Record<string, unknown>));
        },
      }),
      providesTags: ['Support'],
    }),

    upsertFaq: builder.mutation<Faq, { id?: string; data: FaqFormData }>({
      query: ({ id, data }) => ({
        handler: async (client) => {
          const payload = {
            category_id: data.categoryId,
            question: data.question,
            answer: data.answer,
            is_published: data.isPublished,
            is_featured: data.isFeatured,
            tags: data.tags,
            order_index: data.sortOrder,
            published_at: data.isPublished ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          };
          if (id) {
            const { data: row, error } = await client
              .from('faqs')
              .update(payload)
              .eq('id', id)
              .select('*, faq_categories(*)')
              .single();
            if (error) throw error;
            return mapFaq(row as Record<string, unknown>);
          }
          const { data: row, error } = await client
            .from('faqs')
            .insert(payload)
            .select('*, faq_categories(*)')
            .single();
          if (error) throw error;
          return mapFaq(row as Record<string, unknown>);
        },
      }),
      invalidatesTags: ['Support'],
    }),

    deleteFaq: builder.mutation<void, string>({
      query: (id) => ({
        handler: async (client) => {
          const { error } = await client.from('faqs').delete().eq('id', id);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Support'],
    }),

    reorderFaqs: builder.mutation<void, { id: string; sortOrder: number }[]>({
      query: (items) => ({
        handler: async (client) => {
          await Promise.all(
            items.map(({ id, sortOrder }) =>
              client.from('faqs').update({ order_index: sortOrder }).eq('id', id),
            ),
          );
        },
      }),
      invalidatesTags: ['Support'],
    }),

    upsertFaqCategory: builder.mutation<FaqCategory, Partial<FaqCategory> & { name: string; slug: string }>({
      query: (input) => ({
        handler: async (client) => {
          const payload = {
            name: input.name,
            slug: input.slug,
            icon: input.icon,
            color: input.color,
            sort_order: input.sortOrder,
            is_active: input.isActive ?? true,
          };
          if (input.id) {
            const { data, error } = await client
              .from('faq_categories')
              .update(payload)
              .eq('id', input.id)
              .select('*')
              .single();
            if (error) throw error;
            return mapFaqCategory(data as Record<string, unknown>);
          }
          const { data, error } = await client.from('faq_categories').insert(payload).select('*').single();
          if (error) throw error;
          return mapFaqCategory(data as Record<string, unknown>);
        },
      }),
      invalidatesTags: ['Support'],
    }),

    getChatSessions: builder.query<ChatSession[], { status?: string; agentId?: string } | void>({
      query: (filters) => ({
        handler: async (client) => {
          let q = client.from('chat_sessions').select('*').order('started_at', { ascending: false });
          if (filters?.status) q = q.eq('status', filters.status);
          if (filters?.agentId) q = q.eq('agent_id', filters.agentId);
          const { data, error } = await q;
          if (error) throw error;
          return (data ?? []).map((row) => mapChatSession(row as Record<string, unknown>));
        },
      }),
      providesTags: ['Support'],
    }),

    getChatMessages: builder.query<ChatMessage[], string>({
      query: (sessionId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('chat_messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });
          if (error) throw error;
          return (data ?? []).map((row) => mapChatMessage(row as Record<string, unknown>));
        },
      }),
      providesTags: ['Support'],
    }),

    getComplaints: builder.query<CustomerComplaint[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('customer_complaints')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => mapComplaint(row as Record<string, unknown>));
        },
      }),
      providesTags: ['Support'],
    }),

    getComplaint: builder.query<CustomerComplaint, string>({
      query: (id) => ({
        handler: async (client) => {
          const { data, error } = await client.from('customer_complaints').select('*').eq('id', id).single();
          if (error) throw error;
          return mapComplaint(data as Record<string, unknown>);
        },
      }),
      providesTags: ['Support'],
    }),

    getCustomerInteractions: builder.query<CustomerInteraction[], string>({
      query: (customerId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('customer_interactions')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => ({
            id: String(row.id),
            customerId: String(row.customer_id),
            interactionType: String(row.interaction_type),
            direction: String(row.direction) as CustomerInteraction['direction'],
            subject: row.subject ? String(row.subject) : null,
            notes: row.notes ? String(row.notes) : null,
            durationMinutes: row.duration_minutes != null ? Number(row.duration_minutes) : null,
            agentId: row.agent_id ? String(row.agent_id) : null,
            linkedTicketId: row.linked_ticket_id ? String(row.linked_ticket_id) : null,
            linkedChatId: row.linked_chat_id ? String(row.linked_chat_id) : null,
            createdAt: String(row.created_at),
          }));
        },
      }),
      providesTags: ['Support'],
    }),

    getSlaPolicies: builder.query<SlaPolicy[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.from('sla_policies').select('*').order('priority');
          if (error) throw error;
          return (data ?? []).map((row) => mapSlaPolicy(row as Record<string, unknown>));
        },
      }),
      providesTags: ['Support'],
    }),

    updateSlaPolicy: builder.mutation<SlaPolicy, Partial<SlaPolicy> & { id: string }>({
      query: (input) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('sla_policies')
            .update({
              name: input.name,
              first_response_hours: input.firstResponseHours,
              resolution_hours: input.resolutionHours,
              escalation_after_hours: input.escalationAfterHours,
              escalate_to_level: input.escalateToLevel,
              notify_agent: input.notifyAgent,
              notify_supervisor: input.notifySupervisor,
              is_active: input.isActive,
            })
            .eq('id', input.id)
            .select('*')
            .single();
          if (error) throw error;
          return mapSlaPolicy(data as Record<string, unknown>);
        },
      }),
      invalidatesTags: ['Support'],
    }),

    getCannedResponses: builder.query<CannedResponse[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('canned_responses')
            .select('*')
            .order('category')
            .order('title');
          if (error) throw error;
          return (data ?? []).map((row) => mapCanned(row as Record<string, unknown>));
        },
      }),
      providesTags: ['Support'],
    }),

    upsertCannedResponse: builder.mutation<CannedResponse, Partial<CannedResponse> & { title: string; body: string }>({
      query: (input) => ({
        handler: async (client) => {
          const payload = {
            title: input.title,
            shortcut: input.shortcut,
            body: input.body,
            category: input.category,
            is_active: input.isActive ?? true,
          };
          if (input.id) {
            const { data, error } = await client
              .from('canned_responses')
              .update(payload)
              .eq('id', input.id)
              .select('*')
              .single();
            if (error) throw error;
            return mapCanned(data as Record<string, unknown>);
          }
          const { data, error } = await client.from('canned_responses').insert(payload).select('*').single();
          if (error) throw error;
          return mapCanned(data as Record<string, unknown>);
        },
      }),
      invalidatesTags: ['Support'],
    }),

    getSupportAnalytics: builder.query<SupportAnalyticsData, SupportAnalyticsPeriod>({
      query: (period) => ({
        handler: async (client) => {
          const since = periodStart(period);
          const { data: tickets, error } = await client
            .from('tickets')
            .select('status, complaint_type, priority, source, created_at, resolved_at, csat_score, sla_resolution_breached, assigned_officer_id, assigned_officer_name')
            .gte('created_at', since);
          if (error) throw error;
          const rows = tickets ?? [];

          const byStatus: Record<string, number> = {};
          const byCategory: Record<string, number> = {};
          const byPriority: Record<string, number> = {};
          const byChannel: Record<string, number> = {};
          const dailyMap = new Map<string, number>();
          const csatMap = new Map<string, { sum: number; count: number }>();
          const agentMap = new Map<string, { name: string; resolved: number; hours: number[]; csat: number[] }>();
          const slaMap = new Map<string, { within: number; breached: number }>();

          for (const row of rows) {
            const status = String(row.status);
            const category = String(row.complaint_type);
            const priority = String(row.priority);
            const channel = String(row.source);
            byStatus[status] = (byStatus[status] ?? 0) + 1;
            byCategory[category] = (byCategory[category] ?? 0) + 1;
            byPriority[priority] = (byPriority[priority] ?? 0) + 1;
            byChannel[channel] = (byChannel[channel] ?? 0) + 1;

            const day = String(row.created_at).slice(0, 10);
            dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);

            if (row.csat_score != null) {
              const csatDay = String(row.created_at).slice(0, 10);
              const entry = csatMap.get(csatDay) ?? { sum: 0, count: 0 };
              entry.sum += Number(row.csat_score);
              entry.count += 1;
              csatMap.set(csatDay, entry);
            }

            const sla = slaMap.get(priority) ?? { within: 0, breached: 0 };
            if (row.sla_resolution_breached) sla.breached += 1;
            else sla.within += 1;
            slaMap.set(priority, sla);

            if (row.resolved_at && row.assigned_officer_id) {
              const agentId = String(row.assigned_officer_id);
              const entry = agentMap.get(agentId) ?? {
                name: String(row.assigned_officer_name ?? 'Agent'),
                resolved: 0,
                hours: [],
                csat: [],
              };
              entry.resolved += 1;
              const hours =
                (new Date(String(row.resolved_at)).getTime() - new Date(String(row.created_at)).getTime()) /
                3600000;
              entry.hours.push(hours);
              if (row.csat_score != null) entry.csat.push(Number(row.csat_score));
              agentMap.set(agentId, entry);
            }
          }

          return {
            byStatus,
            byCategory,
            byPriority,
            byChannel,
            dailyTickets: [...dailyMap.entries()].map(([date, count]) => ({ date, count })),
            dailyCsat: [...csatMap.entries()].map(([date, v]) => ({
              date,
              score: v.count ? v.sum / v.count : 0,
            })),
            agentLeaderboard: [...agentMap.entries()]
              .map(([agentId, v]) => ({
                agentId,
                agentName: v.name,
                resolved: v.resolved,
                avgResolutionHours: v.hours.length
                  ? v.hours.reduce((a, b) => a + b, 0) / v.hours.length
                  : 0,
                avgCsat: v.csat.length ? v.csat.reduce((a, b) => a + b, 0) / v.csat.length : 0,
              }))
              .sort((a, b) => b.resolved - a.resolved),
            slaPerformance: [...slaMap.entries()].map(([priority, v]) => ({
              priority,
              withinSla: v.within,
              breached: v.breached,
            })),
          };
        },
      }),
      providesTags: ['Support'],
    }),

    incrementFaqView: builder.mutation<void, string>({
      query: (id) => ({
        handler: async (client) => {
          const { data } = await client.from('faqs').select('view_count').eq('id', id).single();
          await client
            .from('faqs')
            .update({ view_count: Number(data?.view_count ?? 0) + 1 })
            .eq('id', id);
        },
      }),
    }),

    voteFaqHelpful: builder.mutation<void, { id: string; helpful: boolean }>({
      query: ({ id, helpful }) => ({
        handler: async (client) => {
          const field = helpful ? 'helpful_count' : 'not_helpful_count';
          const { data } = await client.from('faqs').select(field).eq('id', id).single();
          const current = Number((data as Record<string, number> | null)?.[field] ?? 0);
          await client.from('faqs').update({ [field]: current + 1 }).eq('id', id);
        },
      }),
    }),
  }),
});

export const {
  useGetSupportDashboardStatsQuery,
  useGetFaqCategoriesQuery,
  useGetFaqsAdminQuery,
  useUpsertFaqMutation,
  useDeleteFaqMutation,
  useReorderFaqsMutation,
  useUpsertFaqCategoryMutation,
  useGetChatSessionsQuery,
  useGetChatMessagesQuery,
  useGetComplaintsQuery,
  useGetComplaintQuery,
  useGetCustomerInteractionsQuery,
  useGetSlaPoliciesQuery,
  useUpdateSlaPolicyMutation,
  useGetCannedResponsesQuery,
  useUpsertCannedResponseMutation,
  useGetSupportAnalyticsQuery,
  useIncrementFaqViewMutation,
  useVoteFaqHelpfulMutation,
} = adminSupportApi;
