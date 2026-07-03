import type {
  CustomerTicket,
  CustomerTicketWithTimeline,
  TicketCustomerMessage,
} from '@/types/customer';
import { formatSupabaseError } from '@/utils/supabaseError';
import { parseSupabaseFunctionError } from '@/utils/supabaseFunctionError';
import { buildCustomerTicketTimeline, mapActivityRow } from '@/utils/customerTicketTimeline';

import { baseApi } from './baseApi';
import type { TypedSupabaseClient } from './supabase';

function mapTicket(row: Record<string, unknown>): CustomerTicket {
  return {
    id: String(row.id),
    ticketNumber: String(row.ticket_number),
    title: String(row.title),
    category: String(row.complaint_type),
    priority: row.priority as CustomerTicket['priority'],
    status: row.status as CustomerTicket['status'],
    description: String(row.description),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    resolvedAt: (row.resolved_at as string) ?? null,
  };
}

function mapMessage(row: Record<string, unknown>): TicketCustomerMessage {
  const attachments = Array.isArray(row.attachments)
    ? (row.attachments as unknown[]).map(String)
    : [];
  return {
    id: String(row.id),
    ticketId: String(row.ticket_id),
    senderType: row.sender_type as TicketCustomerMessage['senderType'],
    senderId: (row.sender_id as string) ?? null,
    message: String(row.message),
    attachments,
    createdAt: String(row.created_at),
  };
}

async function resolveCustomerUserId(client: TypedSupabaseClient, authUserId?: string): Promise<string> {
  const { data: rpcId, error: rpcError } = await client.rpc('current_customer_user_id');
  if (!rpcError && rpcId) return String(rpcId);

  if (authUserId) {
    const byId = await client.from('users').select('id').eq('id', authUserId).maybeSingle();
    if (byId.data?.id) return String(byId.data.id);
    const byAuth = await client.from('users').select('id').eq('auth_user_id', authUserId).maybeSingle();
    if (byAuth.data?.id) return String(byAuth.data.id);
  }

  throw rpcError ?? new Error('Customer profile not found');
}

async function loadTicketTimeline(
  client: TypedSupabaseClient,
  tickets: Array<CustomerTicket & { assignedOfficerName: string | null }>,
): Promise<CustomerTicketWithTimeline[]> {
  if (!tickets.length) return [];

  const ticketIds = tickets.map((t) => t.id);
  const { data: events, error } = await client
    .from('ticket_activity_events')
    .select('*')
    .in('ticket_id', ticketIds)
    .order('timestamp', { ascending: true });
  if (error) throw new Error(formatSupabaseError(error));

  const byTicket = new Map<string, ReturnType<typeof mapActivityRow>[]>();
  for (const row of events ?? []) {
    const mapped = mapActivityRow(row as Record<string, unknown>);
    const ticketId = String((row as Record<string, unknown>).ticket_id);
    const ticketList = byTicket.get(ticketId) ?? [];
    ticketList.push(mapped);
    byTicket.set(ticketId, ticketList);
  }

  return tickets.map((ticket) => ({
    ...ticket,
    timeline: buildCustomerTicketTimeline(ticket, byTicket.get(ticket.id) ?? [], 3),
  }));
}

export type CreateCustomerTicketInput = {
  category: string;
  subject: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  attachments?: string[];
};

function slaHoursForPriority(priority: CreateCustomerTicketInput['priority']): number {
  if (priority === 'Critical') return 2;
  if (priority === 'High') return 8;
  return 24;
}

async function createTicketDirect(
  client: TypedSupabaseClient,
  input: CreateCustomerTicketInput,
): Promise<CustomerTicket> {
  const { data: { user } } = await client.auth.getUser();
  const customerId = await resolveCustomerUserId(client, user?.id);

  const { data: customer, error: custErr } = await client
    .from('users')
    .select('id, name, phone, email, customer_id')
    .eq('id', customerId)
    .single();
  if (custErr) throw new Error(formatSupabaseError(custErr, 'Customer record not found'));
  if (!customer) throw new Error('Customer record not found');

  const { data: ticketNumber, error: numErr } = await client.rpc('generate_ticket_number');
  if (numErr) throw new Error(formatSupabaseError(numErr, 'Could not generate ticket number'));

  const slaHours = slaHoursForPriority(input.priority);
  const now = new Date();

  const { data: ticket, error: ticketErr } = await client
    .from('tickets')
    .insert({
      ticket_number: ticketNumber,
      title: input.subject.trim(),
      contact_name: customer.name,
      contact_phone: customer.phone?.trim() || '0000000000',
      contact_email: customer.email,
      account_number: customer.customer_id ?? String(customer.id).slice(0, 8),
      complaint_type: input.category,
      priority: input.priority,
      status: 'Open',
      source: 'portal',
      description: input.description.trim(),
      customer_id: customer.id,
      created_by_admin_name: customer.name,
      sla_response_deadline: new Date(now.getTime() + slaHours * 3600000).toISOString(),
      sla_resolution_deadline: new Date(now.getTime() + slaHours * 4 * 3600000).toISOString(),
    })
    .select('*')
    .single();
  if (ticketErr) throw new Error(formatSupabaseError(ticketErr, 'Could not create ticket'));

  if (input.attachments?.length) {
    await client.from('ticket_customer_messages').insert({
      ticket_id: ticket.id,
      sender_type: 'customer',
      sender_id: customer.id,
      message: input.description.trim(),
      attachments: input.attachments,
    });
  }

  await client.rpc('notify_collection_admins', {
    p_type: 'ticket',
    p_title: 'New customer ticket',
    p_body: `${customer.name} raised ${ticket.ticket_number}`,
    p_data: { ticket_id: ticket.id, customer_id: customer.id },
  });

  return mapTicket(ticket as Record<string, unknown>);
}

export const customerTicketsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyTickets: builder.query<CustomerTicketWithTimeline[], void>({
      query: () => ({
        handler: async (client) => {
          const { data: { user } } = await client.auth.getUser();
          const customerId = await resolveCustomerUserId(client, user?.id);

          const { data, error } = await client
            .from('tickets')
            .select('*')
            .eq('customer_id', customerId)
            .order('updated_at', { ascending: false });
          if (error) throw new Error(formatSupabaseError(error, 'Could not load tickets'));

          const base = (data ?? []).map((row) => {
            const ticket = mapTicket(row as Record<string, unknown>);
            return {
              ...ticket,
              assignedOfficerName: ((row as Record<string, unknown>).assigned_officer_name as string) ?? null,
            };
          });

          return loadTicketTimeline(client, base);
        },
      }),
      providesTags: ['CustomerTickets'],
    }),

    getCustomerTicketDetail: builder.query<
      CustomerTicketWithTimeline,
      string
    >({
      query: (ticketId) => ({
        handler: async (client) => {
          const { data: { user } } = await client.auth.getUser();
          const customerId = await resolveCustomerUserId(client, user?.id);

          const { data, error } = await client
            .from('tickets')
            .select('*')
            .eq('id', ticketId)
            .eq('customer_id', customerId)
            .single();
          if (error) throw new Error(formatSupabaseError(error, 'Ticket not found'));

          const ticket = {
            ...mapTicket(data as Record<string, unknown>),
            assignedOfficerName: ((data as Record<string, unknown>).assigned_officer_name as string) ?? null,
          };

          const { data: events, error: eventsError } = await client
            .from('ticket_activity_events')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('timestamp', { ascending: true });
          if (eventsError) throw new Error(formatSupabaseError(eventsError));

          const activityRows = (events ?? []).map((row) => mapActivityRow(row as Record<string, unknown>));
          return {
            ...ticket,
            timeline: buildCustomerTicketTimeline(ticket, activityRows, 12),
          };
        },
      }),
      providesTags: (_r, _e, ticketId) => [
        { type: 'CustomerTickets', id: ticketId },
        'CustomerTickets',
      ],
    }),

    getTicketMessages: builder.query<TicketCustomerMessage[], string>({
      query: (ticketId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('ticket_customer_messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });
          if (error) throw new Error(formatSupabaseError(error));
          return (data ?? []).map((row) => mapMessage(row as Record<string, unknown>));
        },
      }),
      providesTags: (_r, _e, ticketId) => [{ type: 'CustomerTickets', id: `messages-${ticketId}` }],
    }),

    createCustomerTicket: builder.mutation<CustomerTicket, CreateCustomerTicketInput>({
      query: (input) => ({
        handler: async (client) => {
          const { data: session } = await client.auth.getSession();
          if (!session.session) throw new Error('Sign in required');

          if (!input.category?.trim()) throw new Error('Select a category');
          if (!input.subject?.trim()) throw new Error('Subject is required');
          if (input.description.trim().length < 20) {
            throw new Error('Description must be at least 20 characters');
          }

          const { data, error } = await client.functions.invoke('create-support-ticket', {
            body: input,
          });

          if (!error && data && typeof data === 'object') {
            const payload = data as { ticket_id?: string; error?: string };
            if (payload.error) throw new Error(payload.error);
            if (payload.ticket_id) {
              const { data: ticket, error: fetchErr } = await client
                .from('tickets')
                .select('*')
                .eq('id', payload.ticket_id)
                .single();
              if (fetchErr) throw new Error(formatSupabaseError(fetchErr, 'Ticket created but could not load details'));
              return mapTicket(ticket as Record<string, unknown>);
            }
          }

          if (error) {
            const message = await parseSupabaseFunctionError(error, '');
            const edgeUnavailable =
              /failed to send request|function not found|404|non-2xx/i.test(message) || !message;
            if (!edgeUnavailable) throw new Error(message);
          }

          return createTicketDirect(client, input);
        },
      }),
      invalidatesTags: ['CustomerTickets', 'PortalNotifications', 'CustomerDashboard'],
    }),

    sendTicketReply: builder.mutation<
      TicketCustomerMessage,
      { ticketId: string; message: string; attachments?: string[] }
    >({
      query: ({ ticketId, message, attachments }) => ({
        handler: async (client) => {
          const { data: auth } = await client.auth.getUser();
          if (!auth.user) throw new Error('Sign in required');

          const customerId = await resolveCustomerUserId(client, auth.user.id);

          const { data, error } = await client
            .from('ticket_customer_messages')
            .insert({
              ticket_id: ticketId,
              sender_type: 'customer',
              sender_id: customerId,
              message,
              attachments: attachments ?? [],
            })
            .select('*')
            .single();
          if (error) throw new Error(formatSupabaseError(error));
          return mapMessage(data as Record<string, unknown>);
        },
      }),
      invalidatesTags: (_r, _e, { ticketId }) => [
        { type: 'CustomerTickets', id: ticketId },
        { type: 'CustomerTickets', id: `messages-${ticketId}` },
        'CustomerTickets',
      ],
    }),
  }),
});

export const {
  useGetMyTicketsQuery,
  useGetCustomerTicketDetailQuery,
  useGetTicketMessagesQuery,
  useCreateCustomerTicketMutation,
  useSendTicketReplyMutation,
} = customerTicketsApi;
