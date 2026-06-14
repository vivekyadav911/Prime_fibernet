import { baseApi } from './baseApi';
import type { TypedSupabaseClient } from './supabase';
import type { ServiceRequest } from '@/types/requests';
import { mapDbRowToServiceRequest } from '@/utils/requestViewMappers';

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

  if (error) {
    const fallback = await client
      .from('request_activities')
      .select('*')
      .eq('request_id', requestId);
    return (fallback.data ?? []) as Record<string, unknown>[];
  }

  return (data ?? []) as Record<string, unknown>[];
}

async function loadAdminRequestBoard(client: TypedSupabaseClient): Promise<ServiceRequest[]> {
  const planMap = await fetchPlanMap(client);
  const { data, error } = await client
    .from('service_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as Record<string, unknown>[];
  const results: ServiceRequest[] = [];

  for (const row of rows) {
    const requestId = String(row.id);
    const activities = await fetchActivitiesForRequest(client, requestId);
    results.push(mapDbRowToServiceRequest(row, activities, planMap));
  }

  return results;
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
