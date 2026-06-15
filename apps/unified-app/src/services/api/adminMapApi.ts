import type { MapOfficerPin, MapRequestPin } from '@/types/api/admin';

import { baseApi } from './baseApi';
import { OFFICER_USERS_NAME_EMBED } from './mappers';

export const adminMapApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLiveOfficerPins: builder.query<MapOfficerPin[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('officers')
            .select(
              `id, full_name, availability_status, current_latitude, current_longitude, ${OFFICER_USERS_NAME_EMBED}`,
            )
            .not('current_latitude', 'is', null)
            .not('current_longitude', 'is', null);
          if (error) throw error;
          return (data ?? []).map((row) => ({
            officerId: row.id as string,
            name:
              (row.full_name as string | null) ??
              (row.users as { name?: string })?.name ??
              'Officer',
            lat: Number(row.current_latitude),
            lng: Number(row.current_longitude),
            status: String(row.availability_status ?? 'offline'),
          }));
        },
      }),
      providesTags: ['Officers', 'Map'],
    }),

    getOpenRequestPins: builder.query<MapRequestPin[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('service_requests')
            .select('*')
            .neq('status', 'resolved')
            .neq('status', 'cancelled');
          if (error) throw error;
          return (data ?? []).map((row, i) => ({
            requestId: row.id as string,
            type: String(row.type ?? row.request_type ?? 'request'),
            lat: Number(row.latitude ?? row.location_lat ?? 28.6139 + i * 0.02),
            lng: Number(row.longitude ?? row.location_lng ?? 77.209 + i * 0.02),
            status: row.status as string,
          }));
        },
      }),
      providesTags: ['Requests', 'Map'],
    }),
  }),
});

export const { useGetLiveOfficerPinsQuery, useGetOpenRequestPinsQuery } = adminMapApi;
