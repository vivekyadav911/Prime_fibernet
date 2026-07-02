import { baseApi } from './baseApi';
import type { TypedSupabaseClient } from './supabase';
import type { ServiceRequest } from '@/types/requests';
import {
  mapDbRowToServiceRequest,
  mapSupportViewRowToServiceRequest,
} from '@/utils/requestViewMappers';

export type SupportItemViewRow = Record<string, unknown>;

async function fetchPlanMap(
  client: TypedSupabaseClient,
): Promise<Map<string, { name: string; isActive: boolean }>> {
  const map = new Map<string, { name: string; isActive: boolean }>();
  const { data, error } = await client.from('plans').select('id, name, is_active');
  if (error) return map;
  for (const row of data ?? []) {
    map.set(String(row.id), {
      name: String(row.name),
      isActive: Boolean(row.is_active),
    });
  }
  return map;
}

async function fetchActivitiesForRequest(
  client: TypedSupabaseClient,
  requestId: string,
): Promise<Record<string, unknown>[]> {
  const { data, error } = await client
    .from('request_activities')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
}

async function fetchAllActivities(
  client: TypedSupabaseClient,
  requestIds: string[],
): Promise<Map<string, Record<string, unknown>[]>> {
  const map = new Map<string, Record<string, unknown>[]>();
  if (!requestIds.length) return map;

  const { data, error } = await client
    .from('request_activities')
    .select('*')
    .in('request_id', requestIds)
    .order('created_at', { ascending: true });

  if (error) throw error;

  for (const row of data ?? []) {
    const requestId = String(row.request_id);
    const list = map.get(requestId) ?? [];
    list.push(row as Record<string, unknown>);
    map.set(requestId, list);
  }

  return map;
}

async function loadAdminRequestBoard(client: TypedSupabaseClient): Promise<ServiceRequest[]> {
  const [requestsResult, viewResult] = await Promise.all([
    client.from('service_requests').select('*').order('created_at', { ascending: false }),
    client.from('support_items_view').select('*').not('request_id', 'is', null),
  ]);

  if (requestsResult.error) throw requestsResult.error;
  if (viewResult.error) throw viewResult.error;

  const enrichByRequestId = new Map<string, SupportItemViewRow>();
  for (const row of (viewResult.data ?? []) as SupportItemViewRow[]) {
    const requestId = String(row.request_id);
    enrichByRequestId.set(requestId, row);
  }

  const rows = (requestsResult.data ?? []) as Record<string, unknown>[];
  const requestIds = rows.map((r) => String(r.id));
  const activitiesByRequest = await fetchAllActivities(client, requestIds);

  return rows.map((row) => {
    const requestId = String(row.id);
    const enriched = enrichByRequestId.get(requestId);
    const activities = activitiesByRequest.get(requestId) ?? [];

    if (enriched) {
      return mapSupportViewRowToServiceRequest(enriched, row, activities);
    }

    return mapDbRowToServiceRequest(row, activities);
  });
}

export const adminRequestsBoardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminRequestBoard: builder.query<ServiceRequest[], void>({
      query: () => ({
        handler: (client) => loadAdminRequestBoard(client),
      }),
      providesTags: ['Requests'],
    }),
  }),
});

export const { useGetAdminRequestBoardQuery } = adminRequestsBoardApi;

export { loadAdminRequestBoard, fetchActivitiesForRequest, fetchPlanMap };
