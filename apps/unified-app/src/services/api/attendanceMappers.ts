import type {
  ApprovalRequest,
  ApprovalStatus,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSummary,
  CheckInMethod,
  DbApprovalRow,
  DbAttendanceRow,
  DbGeofenceRow,
  DbLeaveRow,
  DbShiftDefinitionRow,
  Geofence,
  LeaveBalance,
  LeaveRequestRecord,
  LeaveType,
  OfficerLiveLocation,
  ShiftDefinition,
} from '@/types/attendance';

import { getOfficerIdForUser, parseGeographyPoint } from './mappers';
import type { TypedSupabaseClient } from './supabase';

export function mapGeofenceRow(row: DbGeofenceRow): Geofence {
  const assignments = row.geofence_officer_assignments ?? [];
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    state: row.state,
    isActive: row.is_active,
    geometry: row.geometry,
    assignedOfficers: assignments.map((a) => a.officer_id),
    createdBy: row.created_by ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAttendanceRow(row: DbAttendanceRow): AttendanceRecord {
  const checkInLoc = parseGeographyPoint(row.location) ?? { latitude: 0, longitude: 0 };
  const checkOutLoc = parseGeographyPoint(row.check_out_location) ?? undefined;
  const status = (row.attendance_status ?? row.status ?? 'absent') as AttendanceStatus;

  return {
    id: row.id,
    officerId: row.officer_id,
    officerName: row.officers?.full_name ?? 'Officer',
    officerAvatar: row.officers?.profile_photo_url,
    geofenceId: row.geofence_id ?? '',
    geofenceName: row.geofences?.name ?? '',
    date: row.shift_date ?? new Date().toISOString().slice(0, 10),
    checkInTime: row.check_in_time ?? undefined,
    checkOutTime: row.check_out_time ?? undefined,
    checkInLocation: checkInLoc,
    checkOutLocation: checkOutLoc,
    checkInMethod: (row.check_in_method ?? 'manual_inside') as CheckInMethod,
    checkOutMethod: row.check_out_method as CheckInMethod | undefined,
    checkInDistanceFromFence: Number(row.check_in_distance_m ?? 0),
    checkOutDistanceFromFence: row.check_out_distance_m != null ? Number(row.check_out_distance_m) : undefined,
    workingHours: row.working_hours != null ? Number(row.working_hours) : undefined,
    overtimeHours: row.overtime_hours != null ? Number(row.overtime_hours) : undefined,
    status,
    isLate: Boolean(row.is_late),
    lateByMinutes: row.late_by_minutes ?? undefined,
    notes: row.notes ?? undefined,
    approvalRequestId: row.approval_request_id ?? undefined,
    locationMocked: Boolean(row.location_mocked),
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

export function mapApprovalRow(row: DbApprovalRow): ApprovalRequest {
  return {
    id: row.id,
    officerId: row.officer_id,
    officerName: row.officers?.full_name ?? 'Officer',
    officerAvatar: row.officers?.profile_photo_url,
    geofenceId: row.geofence_id ?? '',
    geofenceName: row.geofences?.name ?? '',
    type: row.type,
    requestedAt: row.requested_at,
    requestedLocation: {
      latitude: Number(row.requested_latitude),
      longitude: Number(row.requested_longitude),
    },
    distanceFromFence: Number(row.distance_from_fence),
    reason: row.reason,
    photoProof: row.photo_proof_url ?? undefined,
    status: row.status,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewNotes: row.review_notes ?? undefined,
    date: row.attendance_date,
  };
}

export function mapShiftDefinitionRow(row: DbShiftDefinitionRow): ShiftDefinition {
  const assignments = row.shift_definition_officers ?? [];
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
    graceMinutes: row.grace_minutes,
    breakMinutes: row.break_minutes,
    overtimeThresholdMinutes: row.overtime_threshold_minutes,
    isOvernight: row.is_overnight,
    assignedOfficers: assignments.map((a) => a.officer_id),
  };
}

export function mapLeaveRow(row: DbLeaveRow): LeaveRequestRecord {
  return {
    id: row.id,
    officerId: row.officer_id,
    officerName: row.officers?.full_name ?? 'Officer',
    leaveType: row.leave_type as LeaveType,
    fromDate: row.start_date,
    toDate: row.end_date,
    days: row.days ?? 1,
    reason: row.reason,
    status: row.status as ApprovalStatus,
    appliedAt: row.created_at,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewNotes: row.review_notes ?? undefined,
    isHalfDay: Boolean(row.is_half_day),
    halfDayPeriod: row.half_day_period ?? undefined,
  };
}

export function mapLiveOfficerRow(row: Record<string, unknown>): OfficerLiveLocation {
  const activeStatus = row.active_shift_status as string | null | undefined;
  const activeCheckIn = row.active_shift_check_in as string | null | undefined;
  const activeCheckOut = row.active_shift_check_out as string | null | undefined;
  const attendanceStatus: OfficerLiveLocation['attendanceStatus'] =
    activeStatus === 'active' && activeCheckIn && !activeCheckOut
      ? 'checked_in'
      : activeCheckOut
        ? 'checked_out'
        : 'not_started';

  return {
    officerId: row.id as string,
    officerName: (row.full_name as string) ?? 'Officer',
    officerAvatar: (row.profile_photo_url as string) ?? undefined,
    coordinates: {
      latitude: Number(row.current_latitude),
      longitude: Number(row.current_longitude),
    },
    accuracy: 0,
    isInsideGeofence: false,
    lastUpdated: (row.last_location_update as string) ?? new Date().toISOString(),
    attendanceStatus,
  };
}

export function buildAttendanceSummary(
  officerId: string,
  month: number,
  year: number,
  records: AttendanceRecord[],
): AttendanceSummary {
  const presentDays = records.filter((r) => r.status === 'present').length;
  const absentDays = records.filter((r) => r.status === 'absent').length;
  const lateDays = records.filter((r) => r.status === 'late' || r.isLate).length;
  const halfDays = records.filter((r) => r.status === 'half_day').length;
  const leaveDays = records.filter((r) => r.status === 'on_leave').length;
  const holidayDays = records.filter((r) => r.status === 'holiday').length;
  const totalWorkingHours = records.reduce((sum, r) => sum + (r.workingHours ?? 0), 0);
  const totalOvertimeHours = records.reduce((sum, r) => sum + (r.overtimeHours ?? 0), 0);
  const totalWorkingDays = records.length || 1;

  return {
    officerId,
    month,
    year,
    totalWorkingDays,
    presentDays,
    absentDays,
    lateDays,
    halfDays,
    leaveDays,
    holidayDays,
    totalWorkingHours,
    totalOvertimeHours,
    attendancePercentage: Math.round((presentDays / totalWorkingDays) * 100),
  };
}

export async function getCurrentOfficerId(client: TypedSupabaseClient): Promise<string> {
  const { data: session } = await client.auth.getSession();
  const userId = session.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  const officerId = await getOfficerIdForUser(client, userId);
  if (!officerId) throw new Error('Officer profile not found');
  return officerId;
}

export function mapLeaveBalanceRow(row: Record<string, unknown>): LeaveBalance {
  const total = Number(row.total_days ?? 0);
  const used = Number(row.used_days ?? 0);
  return {
    leaveType: row.leave_type as LeaveType,
    totalDays: total,
    usedDays: used,
    remainingDays: total - used,
  };
}

export type AttendanceReportData = {
  dailyTrend: { date: string; present: number; absent: number }[];
  onTimeRate: { officerName: string; rate: number }[];
  workingHours: { officerName: string; hours: number }[];
  leaveUtilization: { type: string; count: number }[];
  geofenceCompliance: { inZone: number; approvedOutside: number; unauthorized: number };
};
