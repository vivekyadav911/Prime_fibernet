import type {
  InventoryItem,
  LeaveRequest,
  Officer,
  RequestActivity,
  ServiceRequest,
  Shift,
} from '@prime/types';

import { baseApi } from './baseApi';
import {
  getOfficerIdForUser,
  mapRequest,
  mapRequestActivity,
  OFFICER_USERS_EMBED,
} from './mappers';

export type OfficerRequestDetail = ServiceRequest & {
  userName?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  photoUrls: string[];
  activities: RequestActivity[];
};

function mapOfficerRequestDetail(row: Record<string, unknown>, activities: Record<string, unknown>[]): OfficerRequestDetail {
  const base = mapRequest(row);
  const photos = activities.flatMap((a) => {
    const urls = a.photo_urls;
    return Array.isArray(urls) ? (urls as string[]) : [];
  });

  return {
    ...base,
    userName: (row.user_name as string) ?? null,
    userEmail: (row.user_email as string) ?? null,
    userPhone: (row.user_phone as string) ?? null,
    latitude: row.latitude != null ? Number(row.latitude) : row.location_lat != null ? Number(row.location_lat) : null,
    longitude: row.longitude != null ? Number(row.longitude) : row.location_lng != null ? Number(row.location_lng) : null,
    photoUrls: photos,
    activities: activities.map((a) => mapRequestActivity(a)),
  };
}

export type OfficerDashboardStats = {
  newRequests: number;
  activeRequests: number;
  resolvedToday: number;
  collectionsToday: number;
};

function mapDashboardStats(raw: Record<string, unknown>): OfficerDashboardStats {
  return {
    newRequests: Number(raw.new_requests ?? 0),
    activeRequests: Number(raw.active_requests ?? 0),
    resolvedToday: Number(raw.resolved_today ?? 0),
    collectionsToday: Number(raw.collections_today ?? 0),
  };
}

export const officersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOfficerDashboardStats: builder.query<OfficerDashboardStats, void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.rpc('get_officer_dashboard_stats');
          if (error) throw error;
          return mapDashboardStats((data ?? {}) as Record<string, unknown>);
        },
      }),
      providesTags: ['Requests', 'Payments'],
    }),

    getRequestDetail: builder.query<OfficerRequestDetail, string>({
      query: (requestId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('service_requests')
            .select('*')
            .eq('id', requestId)
            .maybeSingle();
          if (error) throw error;
          if (!data) throw new Error('Request not found');

          const { data: activities, error: actError } = await client
            .from('request_activities')
            .select('*')
            .eq('request_id', requestId)
            .order('timestamp', { ascending: true });
          if (actError) throw actError;

          return mapOfficerRequestDetail(
            data as Record<string, unknown>,
            (activities ?? []) as Record<string, unknown>[],
          );
        },
      }),
      providesTags: (_result, _error, requestId) => [{ type: 'Requests', id: requestId }],
    }),

    addActivityNote: builder.mutation<
      void,
      {
        requestId: string;
        officerName: string;
        note: string;
        photoUrls?: string[];
        latitude?: number;
        longitude?: number;
      }
    >({
      query: (body) => ({
        handler: async (client) => {
          const { error } = await client.from('request_activities').insert({
            request_id: body.requestId,
            actor_name: body.officerName,
            action: 'Activity note',
            notes: body.note,
            note: body.note,
            photo_urls: body.photoUrls ?? [],
            lat: body.latitude,
            lng: body.longitude,
            timestamp: new Date().toISOString(),
          });
          if (error) throw error;
        },
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Requests', id: arg.requestId }, 'Requests'],
    }),

    getOfficers: builder.query<Officer[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.from('officers').select(`*, ${OFFICER_USERS_EMBED}`);
          if (error) throw error;
          return (data ?? []).map((row) => ({
            id: row.id as string,
            userId: (row.user_id as string) ?? null,
            name: (row.users as { name?: string })?.name ?? String(row.name ?? 'Officer'),
            email: (row.users as { email?: string })?.email ?? String(row.email ?? ''),
            region: (row.region as string) ?? null,
            availabilityStatus: String(row.availability_status ?? 'offline'),
          }));
        },
      }),
      providesTags: ['Officers'],
    }),

    inviteOfficer: builder.mutation<
      void,
      { email: string; name: string; phone: string; region: string }
    >({
      query: (body) => ({
        handler: async (client) => {
          const { error } = await client.functions.invoke('provision-officer-auth', { body });
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Officers'],
    }),

    updateOfficer: builder.mutation<
      void,
      { id: string; region?: string; availabilityStatus?: string }
    >({
      query: ({ id, region, availabilityStatus }) => ({
        handler: async (client) => {
          const { error } = await client
            .from('officers')
            .update({ region, availability_status: availabilityStatus })
            .eq('id', id);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Officers'],
    }),

    clockIn: builder.mutation<void, { userId: string; latitude: number; longitude: number }>({
      query: ({ userId, latitude, longitude }) => ({
        handler: async (client) => {
          const officerId = await getOfficerIdForUser(client, userId);
          if (!officerId) throw new Error('Officer profile not found');
          const { error } = await client.from('shifts').insert({
            officer_id: officerId,
            shift_date: new Date().toISOString().slice(0, 10),
            check_in_time: new Date().toISOString(),
            status: 'active',
            location: `POINT(${longitude} ${latitude})`,
          });
          if (error) throw error;
          await client.from('officers').update({ availability_status: 'available' }).eq('id', officerId);
        },
      }),
      invalidatesTags: ['Shifts', 'Officers'],
    }),

    clockOut: builder.mutation<void, { userId: string; shiftId?: string }>({
      query: ({ userId, shiftId }) => ({
        handler: async (client) => {
          const officerId = await getOfficerIdForUser(client, userId);
          if (!officerId) throw new Error('Officer profile not found');

          let targetShiftId = shiftId;
          if (!targetShiftId) {
            const { data: active } = await client
              .from('shifts')
              .select('id')
              .eq('officer_id', officerId)
              .eq('status', 'active')
              .order('check_in_time', { ascending: false })
              .limit(1)
              .maybeSingle();
            targetShiftId = active?.id as string | undefined;
          }
          if (!targetShiftId) throw new Error('No active shift found');

          const { error } = await client
            .from('shifts')
            .update({ check_out_time: new Date().toISOString(), status: 'completed' })
            .eq('id', targetShiftId);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Shifts'],
    }),

    getActiveShift: builder.query<Shift | null, string>({
      query: (userId) => ({
        handler: async (client) => {
          const officerId = await getOfficerIdForUser(client, userId);
          if (!officerId) return null;
          const { data, error } = await client
            .from('shifts')
            .select('*')
            .eq('officer_id', officerId)
            .eq('status', 'active')
            .order('check_in_time', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (error) throw error;
          if (!data) return null;
          return {
            id: data.id as string,
            officerId: data.officer_id as string,
            shiftDate: data.shift_date as string,
            status: data.status as string,
            checkInTime: (data.check_in_time as string) ?? null,
            checkOutTime: (data.check_out_time as string) ?? null,
          };
        },
      }),
      providesTags: ['Shifts'],
    }),

    getShiftHistory: builder.query<Shift[], string>({
      query: (userId) => ({
        handler: async (client) => {
          const officerId = await getOfficerIdForUser(client, userId);
          if (!officerId) return [];
          const { data, error } = await client
            .from('shifts')
            .select('*')
            .eq('officer_id', officerId)
            .order('shift_date', { ascending: false })
            .limit(30);
          if (error) throw error;
          return (data ?? []).map((row) => ({
            id: row.id as string,
            officerId: row.officer_id as string,
            shiftDate: row.shift_date as string,
            status: row.status as string,
            checkInTime: (row.check_in_time as string) ?? null,
            checkOutTime: (row.check_out_time as string) ?? null,
          }));
        },
      }),
      providesTags: ['Shifts'],
    }),

    getShiftSchedules: builder.query<
      Record<string, unknown>[],
      { officerId: string; startDate?: string; endDate?: string; status?: string }
    >({
      query: ({ officerId, startDate, endDate, status }) => ({
        handler: async (client) => {
          let query = client.from('shift_schedules').select('*').eq('officer_id', officerId);
          if (startDate) query = query.gte('shift_date', startDate);
          if (endDate) query = query.lte('shift_date', endDate);
          if (status) query = query.eq('status', status);
          const { data, error } = await query.order('shift_date', { ascending: true });
          if (error) throw error;
          return (data ?? []) as Record<string, unknown>[];
        },
      }),
      providesTags: ['Shifts'],
    }),

    requestShift: builder.mutation<
      Record<string, unknown>,
      {
        officerId: string;
        shiftDate: string;
        startTime: string;
        endTime: string;
        requiredLocationId?: string;
        notes?: string;
      }
    >({
      query: (body) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('shift_schedules')
            .insert({
              officer_id: body.officerId,
              shift_date: body.shiftDate,
              start_time: body.startTime,
              end_time: body.endTime,
              required_location_id: body.requiredLocationId,
              officer_notes: body.notes,
              status: 'pending',
            })
            .select()
            .single();
          if (error) throw error;
          return data as Record<string, unknown>;
        },
      }),
      invalidatesTags: ['Shifts'],
    }),

    getInventory: builder.query<InventoryItem[], string>({
      query: (userId) => ({
        handler: async (client) => {
          const officerId = await getOfficerIdForUser(client, userId);
          if (!officerId) return [];
          const { data: assignments, error: assignError } = await client
            .from('inventory_assignments')
            .select('item_id')
            .eq('assigned_to_id', officerId)
            .eq('status', 'assigned');
          if (assignError) throw assignError;
          const itemIds = (assignments ?? []).map((a) => a.item_id).filter(Boolean) as string[];
          if (!itemIds.length) return [];
          const { data, error } = await client.from('inventory_items').select('*').in('id', itemIds);
          if (error) throw error;
          return (data ?? []).map((row) => ({
            id: row.id as string,
            name: row.name as string,
            sku: (row.sku as string) ?? null,
            category: (row.category as string) ?? null,
            quantity: Number(row.quantity ?? 0),
            status: String(row.status ?? 'available'),
          }));
        },
      }),
      providesTags: ['Inventory'],
    }),

    requestInventoryItem: builder.mutation<
      void,
      { officerId: string; itemId: string; quantity: number; notes?: string }
    >({
      query: (body) => ({
        handler: async (client) => {
          const { error } = await client.from('inventory_requests').insert({
            officer_id: body.officerId,
            item_id: body.itemId,
            quantity: body.quantity,
            notes: body.notes,
            status: 'pending',
            created_at: new Date().toISOString(),
          });
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Inventory'],
    }),

    getPayslips: builder.query<
      { id: string; payPeriodLabel: string; netPay: number; status: string; pdfUrl: string | null }[],
      string
    >({
      query: (userId) => ({
        handler: async (client) => {
          const officerId = await getOfficerIdForUser(client, userId);
          if (!officerId) return [];
          const { data, error } = await client
            .from('payslips')
            .select('id, pay_period_label, net_pay, status, generated_pdf_url')
            .eq('officer_id', officerId)
            .in('status', ['approved', 'paid'])
            .order('pay_period_start', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => ({
            id: row.id as string,
            payPeriodLabel: (row.pay_period_label as string) ?? '',
            netPay: Number(row.net_pay),
            status: row.status as string,
            pdfUrl: (row.generated_pdf_url as string) ?? null,
          }));
        },
      }),
      providesTags: ['Payslips'],
    }),

    createLeaveRequest: builder.mutation<
      void,
      { userId: string; leaveType: string; startDate: string; endDate: string; reason: string }
    >({
      query: ({ userId, leaveType, startDate, endDate, reason }) => ({
        handler: async (client) => {
          const officerId = await getOfficerIdForUser(client, userId);
          if (!officerId) throw new Error('Officer profile not found');
          const { error } = await client.from('leave_requests').insert({
            officer_id: officerId,
            leave_type: leaveType,
            start_date: startDate,
            end_date: endDate,
            reason,
            status: 'pending',
          });
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Leave'],
    }),

    recordPayment: builder.mutation<
      { paymentId: string },
      {
        officerUserId: string;
        userId: string;
        customerName: string;
        amount: number;
        paymentMethod: 'cash' | 'upi' | 'credit_card';
        referenceNumber?: string;
        planName?: string;
        latitude?: number;
        longitude?: number;
      }
    >({
      query: (body) => ({
        handler: async (client) => {
          const officerId = await getOfficerIdForUser(client, body.officerUserId);
          if (!officerId) throw new Error('Officer profile not found');
          const now = new Date().toISOString();
          const location =
            body.latitude != null && body.longitude != null
              ? `POINT(${body.longitude} ${body.latitude})`
              : null;
          const { data, error } = await client
            .from('user_payments')
            .insert({
              user_id: body.userId,
              user_name: body.customerName,
              amount: body.amount,
              payment_method: body.paymentMethod,
              payment_status: 'success',
              gateway_transaction_id: body.referenceNumber ?? null,
              upi_reference_id: body.referenceNumber ?? null,
              plan_name: body.planName ?? null,
              collected_by_officer_id: officerId,
              collection_location: location,
              collection_timestamp: now,
              created_by: 'officer',
              created_at: now,
              updated_at: now,
            })
            .select('id')
            .single();
          if (error) throw error;
          return { paymentId: data.id as string };
        },
      }),
      invalidatesTags: ['Payments'],
    }),

    getLeaveRequests: builder.query<LeaveRequest[], string>({
      query: (userId) => ({
        handler: async (client) => {
          const officerId = await getOfficerIdForUser(client, userId);
          if (!officerId) return [];
          const { data, error } = await client
            .from('leave_requests')
            .select('*')
            .eq('officer_id', officerId)
            .order('created_at', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => ({
            id: row.id as string,
            officerId: row.officer_id as string,
            leaveType: row.leave_type as string,
            startDate: row.start_date as string,
            endDate: row.end_date as string,
            reason: row.reason as string,
            status: row.status as string,
          }));
        },
      }),
      providesTags: ['Leave'],
    }),
  }),
});

export const {
  useGetOfficerDashboardStatsQuery,
  useGetRequestDetailQuery,
  useAddActivityNoteMutation,
  useGetOfficersQuery,
  useInviteOfficerMutation,
  useUpdateOfficerMutation,
  useClockInMutation,
  useClockOutMutation,
  useGetActiveShiftQuery,
  useGetShiftHistoryQuery,
  useGetShiftSchedulesQuery,
  useRequestShiftMutation,
  useGetInventoryQuery,
  useRequestInventoryItemMutation,
  useGetPayslipsQuery,
  useCreateLeaveRequestMutation,
  useGetLeaveRequestsQuery,
  useRecordPaymentMutation,
} = officersApi;
