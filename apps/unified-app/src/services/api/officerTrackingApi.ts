import { format } from 'date-fns';

import type {
  ActivityStats,
  LocationHistoryPoint,
  OfficerDailyActivity,
  OfficerDwell,
  OfficerLocation,
  TimeRange,
} from '@/types/map';
import { TIME_RANGES } from '@/types/map';
import { computeActivityStats } from '@/utils/activityComputer';
import { getOfficerColor, getOfficerInitials } from '@/constants/mapTheme';

import { baseApi } from './baseApi';
import type { TypedSupabaseClient } from './supabase';

const IST_OFFSET = '+05:30';

function buildTimeRangeISO(dateStr: string, timeRange: TimeRange): { startISO: string; endISO: string } {
  const { start, end } = TIME_RANGES[timeRange];
  const startHour = String(start).padStart(2, '0');
  const endHour = String(end).padStart(2, '0');
  return {
    startISO: `${dateStr}T${startHour}:00:00${IST_OFFSET}`,
    endISO: `${dateStr}T${endHour}:00:00${IST_OFFSET}`,
  };
}

type DbOfficerLocationRow = {
  id: string;
  officer_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  battery_level: number | null;
  is_online: boolean;
  is_moving: boolean;
  last_seen_at: string;
  updated_at: string;
  officers?:
    | {
        id: string;
        full_name?: string | null;
        users?: { name?: string; email?: string } | { name?: string; email?: string }[] | null;
      }
    | Array<{
        id: string;
        full_name?: string | null;
        users?: { name?: string; email?: string } | null;
      }>
    | null;
};

function normalizeOfficerEmbed(embed: DbOfficerLocationRow['officers']): {
  id: string;
  full_name?: string | null;
  users?: { name?: string; email?: string } | { name?: string; email?: string }[] | null;
} | null {
  if (!embed) return null;
  if (Array.isArray(embed)) return embed[0] ?? null;
  return embed;
}

function mapOfficerLocationRow(row: DbOfficerLocationRow, index: number): OfficerLocation {
  const officer = normalizeOfficerEmbed(row.officers);
  const usersRaw = officer?.users;
  const users = Array.isArray(usersRaw) ? usersRaw[0] : usersRaw;
  const name = officer?.full_name ?? users?.name ?? 'Officer';
  return {
    id: row.id,
    officer_id: row.officer_id,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    accuracy: row.accuracy,
    altitude: row.altitude,
    heading: row.heading,
    speed: row.speed,
    battery_level: row.battery_level,
    is_online: row.is_online,
    is_moving: row.is_moving,
    last_seen_at: row.last_seen_at,
    updated_at: row.updated_at,
    officer: {
      id: officer?.id ?? row.officer_id,
      name,
      email: users?.email ?? '',
      avatar_color: getOfficerColor(name, index),
      initials: getOfficerInitials(name),
    },
  };
}

function mapHistoryRow(row: Record<string, unknown>): LocationHistoryPoint {
  return {
    id: row.id as string,
    officer_id: row.officer_id as string,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    accuracy: row.accuracy != null ? Number(row.accuracy) : null,
    heading: row.heading != null ? Number(row.heading) : null,
    speed: row.speed != null ? Number(row.speed) : null,
    is_moving: Boolean(row.is_moving ?? true),
    recorded_at: row.recorded_at as string,
  };
}

async function fetchLocationHistoryPoints(
  client: TypedSupabaseClient,
  officerId: string,
  startISO: string,
  endISO: string,
): Promise<LocationHistoryPoint[]> {
  const extended = await client
    .from('officer_location_events')
    .select(
      'id, officer_id, latitude, longitude, accuracy, heading, speed, is_moving, recorded_at',
    )
    .eq('officer_id', officerId)
    .gte('recorded_at', startISO)
    .lt('recorded_at', endISO)
    .order('recorded_at', { ascending: true })
    .limit(5000);

  if (!extended.error && extended.data) {
    return extended.data.map((row) => mapHistoryRow(row as Record<string, unknown>));
  }

  const basic = await client
    .from('officer_location_events')
    .select('id, officer_id, latitude, longitude, accuracy, recorded_at')
    .eq('officer_id', officerId)
    .gte('recorded_at', startISO)
    .lt('recorded_at', endISO)
    .order('recorded_at', { ascending: true })
    .limit(5000);

  if (basic.error) throw basic.error;
  return (basic.data ?? []).map((row) => mapHistoryRow(row as Record<string, unknown>));
}

export const officerTrackingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTrackingOfficerLocations: builder.query<OfficerLocation[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('officer_locations')
            .select(
              `
              id, officer_id, latitude, longitude, accuracy, altitude,
              heading, speed, battery_level, is_online, is_moving,
              last_seen_at, updated_at,
              officers(id, full_name)
            `,
            )
            .order('updated_at', { ascending: false });

          if (!error && data) {
            return data.map((row, i) =>
              mapOfficerLocationRow(row as unknown as DbOfficerLocationRow, i),
            );
          }

          // Fallback when officer_locations table is missing or empty — use officers live cols
          const { data: officers, error: officersError } = await client
            .from('officers')
            .select('id, full_name, current_latitude, current_longitude, last_location_update, availability_status')
            .not('current_latitude', 'is', null)
            .not('current_longitude', 'is', null);

          if (officersError) throw officersError;

          return (officers ?? []).map((row, i) => {
            const name = (row.full_name as string | null) ?? 'Officer';
            const officerId = row.id as string;
            const lastSeen =
              (row.last_location_update as string | null) ?? new Date().toISOString();
            return {
              id: officerId,
              officer_id: officerId,
              latitude: Number(row.current_latitude),
              longitude: Number(row.current_longitude),
              accuracy: null,
              altitude: null,
              heading: null,
              speed: null,
              battery_level: null,
              is_online: row.availability_status !== 'offline',
              is_moving: false,
              last_seen_at: lastSeen,
              updated_at: lastSeen,
              officer: {
                id: officerId,
                name,
                email: '',
                avatar_color: getOfficerColor(name, i),
                initials: getOfficerInitials(name),
              },
            } satisfies OfficerLocation;
          });
        },
      }),
      providesTags: ['Map', 'Officers'],
    }),

    getLocationHistory: builder.query<
      LocationHistoryPoint[],
      { officerId: string; date: string; timeRange: TimeRange }
    >({
      query: ({ officerId, date, timeRange }) => ({
        handler: async (client) => {
          const { startISO, endISO } = buildTimeRangeISO(date, timeRange);
          return fetchLocationHistoryPoints(client, officerId, startISO, endISO);
        },
      }),
      providesTags: (_r, _e, arg) => [{ type: 'Map', id: `history-${arg.officerId}` }],
    }),

    getLocationHistoryBatch: builder.query<
      Record<string, LocationHistoryPoint[]>,
      { officerIds: string[]; date: string; timeRange: TimeRange }
    >({
      async queryFn({ officerIds, date, timeRange }, _api, _extra, baseQuery) {
        if (officerIds.length === 0) return { data: {} };

        const record: Record<string, LocationHistoryPoint[]> = {};

        for (const officerId of officerIds) {
          const result = await baseQuery({
            handler: async (client) => {
              const { startISO, endISO } = buildTimeRangeISO(date, timeRange);
              return fetchLocationHistoryPoints(client, officerId, startISO, endISO);
            },
          });

          if (result.error) return { error: result.error };
          record[officerId] = (result.data ?? []) as LocationHistoryPoint[];
        }

        return { data: record };
      },
      providesTags: ['Map'],
    }),

    getOfficerDwells: builder.query<
      OfficerDwell[],
      { officerId?: string; date: string }
    >({
      query: ({ officerId, date }) => ({
        handler: async (client) => {
          try {
            let q = client
              .from('officer_dwells')
              .select('*')
              .eq('date', date)
              .order('arrived_at', { ascending: true });
            if (officerId) q = q.eq('officer_id', officerId);
            const { data, error } = await q;
            if (error) {
              // Table may not exist until migration is applied
              if (error.code === '42P01' || error.message?.includes('officer_dwells')) {
                return [];
              }
              throw error;
            }
            return (data ?? []).map((row) => ({
              id: row.id as string,
              officer_id: row.officer_id as string,
              latitude: Number(row.latitude),
              longitude: Number(row.longitude),
              radius_metres: Number(row.radius_metres ?? 50),
              arrived_at: row.arrived_at as string,
              departed_at: (row.departed_at as string | null) ?? null,
              duration_minutes: row.duration_minutes != null ? Number(row.duration_minutes) : null,
              address: (row.address as string | null) ?? null,
              date: row.date as string,
            }));
          } catch {
            return [];
          }
        },
      }),
      providesTags: ['Map'],
    }),

    getDailyActivity: builder.query<
      OfficerDailyActivity | null,
      { officerId: string; date: string }
    >({
      query: ({ officerId, date }) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('officer_daily_activity')
            .select('*')
            .eq('officer_id', officerId)
            .eq('date', date)
            .maybeSingle();
          if (error) throw error;
          if (!data) return null;
          return {
            id: data.id as string,
            officer_id: data.officer_id as string,
            date: data.date as string,
            total_distance_km: Number(data.total_distance_km ?? 0),
            total_time_active_minutes: Number(data.total_time_active_minutes ?? 0),
            total_stops: Number(data.total_stops ?? 0),
            avg_speed_kmh: Number(data.avg_speed_kmh ?? 0),
            max_speed_kmh: Number(data.max_speed_kmh ?? 0),
            first_ping_at: (data.first_ping_at as string | null) ?? null,
            last_ping_at: (data.last_ping_at as string | null) ?? null,
            total_pings: Number(data.total_pings ?? 0),
          };
        },
      }),
      providesTags: (_r, _e, arg) => [{ type: 'Map', id: `activity-${arg.officerId}` }],
    }),

    getOfficerActivityStats: builder.query<
      ActivityStats,
      { officerId: string; date: string; timeRange: TimeRange }
    >({
      async queryFn({ officerId, date, timeRange }, _api, _extra, baseQuery) {
        const dailyResult = await baseQuery({
          handler: async (client) => {
            const { data } = await client
              .from('officer_daily_activity')
              .select('*')
              .eq('officer_id', officerId)
              .eq('date', date)
              .maybeSingle();
            return data;
          },
        });

        if (
          dailyResult.data &&
          timeRange === 'all_day' &&
          typeof dailyResult.data === 'object' &&
          dailyResult.data !== null
        ) {
          const d = dailyResult.data as Record<string, unknown>;
          return {
            data: {
              distance_km: Number(d.total_distance_km ?? 0),
              time_active_minutes: Number(d.total_time_active_minutes ?? 0),
              stops: Number(d.total_stops ?? 0),
              avg_speed_kmh: Number(d.avg_speed_kmh ?? 0),
              max_speed_kmh: Number(d.max_speed_kmh ?? 0),
              first_ping_at: (d.first_ping_at as string | null) ?? null,
              last_ping_at: (d.last_ping_at as string | null) ?? null,
            },
          };
        }

        const historyResult = await baseQuery({
          handler: async (client) => {
            const { startISO, endISO } = buildTimeRangeISO(date, timeRange);
            const { data, error } = await client
              .from('officer_location_events')
              .select(
                'id, officer_id, latitude, longitude, accuracy, heading, speed, is_moving, recorded_at',
              )
              .eq('officer_id', officerId)
              .gte('recorded_at', startISO)
              .lt('recorded_at', endISO)
              .order('recorded_at', { ascending: true })
              .limit(5000);
            if (error) throw error;
            return (data ?? []).map((row) => mapHistoryRow(row as Record<string, unknown>));
          },
        });

        if (historyResult.error) {
          return { error: historyResult.error };
        }

        const points = (historyResult.data ?? []) as LocationHistoryPoint[];
        return { data: computeActivityStats(points) };
      },
      providesTags: (_r, _e, arg) => [{ type: 'Map', id: `stats-${arg.officerId}` }],
    }),

    insertGeofenceEvent: builder.mutation<
      void,
      {
        geofenceId: string;
        eventType: 'enter' | 'exit';
        latitude: number;
        longitude: number;
      }
    >({
      query: (body) => ({
        handler: async (client) => {
          const { data: session } = await client.auth.getSession();
          const userId = session.session?.user?.id;
          if (!userId) throw new Error('Not authenticated');

          const { data: officer } = await client
            .from('officers')
            .select('id')
            .or(`user_id.eq.${userId},auth_user_id.eq.${userId}`)
            .maybeSingle();
          if (!officer?.id) throw new Error('Officer not found');

          const { error } = await client.from('geofence_events').insert({
            officer_id: officer.id,
            geofence_id: body.geofenceId,
            event_type: body.eventType,
            latitude: body.latitude,
            longitude: body.longitude,
          });
          if (error) throw error;
        },
      }),
    }),
  }),
});

export const {
  useGetTrackingOfficerLocationsQuery,
  useGetLocationHistoryQuery,
  useGetLocationHistoryBatchQuery,
  useGetOfficerDwellsQuery,
  useGetDailyActivityQuery,
  useGetOfficerActivityStatsQuery,
  useInsertGeofenceEventMutation,
} = officerTrackingApi;

export function formatTrackingDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
