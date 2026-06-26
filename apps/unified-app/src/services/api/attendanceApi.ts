import type {
  ApprovalRequest,
  ApprovalType,
  AttendanceRecord,
  AttendanceSummary,
  Coordinates,
  DbGeofenceRow,
  Geofence,
  GeofenceCreatePayload,
  LeaveBalance,
  LeaveRequestRecord,
  LeaveType,
  OfficerLiveLocation,
  ShiftDefinition,
} from '@/types/attendance';

import { baseApi } from './baseApi';
import {
  buildAttendanceSummary,
  getCurrentOfficerId,
  fetchApprovalRequestById,
  fetchApprovalRequests,
  mapAttendanceRow,
  mapGeofenceRow,
  mapLeaveBalanceRow,
  mapLeaveRow,
  mapLiveOfficerRow,
  mapShiftDefinitionRow,
} from './attendanceMappers';
import type { AttendanceReportData } from './attendanceMappers';
import { getOfficerIdForUser } from './mappers';

const GEOFENCE_SELECT = '*, geofence_officer_assignments(officer_id)';
const OFFICER_EMBED = 'full_name, profile_photo_url';
const ATTENDANCE_SELECT = `*, officers(${OFFICER_EMBED}), geofences(name)`;

export const attendanceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ─── Geofences (Admin) ───────────────────────────────────────────────────
    getGeofences: builder.query<Geofence[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('geofences')
            .select(GEOFENCE_SELECT)
            .order('created_at', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => mapGeofenceRow(row as never));
        },
      }),
      providesTags: ['Geofences'],
    }),

    getGeofence: builder.query<Geofence, string>({
      query: (id) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('geofences')
            .select(GEOFENCE_SELECT)
            .eq('id', id)
            .single();
          if (error) throw error;
          return mapGeofenceRow(data as never);
        },
      }),
      providesTags: (_r, _e, id) => [{ type: 'Geofences', id }],
    }),

    createGeofence: builder.mutation<Geofence, GeofenceCreatePayload>({
      query: (body) => ({
        handler: async (client) => {
          const { data: session } = await client.auth.getSession();
          const { data, error } = await client
            .from('geofences')
            .insert({
              name: body.name,
              address: body.address,
              city: body.city,
              state: body.state,
              geometry: body.geometry,
              created_by: session.session?.user?.id,
            })
            .select()
            .single();
          if (error) throw error;

          if (body.assignedOfficers.length > 0) {
            await client.from('geofence_officer_assignments').insert(
              body.assignedOfficers.map((officerId) => ({
                geofence_id: data.id,
                officer_id: officerId,
              })),
            );
          }

          const { data: full } = await client
            .from('geofences')
            .select(GEOFENCE_SELECT)
            .eq('id', data.id)
            .single();
          return mapGeofenceRow(full as never);
        },
      }),
      invalidatesTags: ['Geofences'],
    }),

    updateGeofence: builder.mutation<Geofence, { id: string; payload: Partial<GeofenceCreatePayload> & { isActive?: boolean } }>({
      query: ({ id, payload }) => ({
        handler: async (client) => {
          const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (payload.name) update.name = payload.name;
          if (payload.address) update.address = payload.address;
          if (payload.city) update.city = payload.city;
          if (payload.state) update.state = payload.state;
          if (payload.geometry) update.geometry = payload.geometry;
          if (payload.isActive != null) update.is_active = payload.isActive;

          const { error } = await client.from('geofences').update(update).eq('id', id);
          if (error) throw error;

          const { data, error: fetchError } = await client
            .from('geofences')
            .select(GEOFENCE_SELECT)
            .eq('id', id)
            .single();
          if (fetchError) throw fetchError;
          return mapGeofenceRow(data as never);
        },
      }),
      invalidatesTags: ['Geofences'],
    }),

    deleteGeofence: builder.mutation<void, string>({
      query: (id) => ({
        handler: async (client) => {
          const { error } = await client.from('geofences').delete().eq('id', id);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Geofences'],
    }),

    toggleGeofence: builder.mutation<void, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({
        handler: async (client) => {
          const { error } = await client
            .from('geofences')
            .update({ is_active: isActive, updated_at: new Date().toISOString() })
            .eq('id', id);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Geofences'],
    }),

    assignGeofenceOfficers: builder.mutation<void, { id: string; officerIds: string[] }>({
      query: ({ id, officerIds }) => ({
        handler: async (client) => {
          await client.from('geofence_officer_assignments').delete().eq('geofence_id', id);
          if (officerIds.length > 0) {
            const { error } = await client.from('geofence_officer_assignments').insert(
              officerIds.map((officerId) => ({ geofence_id: id, officer_id: officerId })),
            );
            if (error) throw error;
          }
        },
      }),
      invalidatesTags: ['Geofences'],
    }),

    // ─── Attendance (Admin) ──────────────────────────────────────────────────
    getAllAttendanceToday: builder.query<AttendanceRecord[], void>({
      query: () => ({
        handler: async (client) => {
          const today = new Date().toISOString().slice(0, 10);
          const { data, error } = await client
            .from('shifts')
            .select(ATTENDANCE_SELECT)
            .eq('shift_date', today)
            .order('check_in_time', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => mapAttendanceRow(row as never));
        },
      }),
      providesTags: ['Attendance'],
    }),

    getAdminAttendance: builder.query<
      AttendanceRecord[],
      { date?: string; officerId?: string; status?: string; page?: number }
    >({
      query: ({ date, officerId, status }) => ({
        handler: async (client) => {
          const targetDate = date ?? new Date().toISOString().slice(0, 10);
          let q = client.from('shifts').select(ATTENDANCE_SELECT).eq('shift_date', targetDate);
          if (officerId) q = q.eq('officer_id', officerId);
          if (status) q = q.eq('attendance_status', status);
          const { data, error } = await q.order('check_in_time', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => mapAttendanceRow(row as never));
        },
      }),
      providesTags: ['Attendance'],
    }),

    getOfficerAttendanceRecords: builder.query<
      AttendanceRecord[],
      { officerId: string; from?: string; to?: string }
    >({
      query: ({ officerId, from, to }) => ({
        handler: async (client) => {
          let q = client.from('shifts').select(ATTENDANCE_SELECT).eq('officer_id', officerId);
          if (from) q = q.gte('shift_date', from);
          if (to) q = q.lte('shift_date', to);
          const { data, error } = await q.order('shift_date', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => mapAttendanceRow(row as never));
        },
      }),
      providesTags: ['Attendance'],
    }),

    getAttendanceSummary: builder.query<
      AttendanceSummary,
      { officerId: string; month: number; year: number }
    >({
      query: ({ officerId, month, year }) => ({
        handler: async (client) => {
          const monthStr = String(month).padStart(2, '0');
          const from = `${year}-${monthStr}-01`;
          const to = `${year}-${monthStr}-31`;
          const { data, error } = await client
            .from('shifts')
            .select(ATTENDANCE_SELECT)
            .eq('officer_id', officerId)
            .gte('shift_date', from)
            .lte('shift_date', to);
          if (error) throw error;
          const records = (data ?? []).map((row) => mapAttendanceRow(row as never));
          return buildAttendanceSummary(officerId, month, year, records);
        },
      }),
      providesTags: ['Attendance'],
    }),

    attendanceOverride: builder.mutation<
      AttendanceRecord,
      {
        officerId: string;
        date: string;
        checkIn?: string;
        checkOut?: string;
        status: string;
        notes?: string;
      }
    >({
      query: (body) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('shifts')
            .upsert({
              officer_id: body.officerId,
              shift_date: body.date,
              check_in_time: body.checkIn,
              check_out_time: body.checkOut,
              attendance_status: body.status,
              check_in_method: 'admin_override',
              notes: body.notes,
              status: 'completed',
            })
            .select(ATTENDANCE_SELECT)
            .single();
          if (error) throw error;
          return mapAttendanceRow(data as never);
        },
      }),
      invalidatesTags: ['Attendance'],
    }),

    // ─── Approvals (Admin) ───────────────────────────────────────────────────
    getApprovalRequests: builder.query<
      ApprovalRequest[],
      { status?: string; page?: number }
    >({
      query: ({ status }) => ({
        handler: async (client) => fetchApprovalRequests(client, { status }),
      }),
      providesTags: ['Approvals'],
    }),

    reviewApproval: builder.mutation<
      ApprovalRequest,
      { id: string; action: 'approve' | 'reject'; notes?: string; reason?: string }
    >({
      query: ({ id, action, notes, reason }) => ({
        handler: async (client) => {
          const { error: rpcError } = await client.rpc('review_attendance_approval', {
            p_request_id: id,
            p_action: action,
            p_review_notes: action === 'approve' ? notes ?? null : reason ?? null,
          });
          if (rpcError) throw rpcError;

          return fetchApprovalRequestById(client, id);
        },
      }),
      invalidatesTags: ['Approvals', 'Attendance', 'Shifts', 'Map', 'Analytics'],
    }),

    // ─── Shifts (Admin) ──────────────────────────────────────────────────────
    getShiftDefinitions: builder.query<ShiftDefinition[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('shift_definitions')
            .select('*, shift_definition_officers(officer_id)')
            .order('name');
          if (error) throw error;
          return (data ?? []).map((row) => mapShiftDefinitionRow(row as never));
        },
      }),
      providesTags: ['ShiftDefinitions'],
    }),

    createShiftDefinition: builder.mutation<
      ShiftDefinition,
      Omit<ShiftDefinition, 'id' | 'assignedOfficers'> & { assignedOfficers: string[] }
    >({
      query: (body) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('shift_definitions')
            .insert({
              name: body.name,
              type: body.type,
              start_time: body.startTime,
              end_time: body.endTime,
              grace_minutes: body.graceMinutes,
              break_minutes: body.breakMinutes,
              overtime_threshold_minutes: body.overtimeThresholdMinutes,
              is_overnight: body.isOvernight,
            })
            .select()
            .single();
          if (error) throw error;

          if (body.assignedOfficers.length > 0) {
            await client.from('shift_definition_officers').insert(
              body.assignedOfficers.map((officerId) => ({
                shift_definition_id: data.id,
                officer_id: officerId,
              })),
            );
          }

          const { data: full } = await client
            .from('shift_definitions')
            .select('*, shift_definition_officers(officer_id)')
            .eq('id', data.id)
            .single();
          return mapShiftDefinitionRow(full as never);
        },
      }),
      invalidatesTags: ['ShiftDefinitions'],
    }),

    updateShiftDefinition: builder.mutation<
      ShiftDefinition,
      { id: string; payload: Partial<ShiftDefinition> }
    >({
      query: ({ id, payload }) => ({
        handler: async (client) => {
          const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (payload.name) update.name = payload.name;
          if (payload.type) update.type = payload.type;
          if (payload.startTime) update.start_time = payload.startTime;
          if (payload.endTime) update.end_time = payload.endTime;
          if (payload.graceMinutes != null) update.grace_minutes = payload.graceMinutes;
          if (payload.breakMinutes != null) update.break_minutes = payload.breakMinutes;
          if (payload.overtimeThresholdMinutes != null) {
            update.overtime_threshold_minutes = payload.overtimeThresholdMinutes;
          }
          if (payload.isOvernight != null) update.is_overnight = payload.isOvernight;

          const { error } = await client.from('shift_definitions').update(update).eq('id', id);
          if (error) throw error;

          const { data, error: fetchError } = await client
            .from('shift_definitions')
            .select('*, shift_definition_officers(officer_id)')
            .eq('id', id)
            .single();
          if (fetchError) throw fetchError;
          return mapShiftDefinitionRow(data as never);
        },
      }),
      invalidatesTags: ['ShiftDefinitions'],
    }),

    deleteShiftDefinition: builder.mutation<void, string>({
      query: (id) => ({
        handler: async (client) => {
          const { error } = await client.from('shift_definitions').delete().eq('id', id);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['ShiftDefinitions'],
    }),

    // ─── Leaves (Admin) ──────────────────────────────────────────────────────
    getAdminLeaveRequests: builder.query<
      LeaveRequestRecord[],
      { status?: string; officerId?: string }
    >({
      query: ({ status, officerId }) => ({
        handler: async (client) => {
          let q = client.from('leave_requests').select(`*, officers(${OFFICER_EMBED})`);
          if (status && status !== 'all') q = q.eq('status', status);
          if (officerId) q = q.eq('officer_id', officerId);
          const { data, error } = await q.order('created_at', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => mapLeaveRow(row as never));
        },
      }),
      providesTags: ['Leave'],
    }),

    reviewLeave: builder.mutation<
      LeaveRequestRecord,
      { id: string; action: 'approve' | 'reject'; notes?: string; reason?: string }
    >({
      query: ({ id, action, notes, reason }) => ({
        handler: async (client) => {
          const { data: session } = await client.auth.getSession();
          const { data, error } = await client
            .from('leave_requests')
            .update({
              status: action === 'approve' ? 'approved' : 'rejected',
              reviewed_by: session.session?.user?.id,
              reviewed_at: new Date().toISOString(),
              review_notes: action === 'approve' ? notes : reason,
            })
            .eq('id', id)
            .select(`*, officers(${OFFICER_EMBED})`)
            .single();
          if (error) throw error;
          return mapLeaveRow(data as never);
        },
      }),
      invalidatesTags: ['Leave'],
    }),

    // ─── Live Tracking (Admin) ───────────────────────────────────────────────
    getLiveOfficerLocations: builder.query<OfficerLiveLocation[], void>({
      query: () => ({
        handler: async (client) => {
          const today = new Date().toISOString().slice(0, 10);
          const [officersRes, shiftsRes] = await Promise.all([
            client
              .from('officers')
              .select(
                'id, full_name, profile_photo_url, current_latitude, current_longitude, last_location_update',
              )
              .not('current_latitude', 'is', null),
            client
              .from('shifts')
              .select('officer_id, status, check_in_time, check_out_time')
              .eq('shift_date', today)
              .eq('status', 'active'),
          ]);
          if (officersRes.error) throw officersRes.error;
          if (shiftsRes.error) throw shiftsRes.error;

          const activeByOfficer = new Map(
            (shiftsRes.data ?? []).map((shift) => [shift.officer_id as string, shift]),
          );

          return (officersRes.data ?? []).map((row) => {
            const active = activeByOfficer.get(row.id as string);
            return mapLiveOfficerRow({
              ...(row as Record<string, unknown>),
              active_shift_status: active?.status ?? null,
              active_shift_check_in: active?.check_in_time ?? null,
              active_shift_check_out: active?.check_out_time ?? null,
            });
          });
        },
      }),
      providesTags: ['Map'],
    }),

    // ─── Reports (Admin) ─────────────────────────────────────────────────────
    getAttendanceReports: builder.query<
      AttendanceReportData,
      { from?: string; to?: string; geofenceId?: string; officerId?: string }
    >({
      query: ({ from, to, officerId }) => ({
        handler: async (client) => {
          const fromDate = from ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
          const toDate = to ?? new Date().toISOString().slice(0, 10);
          let q = client.from('shifts').select(ATTENDANCE_SELECT).gte('shift_date', fromDate).lte('shift_date', toDate);
          if (officerId) q = q.eq('officer_id', officerId);
          const { data, error } = await q;
          if (error) throw error;
          const records = (data ?? []).map((row) => mapAttendanceRow(row as never));

          const byDate = new Map<string, { present: number; absent: number }>();
          for (const r of records) {
            const existing = byDate.get(r.date) ?? { present: 0, absent: 0 };
            if (r.status === 'present' || r.status === 'late') existing.present += 1;
            else existing.absent += 1;
            byDate.set(r.date, existing);
          }

          const byOfficer = new Map<string, { name: string; present: number; late: number; hours: number }>();
          for (const r of records) {
            const existing = byOfficer.get(r.officerId) ?? {
              name: r.officerName,
              present: 0,
              late: 0,
              hours: 0,
            };
            if (r.status === 'present') existing.present += 1;
            if (r.isLate) existing.late += 1;
            existing.hours += r.workingHours ?? 0;
            byOfficer.set(r.officerId, existing);
          }

          return {
            dailyTrend: [...byDate.entries()].map(([date, v]) => ({ date, ...v })),
            onTimeRate: [...byOfficer.values()].map((o) => ({
              officerName: o.name,
              rate: o.present > 0 ? Math.round(((o.present - o.late) / o.present) * 100) : 0,
            })),
            workingHours: [...byOfficer.values()].map((o) => ({
              officerName: o.name,
              hours: Math.round(o.hours * 10) / 10,
            })),
            leaveUtilization: [],
            geofenceCompliance: {
              inZone: records.filter((r) => r.checkInMethod === 'manual_inside' || r.checkInMethod === 'geofence_auto').length,
              approvedOutside: records.filter((r) => r.checkInMethod === 'approved_outside').length,
              unauthorized: records.filter((r) => r.locationMocked).length,
            },
          };
        },
      }),
      providesTags: ['Reports'],
    }),

    // ─── Officer Side ────────────────────────────────────────────────────────
    getTodayAttendance: builder.query<AttendanceRecord | null, void>({
      query: () => ({
        handler: async (client) => {
          const officerId = await getCurrentOfficerId(client);
          const today = new Date().toISOString().slice(0, 10);
          const { data, error } = await client
            .from('shifts')
            .select(ATTENDANCE_SELECT)
            .eq('officer_id', officerId)
            .eq('shift_date', today)
            .order('check_in_time', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (error) throw error;
          return data ? mapAttendanceRow(data as never) : null;
        },
      }),
      providesTags: ['Attendance'],
    }),

    getAttendanceHistory: builder.query<
      AttendanceRecord[],
      { month: number; year: number }
    >({
      query: ({ month, year }) => ({
        handler: async (client) => {
          const officerId = await getCurrentOfficerId(client);
          const monthStr = String(month).padStart(2, '0');
          const from = `${year}-${monthStr}-01`;
          const to = `${year}-${monthStr}-31`;
          const { data, error } = await client
            .from('shifts')
            .select(ATTENDANCE_SELECT)
            .eq('officer_id', officerId)
            .gte('shift_date', from)
            .lte('shift_date', to)
            .order('shift_date', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => mapAttendanceRow(row as never));
        },
      }),
      providesTags: ['Attendance'],
    }),

    checkIn: builder.mutation<
      AttendanceRecord,
      {
        coords: Coordinates;
        notes?: string;
        method: string;
        geofenceId: string;
        distanceFromFence: number;
        locationMocked?: boolean;
      }
    >({
      query: (body) => ({
        handler: async (client) => {
          const officerId = await getCurrentOfficerId(client);
          const today = new Date().toISOString().slice(0, 10);
          const now = new Date().toISOString();

          const { data, error } = await client
            .from('shifts')
            .insert({
              officer_id: officerId,
              shift_date: today,
              check_in_time: now,
              status: 'active',
              attendance_status: 'present',
              location: `POINT(${body.coords.longitude} ${body.coords.latitude})`,
              geofence_id: body.geofenceId,
              check_in_method: body.method,
              check_in_distance_m: body.distanceFromFence,
              notes: body.notes,
              location_mocked: body.locationMocked ?? false,
            })
            .select(ATTENDANCE_SELECT)
            .single();
          if (error) throw error;
          return mapAttendanceRow(data as never);
        },
      }),
      invalidatesTags: ['Attendance', 'Shifts', 'Map', 'Analytics'],
    }),

    checkOut: builder.mutation<
      AttendanceRecord,
      { coords: Coordinates; notes?: string; distanceFromFence: number }
    >({
      query: (body) => ({
        handler: async (client) => {
          const officerId = await getCurrentOfficerId(client);
          const today = new Date().toISOString().slice(0, 10);
          const now = new Date().toISOString();

          const { data: active, error: findError } = await client
            .from('shifts')
            .select('id, check_in_time')
            .eq('officer_id', officerId)
            .eq('shift_date', today)
            .eq('status', 'active')
            .maybeSingle();
          if (findError) throw findError;
          if (!active) throw new Error('No active shift found');

          const checkInTime = new Date(active.check_in_time as string).getTime();
          const workingHours = (Date.now() - checkInTime) / 3_600_000;

          const { data, error } = await client
            .from('shifts')
            .update({
              check_out_time: now,
              check_out_location: `POINT(${body.coords.longitude} ${body.coords.latitude})`,
              check_out_method: 'manual_inside',
              check_out_distance_m: body.distanceFromFence,
              working_hours: Math.round(workingHours * 100) / 100,
              status: 'completed',
              attendance_status: 'present',
              notes: body.notes,
            })
            .eq('id', active.id)
            .select(ATTENDANCE_SELECT)
            .single();
          if (error) throw error;
          return mapAttendanceRow(data as never);
        },
      }),
      invalidatesTags: ['Attendance', 'Shifts', 'Map', 'Analytics'],
    }),

    requestApproval: builder.mutation<
      ApprovalRequest,
      {
        type: ApprovalType;
        reason: string;
        coords: Coordinates;
        photoProof?: string;
        date: string;
        distanceFromFence: number;
        geofenceId?: string;
      }
    >({
      query: (body) => ({
        handler: async (client) => {
          const officerId = await getCurrentOfficerId(client);
          const { data, error } = await client
            .from('attendance_approval_requests')
            .insert({
              officer_id: officerId,
              geofence_id: body.geofenceId,
              type: body.type,
              requested_latitude: body.coords.latitude,
              requested_longitude: body.coords.longitude,
              distance_from_fence: body.distanceFromFence,
              reason: body.reason,
              photo_proof_url: body.photoProof,
              attendance_date: body.date,
            })
            .select('*')
            .single();
          if (error) throw error;
          return fetchApprovalRequestById(client, data.id);
        },
      }),
      invalidatesTags: ['Approvals'],
    }),

    getMyApprovalRequests: builder.query<ApprovalRequest[], void>({
      query: () => ({
        handler: async (client) => {
          const officerId = await getCurrentOfficerId(client);
          return fetchApprovalRequests(client, { officerId });
        },
      }),
      providesTags: ['Approvals'],
    }),

    getMyGeofences: builder.query<Geofence[], void>({
      query: () => ({
        handler: async (client) => {
          const officerId = await getCurrentOfficerId(client);
          const { data, error } = await client
            .from('geofence_officer_assignments')
            .select('geofence_id, geofences(*)')
            .eq('officer_id', officerId);
          if (error) throw error;
          return (data ?? [])
            .map((row) => {
              const gf = row.geofences as unknown as DbGeofenceRow | null;
              if (!gf) return null;
              return mapGeofenceRow({ ...gf, geofence_officer_assignments: [{ officer_id: officerId }] });
            })
            .filter((g): g is Geofence => g != null && g.isActive);
        },
      }),
      providesTags: ['Geofences'],
    }),

    updateOfficerLocation: builder.mutation<
      void,
      {
        coords: Coordinates;
        accuracy: number;
        timestamp: string;
        batteryLevel?: number;
        heading?: number | null;
        speed?: number | null;
        altitude?: number | null;
      }
    >({
      query: (body) => ({
        handler: async (client) => {
          const { data: session } = await client.auth.getSession();
          const userId = session.session?.user?.id;
          if (!userId) throw new Error('Not authenticated');
          const officerId = await getOfficerIdForUser(client, userId);
          if (!officerId) throw new Error('Officer not found');

          const speed = body.speed ?? null;
          const isMoving = speed !== null ? speed > 0.5 : true;

          const { error } = await client
            .from('officers')
            .update({
              current_latitude: body.coords.latitude,
              current_longitude: body.coords.longitude,
              last_location_update: body.timestamp,
            })
            .eq('id', officerId);
          if (error) throw error;

          await client.from('officer_location_events').insert({
            officer_id: officerId,
            latitude: body.coords.latitude,
            longitude: body.coords.longitude,
            accuracy: body.accuracy,
            heading: body.heading ?? null,
            speed,
            altitude: body.altitude ?? null,
            is_moving: isMoving,
            battery_level: body.batteryLevel ?? null,
            event_type: 'location_update',
            recorded_at: body.timestamp,
          });

          await client.from('officer_locations').upsert(
            {
              officer_id: officerId,
              latitude: body.coords.latitude,
              longitude: body.coords.longitude,
              accuracy: body.accuracy,
              heading: body.heading ?? null,
              speed,
              altitude: body.altitude ?? null,
              battery_level: body.batteryLevel ?? null,
              is_moving: isMoving,
              is_online: true,
              last_seen_at: body.timestamp,
            },
            { onConflict: 'officer_id' },
          );
        },
      }),
      invalidatesTags: ['Map'],
    }),

    getMyLeaveRequests: builder.query<LeaveRequestRecord[], void>({
      query: () => ({
        handler: async (client) => {
          const officerId = await getCurrentOfficerId(client);
          const { data, error } = await client
            .from('leave_requests')
            .select(`*, officers(${OFFICER_EMBED})`)
            .eq('officer_id', officerId)
            .order('created_at', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => mapLeaveRow(row as never));
        },
      }),
      providesTags: ['Leave'],
    }),

    applyLeave: builder.mutation<
      LeaveRequestRecord,
      {
        leaveType: LeaveType;
        fromDate: string;
        toDate: string;
        reason: string;
        isHalfDay?: boolean;
        halfDayPeriod?: 'morning' | 'afternoon';
      }
    >({
      query: (body) => ({
        handler: async (client) => {
          const officerId = await getCurrentOfficerId(client);
          const from = new Date(body.fromDate);
          const to = new Date(body.toDate);
          const days = body.isHalfDay
            ? 0.5
            : Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1;

          const { data, error } = await client
            .from('leave_requests')
            .insert({
              officer_id: officerId,
              leave_type: body.leaveType,
              start_date: body.fromDate,
              end_date: body.toDate,
              reason: body.reason,
              days,
              is_half_day: body.isHalfDay ?? false,
              half_day_period: body.halfDayPeriod,
              status: 'pending',
            })
            .select(`*, officers(${OFFICER_EMBED})`)
            .single();
          if (error) throw error;
          return mapLeaveRow(data as never);
        },
      }),
      invalidatesTags: ['Leave'],
    }),

    cancelLeave: builder.mutation<void, string>({
      query: (id) => ({
        handler: async (client) => {
          const { error } = await client
            .from('leave_requests')
            .delete()
            .eq('id', id)
            .eq('status', 'pending');
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Leave'],
    }),

    getLeaveBalances: builder.query<LeaveBalance[], void>({
      query: () => ({
        handler: async (client) => {
          const officerId = await getCurrentOfficerId(client);
          const { data, error } = await client
            .from('leave_balances')
            .select('*')
            .eq('officer_id', officerId);
          if (error) throw error;
          return (data ?? []).map((row) => mapLeaveBalanceRow(row as Record<string, unknown>));
        },
      }),
      providesTags: ['Leave'],
    }),
  }),
});

export const {
  useGetGeofencesQuery,
  useGetGeofenceQuery,
  useCreateGeofenceMutation,
  useUpdateGeofenceMutation,
  useDeleteGeofenceMutation,
  useToggleGeofenceMutation,
  useAssignGeofenceOfficersMutation,
  useGetAllAttendanceTodayQuery,
  useGetAdminAttendanceQuery,
  useGetOfficerAttendanceRecordsQuery,
  useGetAttendanceSummaryQuery,
  useAttendanceOverrideMutation,
  useGetApprovalRequestsQuery,
  useReviewApprovalMutation,
  useGetShiftDefinitionsQuery,
  useCreateShiftDefinitionMutation,
  useUpdateShiftDefinitionMutation,
  useDeleteShiftDefinitionMutation,
  useGetAdminLeaveRequestsQuery,
  useReviewLeaveMutation,
  useGetLiveOfficerLocationsQuery,
  useGetAttendanceReportsQuery,
  useGetTodayAttendanceQuery,
  useGetAttendanceHistoryQuery,
  useCheckInMutation,
  useCheckOutMutation,
  useRequestApprovalMutation,
  useGetMyApprovalRequestsQuery,
  useGetMyGeofencesQuery,
  useUpdateOfficerLocationMutation,
  useGetMyLeaveRequestsQuery,
  useApplyLeaveMutation,
  useCancelLeaveMutation,
  useGetLeaveBalancesQuery,
} = attendanceApi;
