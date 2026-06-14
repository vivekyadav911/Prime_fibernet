// ─── Geofence ───────────────────────────────────────────────────────────────

export type GeofenceShape = 'circle' | 'polygon';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface CircleGeofence {
  shape: 'circle';
  center: Coordinates;
  radius: number;
}

export interface PolygonGeofence {
  shape: 'polygon';
  vertices: Coordinates[];
}

export interface Geofence {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  isActive: boolean;
  geometry: CircleGeofence | PolygonGeofence;
  assignedOfficers: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeofenceCreatePayload {
  name: string;
  address: string;
  city: string;
  state: string;
  geometry: CircleGeofence | PolygonGeofence;
  assignedOfficers: string[];
}

// ─── Attendance ──────────────────────────────────────────────────────────────

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'half_day'
  | 'on_leave'
  | 'holiday';

export type CheckInMethod =
  | 'geofence_auto'
  | 'manual_inside'
  | 'approved_outside'
  | 'admin_override';

export interface AttendanceRecord {
  id: string;
  officerId: string;
  officerName: string;
  officerAvatar?: string;
  geofenceId: string;
  geofenceName: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkInLocation: Coordinates;
  checkOutLocation?: Coordinates;
  checkInMethod: CheckInMethod;
  checkOutMethod?: CheckInMethod;
  checkInDistanceFromFence: number;
  checkOutDistanceFromFence?: number;
  workingHours?: number;
  overtimeHours?: number;
  status: AttendanceStatus;
  isLate: boolean;
  lateByMinutes?: number;
  notes?: string;
  approvalRequestId?: string;
  locationMocked?: boolean;
  createdAt: string;
}

export interface AttendanceSummary {
  officerId: string;
  month: number;
  year: number;
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  leaveDays: number;
  holidayDays: number;
  totalWorkingHours: number;
  totalOvertimeHours: number;
  attendancePercentage: number;
}

// ─── Approval Requests ───────────────────────────────────────────────────────

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type ApprovalType =
  | 'out_of_zone_checkin'
  | 'out_of_zone_checkout'
  | 'manual_correction'
  | 'late_checkin'
  | 'early_checkout'
  | 'missed_checkout';

export interface ApprovalRequest {
  id: string;
  officerId: string;
  officerName: string;
  officerAvatar?: string;
  geofenceId: string;
  geofenceName: string;
  type: ApprovalType;
  requestedAt: string;
  requestedLocation: Coordinates;
  distanceFromFence: number;
  reason: string;
  photoProof?: string;
  status: ApprovalStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  date: string;
}

// ─── Shifts ──────────────────────────────────────────────────────────────────

export type ShiftType = 'fixed' | 'flexible' | 'rotational';

export interface ShiftDefinition {
  id: string;
  name: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  breakMinutes: number;
  overtimeThresholdMinutes: number;
  isOvernight: boolean;
  assignedOfficers: string[];
}

// ─── Leave ───────────────────────────────────────────────────────────────────

export type LeaveType =
  | 'casual'
  | 'sick'
  | 'earned'
  | 'maternity'
  | 'paternity'
  | 'unpaid'
  | 'compensatory';

export interface LeaveRequestRecord {
  id: string;
  officerId: string;
  officerName: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: ApprovalStatus;
  appliedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  isHalfDay: boolean;
  halfDayPeriod?: 'morning' | 'afternoon';
}

export interface LeaveBalance {
  leaveType: LeaveType;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

// ─── Real-time ────────────────────────────────────────────────────────────────

export interface OfficerLiveLocation {
  officerId: string;
  officerName: string;
  officerAvatar?: string;
  coordinates: Coordinates;
  accuracy: number;
  isInsideGeofence: boolean;
  geofenceId?: string;
  lastUpdated: string;
  attendanceStatus: 'checked_in' | 'checked_out' | 'not_started';
  batteryLevel?: number;
}

// ─── Service result types ─────────────────────────────────────────────────────

export type CheckInResult =
  | { action: 'checked_in'; record: AttendanceRecord }
  | { action: 'needs_approval'; distance: number; geofenceName?: string }
  | { action: 'already_checked_in'; record: AttendanceRecord }
  | { action: 'offline_queued' };

export type CheckOutResult =
  | { action: 'checked_out'; record: AttendanceRecord }
  | { action: 'needs_approval'; distance: number }
  | { action: 'not_checked_in' }
  | { action: 'offline_queued' };

// ─── DB row types (for mappers) ──────────────────────────────────────────────

export type DbGeofenceRow = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  is_active: boolean;
  geometry: CircleGeofence | PolygonGeofence;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  geofence_officer_assignments?: { officer_id: string }[];
};

export type DbAttendanceRow = {
  id: string;
  officer_id: string;
  shift_date: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  location: unknown;
  check_out_location: unknown;
  geofence_id: string | null;
  check_in_method: string | null;
  check_out_method: string | null;
  check_in_distance_m: number | null;
  check_out_distance_m: number | null;
  working_hours: number | null;
  overtime_hours: number | null;
  is_late: boolean | null;
  late_by_minutes: number | null;
  notes: string | null;
  approval_request_id: string | null;
  location_mocked: boolean | null;
  attendance_status: string | null;
  status: string | null;
  created_at?: string;
  officers?: { full_name?: string; profile_photo_url?: string };
  geofences?: { name?: string };
};

export type DbApprovalRow = {
  id: string;
  officer_id: string;
  geofence_id: string | null;
  type: ApprovalType;
  requested_at: string;
  requested_latitude: number;
  requested_longitude: number;
  distance_from_fence: number;
  reason: string;
  photo_proof_url: string | null;
  status: ApprovalStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  attendance_date: string;
  officers?: { full_name?: string; profile_photo_url?: string };
  geofences?: { name?: string };
};

export type DbShiftDefinitionRow = {
  id: string;
  name: string;
  type: ShiftType;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  break_minutes: number;
  overtime_threshold_minutes: number;
  is_overnight: boolean;
  shift_definition_officers?: { officer_id: string }[];
};

export type DbLeaveRow = {
  id: string;
  officer_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number | null;
  reason: string;
  status: ApprovalStatus;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  is_half_day: boolean | null;
  half_day_period: 'morning' | 'afternoon' | null;
  officers?: { full_name?: string };
};

export type GeofenceStatus = {
  isInside: boolean;
  geofence: Geofence | null;
  distance: number;
};

export type LocationSyncEntry = {
  coords: Coordinates;
  timestamp: string;
  geofenceStatus: GeofenceStatus;
  eventType: 'location_update' | 'geofence_enter' | 'geofence_exit';
  accuracy?: number;
};
