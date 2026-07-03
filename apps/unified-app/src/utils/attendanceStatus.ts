import type { AttendanceStatus } from '@/types/attendance';
import { getMonthIsoRange } from '@/utils/attendanceCalendarGrid';

/** Canonical day status from `get_attendance_status_by_day` — single source of truth. */
export type CanonicalAttendanceStatus = AttendanceStatus | 'not_yet_recorded';

export type AttendanceStatusDayRow = {
  officerId: string;
  officerName: string;
  shiftDate: string;
  status: CanonicalAttendanceStatus;
  isScheduledWorkingDay: boolean;
  shiftId?: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkInMethod?: string;
  geofenceVerified: boolean;
  activeHeadcount: number;
};

export type AttendanceStatusCounts = {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  onLeave: number;
  holiday: number;
};

export type DayStatusAggregate = {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  onLeave: number;
  holiday: number;
  total: number;
  headcount: number;
};

export const COUNTABLE_STATUSES: AttendanceStatus[] = [
  'present',
  'absent',
  'late',
  'half_day',
  'on_leave',
  'holiday',
];

export function mapAttendanceStatusDayRow(row: Record<string, unknown>): AttendanceStatusDayRow {
  return {
    officerId: row.officer_id as string,
    officerName: (row.officer_name as string) ?? 'Unknown officer',
    shiftDate: row.shift_date as string,
    status: row.status as CanonicalAttendanceStatus,
    isScheduledWorkingDay: Boolean(row.is_scheduled_working_day),
    shiftId: (row.shift_id as string) ?? undefined,
    checkInTime: (row.check_in_time as string) ?? undefined,
    checkOutTime: (row.check_out_time as string) ?? undefined,
    checkInMethod: (row.check_in_method as string) ?? undefined,
    geofenceVerified: Boolean(row.geofence_verified),
    activeHeadcount: Number(row.active_headcount ?? 0),
  };
}

export function isCountableAttendanceStatus(
  status: CanonicalAttendanceStatus,
): status is AttendanceStatus {
  return status !== 'not_yet_recorded';
}

export function countAttendanceStatuses(rows: AttendanceStatusDayRow[]): AttendanceStatusCounts {
  const counts: AttendanceStatusCounts = {
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    onLeave: 0,
    holiday: 0,
  };

  for (const row of rows) {
    if (!isCountableAttendanceStatus(row.status)) continue;
    switch (row.status) {
      case 'present':
        counts.present += 1;
        break;
      case 'absent':
        counts.absent += 1;
        break;
      case 'late':
        counts.late += 1;
        break;
      case 'half_day':
        counts.halfDay += 1;
        break;
      case 'on_leave':
        counts.onLeave += 1;
        break;
      case 'holiday':
        counts.holiday += 1;
        break;
      default:
        break;
    }
  }

  return counts;
}

export function buildStatusByDateFromRows(
  rows: AttendanceStatusDayRow[],
): Map<string, CanonicalAttendanceStatus> {
  const map = new Map<string, CanonicalAttendanceStatus>();
  for (const row of rows) {
    map.set(row.shiftDate, row.status);
  }
  return map;
}

export function buildDayAggregateMap(rows: AttendanceStatusDayRow[]): Map<string, DayStatusAggregate> {
  const map = new Map<string, DayStatusAggregate>();

  for (const row of rows) {
    const existing = map.get(row.shiftDate) ?? {
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      onLeave: 0,
      holiday: 0,
      total: 0,
      headcount: row.activeHeadcount,
    };

    existing.headcount = row.activeHeadcount;

    if (isCountableAttendanceStatus(row.status)) {
      switch (row.status) {
        case 'present':
          existing.present += 1;
          break;
        case 'absent':
          existing.absent += 1;
          break;
        case 'late':
          existing.late += 1;
          break;
        case 'half_day':
          existing.halfDay += 1;
          break;
        case 'on_leave':
          existing.onLeave += 1;
          break;
        case 'holiday':
          existing.holiday += 1;
          break;
        default:
          break;
      }
    }

    map.set(row.shiftDate, existing);
  }

  for (const aggregate of map.values()) {
    aggregate.total = aggregate.headcount;
  }

  return map;
}

export function filterRowsForMonth(
  rows: AttendanceStatusDayRow[],
  year: number,
  month: number,
): AttendanceStatusDayRow[] {
  const { from, to } = getMonthIsoRange(year, month);
  return rows.filter((row) => row.shiftDate >= from && row.shiftDate <= to);
}

/** Officer history fallback until that screen queries the canonical RPC directly. */
export function mapRecordsToProvisionalStatusRows(records: import('@/types/attendance').AttendanceRecord[]): AttendanceStatusDayRow[] {
  return records.map((record) => ({
    officerId: record.officerId,
    officerName: record.officerName,
    shiftDate: record.date,
    status: record.status,
    isScheduledWorkingDay: true,
    shiftId: record.id,
    checkInTime: record.checkInTime,
    checkOutTime: record.checkOutTime,
    checkInMethod: record.checkInMethod,
    geofenceVerified:
      record.checkInMethod === 'geofence_auto' ||
      record.checkInMethod === 'manual_inside' ||
      record.checkInMethod === 'approved_outside',
    activeHeadcount: 1,
  }));
}

export function warnUnresolvedCalendarCells(
  year: number,
  month: number,
  statusByDate: Map<string, CanonicalAttendanceStatus>,
): void {
  if (!__DEV__) return;

  const { from, to } = getMonthIsoRange(year, month);
  const [y, m, d] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const start = new Date(y!, m! - 1, d!);
  const end = new Date(ty!, tm! - 1, td!);

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const iso = cursor.toISOString().slice(0, 10);
    if (!statusByDate.has(iso)) {
      console.warn(`[attendance] No canonical status for in-month date ${iso}`);
    }
  }
}
