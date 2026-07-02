import type { RequestActivity, ServiceRequest } from '@prime/types';

import { baseApi } from './baseApi';
import { getOfficerIdForUser, mapRequest, mapRequestActivity } from './mappers';
import type { TypedSupabaseClient } from './supabase';

async function attachActivities(client: TypedSupabaseClient, requests: Record<string, unknown>[]): Promise<void> {
  for (const request of requests) {
    const { data: activities } = await client
      .from('request_activities')
      .select('*')
      .eq('request_id', request.id as string)
      .order('created_at', { ascending: true });
    request.activities = activities ?? [];
  }
}

export const requestsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyRequests: builder.query<ServiceRequest[], string>({
      query: (userId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('service_requests')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
          if (error) throw error;
          const rows = (data ?? []) as Record<string, unknown>[];
          await attachActivities(client, rows);
          return rows.map(mapRequest);
        },
      }),
      providesTags: ['Requests'],
    }),

    getAllRequests: builder.query<ServiceRequest[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('service_requests')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) throw error;
          const rows = (data ?? []) as Record<string, unknown>[];
          await attachActivities(client, rows);
          return rows.map(mapRequest);
        },
      }),
      providesTags: ['Requests'],
    }),

    getAssignedRequests: builder.query<ServiceRequest[], string | void>({
      query: (userId) => ({
        handler: async (client) => {
          let query = client.from('service_requests').select('*').order('priority', { ascending: true });
          if (userId) {
            const officerId = await getOfficerIdForUser(client, userId);
            if (officerId) query = query.eq('officer_id', officerId);
          }
          const { data, error } = await query;
          if (error) throw error;
          const rows = (data ?? []) as Record<string, unknown>[];
          await attachActivities(client, rows);
          return rows.map(mapRequest);
        },
      }),
      providesTags: ['Requests'],
    }),

    getAvailableRequests: builder.query<ServiceRequest[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('service_requests')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) throw error;
          const rows = ((data ?? []) as Record<string, unknown>[]).filter(
            (row) => !row.officer_id || row.status === 'pending',
          );
          await attachActivities(client, rows);
          return rows.map(mapRequest);
        },
      }),
      providesTags: ['Requests'],
    }),

    getRequestActivities: builder.query<RequestActivity[], string>({
      query: (requestId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('request_activities')
            .select('*')
            .eq('request_id', requestId)
            .order('created_at', { ascending: true });
          if (error) throw error;
          return (data ?? []).map((row) => mapRequestActivity(row as Record<string, unknown>));
        },
      }),
      providesTags: ['Requests'],
    }),

    createRequest: builder.mutation<
      ServiceRequest,
      {
        userId: string;
        requestType: string;
        address: string;
        description?: string;
        priority?: string;
        planId?: string;
        userName?: string;
        userEmail?: string;
        userPhone?: string;
        city?: string;
        notes?: string;
        photoUrls?: string[];
      }
    >({
      query: (body) => ({
        handler: async (client) => {
          const now = new Date().toISOString();
          const insertData: Record<string, unknown> = {
            user_id: body.userId,
            type: body.requestType,
            request_type: body.requestType,
            priority: body.priority ?? 'P2',
            notes: body.notes,
            description: body.description ?? body.notes ?? '',
            user_name: body.userName,
            user_email: body.userEmail,
            user_phone: body.userPhone,
            city: body.city,
            address: body.address,
            photo_urls: body.photoUrls ?? [],
            status: 'pending',
            created_at: now,
            updated_at: now,
          };
          if (body.planId) insertData.plan_id = body.planId;

          const { data, error } = await client.from('service_requests').insert(insertData).select().single();
          if (error) throw error;

          return mapRequest(data as Record<string, unknown>);
        },
      }),
      invalidatesTags: ['Requests'],
    }),

    updateRequest: builder.mutation<void, { id: string; updates: Record<string, unknown> }>({
      query: ({ id, updates }) => ({
        handler: async (client) => {
          const { error } = await client
            .from('service_requests')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Requests'],
    }),

    updateRequestStatus: builder.mutation<
      void,
      { id: string; status: string; note?: string; officerId?: string; officerName?: string; latitude?: number; longitude?: number }
    >({
      query: ({ id, status, note, officerId, officerName, latitude, longitude }) => ({
        handler: async (client) => {
          const now = new Date().toISOString();
          const updates: Record<string, unknown> = { status, updated_at: now };
          if (status === 'completed') updates.completed_at = now;

          const { error } = await client.from('service_requests').update(updates).eq('id', id);
          if (error) throw error;

          if (note) {
            await client.from('request_activities').insert({
              request_id: id,
              officer_id: officerId,
              actor_name: officerName ?? 'Officer',
              action: 'note_added',
              note,
            });
          }
        },
      }),
      invalidatesTags: ['Requests'],
    }),

    assignRequest: builder.mutation<void, { id: string; officerId: string; officerName?: string; priority?: string }>({
      query: ({ id, officerId, officerName, priority }) => ({
        handler: async (client) => {
          const now = new Date().toISOString();
          const { error } = await client
            .from('service_requests')
            .update({
              officer_id: officerId,
              officer_name: officerName,
              assigned_at: now,
              status: 'assigned',
              priority: priority ?? 'P2',
              updated_at: now,
            })
            .eq('id', id);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Requests'],
    }),

    selfAssignRequest: builder.mutation<void, { requestId: string; officerId: string; officerName: string }>({
      query: ({ requestId, officerId, officerName }) => ({
        handler: async (client) => {
          const { data: active } = await client
            .from('service_requests')
            .select('id')
            .eq('officer_id', officerId)
            .neq('status', 'completed')
            .neq('status', 'cancelled');
          if ((active ?? []).length >= 3) {
            throw new Error('You already have 3 active requests. Please complete one before picking more.');
          }

          const now = new Date().toISOString();
          const { error } = await client
            .from('service_requests')
            .update({
              officer_id: officerId,
              officer_name: officerName,
              assigned_at: now,
              status: 'assigned',
              updated_at: now,
            })
            .eq('id', requestId);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Requests'],
    }),

    addRequestActivity: builder.mutation<
      void,
      { requestId: string; action: string; officerName: string; notes?: string; latitude?: number; longitude?: number }
    >({
      query: (body) => ({
        handler: async (client) => {
          const { error } = await client.from('request_activities').insert({
            request_id: body.requestId,
            actor_name: body.officerName,
            action: body.action === 'Note added' ? 'note_added' : body.action.toLowerCase().replace(/\s+/g, '_'),
            note: body.notes ?? body.action,
          });
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Requests'],
    }),

    escalateRequest: builder.mutation<void, string>({
      query: (id) => ({
        handler: async (client) => {
          const { error } = await client
            .from('service_requests')
            .update({ is_escalated: true, priority: 'P0' })
            .eq('id', id);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Requests'],
    }),
  }),
});

export const {
  useGetMyRequestsQuery,
  useGetAllRequestsQuery,
  useGetAssignedRequestsQuery,
  useGetAvailableRequestsQuery,
  useGetRequestActivitiesQuery,
  useCreateRequestMutation,
  useUpdateRequestMutation,
  useUpdateRequestStatusMutation,
  useAssignRequestMutation,
  useSelfAssignRequestMutation,
  useAddRequestActivityMutation,
  useEscalateRequestMutation,
} = requestsApi;
