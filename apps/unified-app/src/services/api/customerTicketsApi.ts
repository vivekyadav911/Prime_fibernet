import type { CustomerTicket, TicketCustomerMessage } from '@/types/customer';
import { baseApi } from './baseApi';

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

export type CreateCustomerTicketInput = {
  category: string;
  subject: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  attachments?: string[];
};

export const customerTicketsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyTickets: builder.query<CustomerTicket[], void>({
      query: () => ({
        handler: async (client) => {
          const { data: auth } = await client.auth.getUser();
          if (!auth.user) return [];

          const { data: userRow } = await client
            .from('users')
            .select('id')
            .or(`auth_user_id.eq.${auth.user.id},id.eq.${auth.user.id}`)
            .maybeSingle();
          if (!userRow?.id) return [];

          const { data, error } = await client
            .from('tickets')
            .select('*')
            .eq('customer_id', userRow.id)
            .order('updated_at', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => mapTicket(row as Record<string, unknown>));
        },
      }),
      providesTags: ['CustomerTickets'],
    }),

    getTicketMessages: builder.query<TicketCustomerMessage[], string>({
      query: (ticketId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('ticket_customer_messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });
          if (error) throw error;
          return (data ?? []).map((row) => mapMessage(row as Record<string, unknown>));
        },
      }),
      providesTags: (_r, _e, ticketId) => [{ type: 'CustomerTickets', id: ticketId }],
    }),

    createCustomerTicket: builder.mutation<CustomerTicket, CreateCustomerTicketInput>({
      query: (input) => ({
        handler: async (client) => {
          const { data: session } = await client.auth.getSession();
          if (!session.session) throw new Error('Sign in required');

          const { data, error } = await client.functions.invoke('create-support-ticket', {
            body: input,
          });
          if (error) throw error;
          const payload = data as { ticket_id: string; ticket_number: string };
          const { data: ticket, error: fetchErr } = await client
            .from('tickets')
            .select('*')
            .eq('id', payload.ticket_id)
            .single();
          if (fetchErr) throw fetchErr;
          return mapTicket(ticket as Record<string, unknown>);
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

          const { data: userRow } = await client
            .from('users')
            .select('id')
            .or(`auth_user_id.eq.${auth.user.id},id.eq.${auth.user.id}`)
            .maybeSingle();

          const { data, error } = await client
            .from('ticket_customer_messages')
            .insert({
              ticket_id: ticketId,
              sender_type: 'customer',
              sender_id: userRow?.id ?? auth.user.id,
              message,
              attachments: attachments ?? [],
            })
            .select('*')
            .single();
          if (error) throw error;
          return mapMessage(data as Record<string, unknown>);
        },
      }),
      invalidatesTags: (_r, _e, { ticketId }) => [
        { type: 'CustomerTickets', id: ticketId },
        'CustomerTickets',
      ],
    }),
  }),
});

export const {
  useGetMyTicketsQuery,
  useGetTicketMessagesQuery,
  useCreateCustomerTicketMutation,
  useSendTicketReplyMutation,
} = customerTicketsApi;
