import type { PortalItemCoordinates, PortalItemKind, PortalTicketItem } from '@/types/portalTicket';
import type { RootState } from '@/store/store';
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
  const [mineTicketResult, openPoolTicketResult, requestResult, planMap] = await Promise.all([
    client
      .from('ticket_sla_live')
      .select('*')
      .eq('assigned_officer_id', officerId)
      .order('created_at', { ascending: false }),
    client
      .from('ticket_sla_live')
      .select('*')
      .is('assigned_officer_id', null)
      .not('status', 'in', '("Resolved","Closed")')
      .order('created_at', { ascending: false }),
    client
      .from('service_requests')
      .select('*')
      .eq('officer_id', officerId)
      .order('created_at', { ascending: false }),
    fetchPlanMap(client),
  ]);

  if (mineTicketResult.error) throw mineTicketResult.error;
  if (openPoolTicketResult.error) throw openPoolTicketResult.error;
  if (requestResult.error) throw requestResult.error;

  const officerNameById = await fetchOfficerNameMap(client, [officerId]);
  const requestRows = (requestResult.data ?? []) as Record<string, unknown>[];
  const requestRowById = new Map(requestRows.map((row) => [String(row.id), row]));

  const ticketRowsById = new Map<string, Record<string, unknown>>();
  for (const row of [
    ...((mineTicketResult.data ?? []) as Record<string, unknown>[]),
    ...((openPoolTicketResult.data ?? []) as Record<string, unknown>[]),
  ]) {
    ticketRowsById.set(String(row.id), row);
  }
  const ticketRows = [...ticketRowsById.values()];
  const ticketRowById = ticketRowsById;

  const tickets: Ticket[] = await Promise.all(
    ticketRows.map(async (row) => {
      const rowOfficerId = row.assigned_officer_id ? String(row.assigned_officer_id) : null;
      const enriched = {
        ...row,
        assigned_officer_name:
          rowOfficerId === officerId
            ? officerNameById.get(officerId) ?? (row.assigned_officer_name as string | null)
            : (row.assigned_officer_name as string | null),
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
      const linkedRow =
        item.kind === 'ticket' && item.ticket?.linkedRequestId
          ? requestRowById.get(item.ticket.linkedRequestId) ?? null
          : item.kind === 'request'
            ? requestRowById.get(item.id) ?? null
            : null;

      let enriched = item;
      if (linkedRow && item.kind === 'ticket') {
        const linkedRequest = mapDbRowToServiceRequest(linkedRow, [], planMap);
        enriched = { ...item, request: linkedRequest };
      }

      const ticketRow = item.kind === 'ticket' ? ticketRowById.get(item.id) ?? null : null;
      const coordinates = getPortalItemCoordinates(enriched, linkedRow, ticketRow);
      const customerAddress = coordinates?.address?.trim() || enriched.customerAddress;

      return { ...enriched, customerAddress, coordinates };
    }),
  );
}

function applyLocationToPortalItem(
  item: PortalTicketItem,
  itemId: string,
  kind: PortalItemKind,
  coordinates: PortalItemCoordinates,
  address: string,
): void {
  if (item.id !== itemId || item.kind !== kind) return;
  item.coordinates = coordinates;
  item.customerAddress = address;
  if (item.ticket) {
    item.ticket = { ...item.ticket, address };
  }
  if (item.request) {
    item.request = { ...item.request, customerAddress: address };
  }
}

function mapDetailFromItem(
  item: PortalTicketItem,
  linkedRequestRow?: Record<string, unknown> | null,
  ticketRow?: Record<string, unknown> | null,
): OfficerPortalItemDetail {
  const coordinates = getPortalItemCoordinates(item, linkedRequestRow, ticketRow);
  const resolvedAddress =
    coordinates?.address?.trim() || item.customerAddress?.trim() || '';

  if (item.kind === 'ticket' && item.ticket) {
    const ticket = item.ticket;
    return {
      ...item,
      customerAddress: resolvedAddress || item.customerAddress,
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
    customerAddress: resolvedAddress || item.customerAddress,
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
                mapDetailFromItem(
                  item,
                  linkedRequestRow,
                  ticketRow as Record<string, unknown>,
                ),
              ) as OfficerPortalItemDetail;
            }
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

    updateOfficerPortalItemLocation: builder.mutation<
      void,
      {
        itemId: string;
        kind: PortalItemKind;
        latitude: number;
        longitude: number;
        address: string;
        officerName?: string;
      }
    >({
      query: ({ itemId, kind, latitude, longitude, address, officerName }) => ({
        handler: async (client) => {
          const now = new Date().toISOString();
          const requestPatch = {
            location_lat: latitude,
            location_lng: longitude,
            latitude,
            longitude,
            location_address: address,
            address,
            updated_at: now,
          };

          if (kind === 'request') {
            const { error } = await client
              .from('service_requests')
              .update(requestPatch)
              .eq('id', itemId);
            if (error) throw error;
            return;
          }

          const { data: ticket, error: ticketFetchError } = await client
            .from('tickets')
            .select('linked_request_id')
            .eq('id', itemId)
            .maybeSingle();
          if (ticketFetchError) throw ticketFetchError;

          const { data: updatedTicket, error: ticketUpdateError } = await client
            .from('tickets')
            .update({
              lat: latitude,
              lng: longitude,
              address,
              updated_at: now,
            })
            .eq('id', itemId)
            .select('id, address, lat, lng')
            .maybeSingle();
          if (ticketUpdateError) throw ticketUpdateError;
          if (!updatedTicket) {
            throw new Error('Could not update ticket location. Check assignment and try again.');
          }

          if (ticket?.linked_request_id) {
            // ponytail: ticket pin is canonical; linked request sync is best-effort (RLS may block)
            await client
              .from('service_requests')
              .update(requestPatch)
              .eq('id', ticket.linked_request_id);
          }

          if (officerName) {
            // ponytail: activity note is UX-only; never fail the pin save on it
            await client.from('ticket_activity_events').insert({
              ticket_id: itemId,
              type: 'note_added',
              description: `Location updated to ${address}`,
              performed_by: officerName,
              performed_by_role: 'Officer',
              metadata: { latitude, longitude },
              timestamp: now,
            });
          }
        },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'OfficerPortal', id: arg.itemId },
        'OfficerPortal',
      ],
      async onQueryStarted(
        { itemId, kind, latitude, longitude, address },
        { dispatch, queryFulfilled, getState },
      ) {
        try {
          await queryFulfilled;
        } catch {
          return;
        }

        // Patch cache only after success — optimistic lat/lng remounts MapView under the
        // open Fix-pin modal and crashes Android.
        const coordinates: PortalItemCoordinates = { latitude, longitude, address };

        const detailArgs = { itemId, kind };
        const detailEntry = officerPortalApi.endpoints.getOfficerPortalItemDetail.select(detailArgs)(
          getState(),
        );
        if (detailEntry.data) {
          dispatch(
            officerPortalApi.util.updateQueryData('getOfficerPortalItemDetail', detailArgs, (draft) => {
              applyLocationToPortalItem(draft, itemId, kind, coordinates, address);
              draft.coordinates = coordinates;
              draft.customerAddress = address;
            }),
          );
        }

        const apiQueries = (getState() as RootState).api.queries;
        for (const cacheKey of Object.keys(apiQueries)) {
          if (!cacheKey.startsWith('getOfficerAssignedPortalItems(')) continue;
          const entry = apiQueries[cacheKey];
          if (!entry?.data) continue;
          const userId = entry.originalArgs as string | undefined;
          dispatch(
            officerPortalApi.util.updateQueryData('getOfficerAssignedPortalItems', userId, (draft) => {
              for (const item of draft) {
                applyLocationToPortalItem(item, itemId, kind, coordinates, address);
              }
            }),
          );
        }
      },
    }),

    claimOfficerTicket: builder.mutation<
      { ticketId: string; claimed: boolean },
      string
    >({
      query: (ticketId) => ({
        handler: async (client) => {
          const { data, error } = await client.rpc('claim_officer_ticket', {
            p_ticket_id: ticketId,
          });
          if (error) {
            throw error;
          }
          const result = (data ?? {}) as {
            ticket_id?: string;
            claimed?: boolean;
            already_assigned?: boolean;
            assigned?: boolean;
          };
          const claimed = Boolean(result.claimed ?? result.already_assigned ?? result.assigned);
          if (!claimed) {
            throw new Error('Could not pick up ticket');
          }
          return {
            ticketId: String(result.ticket_id ?? ticketId),
            claimed: true,
          };
        },
      }),
      invalidatesTags: (_result, _error, ticketId) => [
        { type: 'OfficerPortal', id: ticketId },
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
  useUpdateOfficerPortalItemLocationMutation,
  useClaimOfficerTicketMutation,
  useCreateOfficerFieldTicketMutation,
} = officerPortalApi;
