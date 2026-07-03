import type { PortalItemKind, PortalTicketItem } from '@/types/portalTicket';
import type { ServiceRequest } from '@/types/requests';
import type { Ticket, TicketActivityEvent, TicketStatus } from '@/types/tickets';

import { baseApi } from './baseApi';
import { fetchPlanMap } from './adminRequestsBoardApi';
import { fetchOfficerNameMap, getOfficerIdForUser } from './mappers';
import type { TypedSupabaseClient } from './supabase';
import { buildPortalItems, serializePortalItemForCache, serializePortalItemsForCache } from '@/utils/portalTicketMappers';
import { mapDbRowToServiceRequest } from '@/utils/requestViewMappers';
import { mapDbRowToTicket } from '@/utils/ticketViewMappers';
import { getPortalItemCoordinates } from '@/utils/officerPortalCoordinates';

export type OfficerPortalItemDetail = PortalTicketItem & {
  coordinates: ReturnType<typeof getPortalItemCoordinates>;
  activityTimeline: Array<{
    id: string;
    description: string;
    performedBy: string;
    performedByRole: string;
    timestamp: string;
    type: string;
  }>;
  description: string;
  contactPhone: string | null;
  contactEmail: string | null;
  photoUrls: string[];
};

async function loadRequestActivities(client: TypedSupabaseClient, requestId: string) {
  const { data, error } = await client
    .from('request_activities')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
}

async function loadTicketActivities(client: TypedSupabaseClient, ticketId: string) {
  const { data, error } = await client
    .from('ticket_activity_events')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: String(record.id),
      type: String(record.type ?? '') as TicketActivityEvent['type'],
      description: String(record.description ?? ''),
      performedBy: String(record.performed_by ?? ''),
      performedByRole: String(record.performed_by_role ?? ''),
      timestamp: new Date(String(record.timestamp ?? record.created_at ?? Date.now())),
    } satisfies TicketActivityEvent;
  });
}

async function fetchOfficerPortalItems(client: TypedSupabaseClient, officerId: string): Promise<PortalTicketItem[]> {
  const [ticketResult, requestResult, planMap] = await Promise.all([
    client
      .from('ticket_sla_live')
      .select('*')
      .eq('assigned_officer_id', officerId)
      .order('created_at', { ascending: false }),
    client
      .from('service_requests')
      .select('*')
      .eq('officer_id', officerId)
      .order('created_at', { ascending: false }),
    fetchPlanMap(client),
  ]);

  if (ticketResult.error) throw ticketResult.error;
  if (requestResult.error) throw requestResult.error;

  const officerNameById = await fetchOfficerNameMap(client, [officerId]);
  const requestRows = (requestResult.data ?? []) as Record<string, unknown>[];
  const requestRowById = new Map(requestRows.map((row) => [String(row.id), row]));

  const tickets: Ticket[] = await Promise.all(
    ((ticketResult.data ?? []) as Record<string, unknown>[]).map(async (row) => {
      const enriched = {
        ...row,
        assigned_officer_name:
          officerNameById.get(officerId) ?? (row.assigned_officer_name as string | null),
      };
      return mapDbRowToTicket(enriched, [], [], []);
    }),
  );

  const requests: ServiceRequest[] = await Promise.all(
    requestRows.map(async (row) => {
      const activities = await loadRequestActivities(client, String(row.id));
      return mapDbRowToServiceRequest(row, activities, planMap);
    }),
  );

  const items = buildPortalItems(tickets, requests);

  return serializePortalItemsForCache(
    items.map((item) => {
      if (item.kind !== 'ticket' || !item.ticket?.linkedRequestId) return item;
      const linkedRow = requestRowById.get(item.ticket.linkedRequestId);
      if (!linkedRow) return item;
      const linkedRequest = mapDbRowToServiceRequest(linkedRow, [], planMap);
      return { ...item, request: linkedRequest };
    }),
  );
}

function mapDetailFromItem(
  item: PortalTicketItem,
  linkedRequestRow?: Record<string, unknown> | null,
): OfficerPortalItemDetail {
  const coordinates = getPortalItemCoordinates(item, linkedRequestRow);

  if (item.kind === 'ticket' && item.ticket) {
    const ticket = item.ticket;
    return {
      ...item,
      coordinates,
      description: ticket.description,
      contactPhone: ticket.contactPhone,
      contactEmail: ticket.contactEmail,
      photoUrls: ticket.attachments?.map((a) => a.fileUrl) ?? [],
      activityTimeline: ticket.activityTimeline.map((event) => ({
        id: event.id,
        description: event.description,
        performedBy: event.performedBy,
        performedByRole: event.performedByRole,
        timestamp: event.timestamp.toISOString(),
        type: event.type,
      })),
    };
  }

  const request = item.request;
  return {
    ...item,
    coordinates,
    description: request?.notes?.join('\n') ?? '',
    contactPhone: request?.customerPhone ?? null,
    contactEmail: request?.customerEmail ?? null,
    photoUrls: [],
    activityTimeline:
      request?.activityTimeline.map((event) => ({
        id: event.id,
        description: event.description,
        performedBy: event.performedBy,
        performedByRole: event.performedByRole ?? '',
        timestamp: event.timestamp,
        type: event.type,
      })) ?? [],
  };
}

export const officerPortalApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOfficerAssignedPortalItems: builder.query<PortalTicketItem[], string | void>({
      query: (userId) => ({
        handler: async (client) => {
          if (!userId) return [];
          const officerId = await getOfficerIdForUser(client, userId);
          if (!officerId) return [];
          return fetchOfficerPortalItems(client, officerId);
        },
      }),
      providesTags: ['OfficerPortal'],
    }),

    getOfficerPortalItemDetail: builder.query<
      OfficerPortalItemDetail,
      { itemId: string; kind?: PortalItemKind }
    >({
      query: ({ itemId, kind }) => ({
        handler: async (client) => {
          if (kind === 'ticket' || !kind) {
            const { data: ticketRow, error: ticketError } = await client
              .from('ticket_sla_live')
              .select('*')
              .eq('id', itemId)
              .maybeSingle();
            if (ticketError) throw ticketError;
            if (ticketRow) {
              const activities = await loadTicketActivities(client, itemId);
              const ticket = mapDbRowToTicket(ticketRow as Record<string, unknown>, activities, [], []);
              let linkedRequestRow: Record<string, unknown> | null = null;
              if (ticket.linkedRequestId) {
                const { data: linked } = await client
                  .from('service_requests')
                  .select('*')
                  .eq('id', ticket.linkedRequestId)
                  .maybeSingle();
                linkedRequestRow = (linked as Record<string, unknown>) ?? null;
              }
              const item = buildPortalItems([ticket], [])[0];
              if (!item) throw new Error('Ticket not found');
              return serializePortalItemForCache(
                mapDetailFromItem(item, linkedRequestRow),
              ) as OfficerPortalItemDetail;
            }
            if (kind === 'ticket') throw new Error('Ticket not found');
          }

          const { data: requestRow, error: requestError } = await client
            .from('service_requests')
            .select('*')
            .eq('id', itemId)
            .maybeSingle();
          if (requestError) throw requestError;
          if (!requestRow) throw new Error('Ticket not found');

          const activities = await loadRequestActivities(client, itemId);
          const planMap = await fetchPlanMap(client);
          const request = mapDbRowToServiceRequest(requestRow as Record<string, unknown>, activities, planMap);
          const item = buildPortalItems([], [request])[0];
          if (!item) throw new Error('Ticket not found');
          return serializePortalItemForCache(
            mapDetailFromItem(item, requestRow as Record<string, unknown>),
          ) as OfficerPortalItemDetail;
        },
      }),
      providesTags: (_result, _error, arg) => [{ type: 'OfficerPortal', id: arg.itemId }],
    }),

    updateOfficerTicketStatus: builder.mutation<
      void,
      { ticketId: string; status: TicketStatus; note?: string; officerName: string }
    >({
      query: ({ ticketId, status, note, officerName }) => ({
        handler: async (client) => {
          const now = new Date().toISOString();
          const patch: Record<string, unknown> = { status, updated_at: now };
          if (status === 'Resolved') patch.resolved_at = now;
          if (status === 'Closed') patch.closed_at = now;

          const { error } = await client.from('tickets').update(patch).eq('id', ticketId);
          if (error) throw error;

          await client.from('ticket_activity_events').insert({
            ticket_id: ticketId,
            type: 'status_changed',
            description: note ?? `Status updated to ${status}`,
            performed_by: officerName,
            performed_by_role: 'Officer',
            metadata: { newStatus: status },
            timestamp: now,
          });
        },
      }),
      invalidatesTags: ['OfficerPortal', 'Requests'],
    }),

    addOfficerTicketNote: builder.mutation<
      void,
      { ticketId: string; note: string; officerName: string }
    >({
      query: ({ ticketId, note, officerName }) => ({
        handler: async (client) => {
          const { error } = await client.from('ticket_activity_events').insert({
            ticket_id: ticketId,
            type: 'note_added',
            description: note,
            performed_by: officerName,
            performed_by_role: 'Officer',
            metadata: {},
            timestamp: new Date().toISOString(),
          });
          if (error) throw error;
        },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'OfficerPortal', id: arg.ticketId },
        'OfficerPortal',
      ],
    }),

    createOfficerFieldTicket: builder.mutation<
      string,
      {
        officerUserId: string;
        officerName: string;
        complaintType: string;
        description: string;
        address: string;
        contactName: string;
        contactPhone: string;
      }
    >({
      query: (body) => ({
        handler: async (client) => {
          const officerId = await getOfficerIdForUser(client, body.officerUserId);
          if (!officerId) throw new Error('Officer profile not found');

          const { data: ticketNumber, error: numError } = await client.rpc('generate_ticket_number');
          if (numError) throw numError;

          const now = new Date().toISOString();
          const { data, error } = await client
            .from('tickets')
            .insert({
              ticket_number: String(ticketNumber),
              title: body.complaintType,
              complaint_type: body.complaintType,
              description: body.description,
              address: body.address,
              contact_name: body.contactName,
              contact_phone: body.contactPhone,
              source: 'officer',
              status: 'Open',
              priority: 'Medium',
              assigned_officer_id: officerId,
              assigned_officer_name: body.officerName,
              assigned_officer_role: 'Field Technician',
              assigned_at: now,
              created_by_admin_name: body.officerName,
              sla_response_deadline: now,
              sla_resolution_deadline: now,
            })
            .select('id')
            .single();
          if (error) throw error;

          await client.from('ticket_activity_events').insert({
            ticket_id: data.id,
            type: 'created',
            description: 'Ticket raised from field app',
            performed_by: body.officerName,
            performed_by_role: 'Officer',
            timestamp: now,
          });

          return String(data.id);
        },
      }),
      invalidatesTags: ['OfficerPortal'],
    }),
  }),
});

export const {
  useGetOfficerAssignedPortalItemsQuery,
  useGetOfficerPortalItemDetailQuery,
  useUpdateOfficerTicketStatusMutation,
  useAddOfficerTicketNoteMutation,
  useCreateOfficerFieldTicketMutation,
} = officerPortalApi;
