import type { AttendanceRecord } from '@/types/attendance';

/** Resolve working hours from stored value or check-in/out timestamps. */
export function resolveWorkingHours(
  record: Pick<AttendanceRecord, 'checkInTime' | 'checkOutTime' | 'workingHours'>,
): number | undefined {
  if (record.workingHours != null && record.workingHours > 0) {
    return record.workingHours;
  }
  if (!record.checkInTime || !record.checkOutTime) return undefined;

  const ms =
    new Date(record.checkOutTime).getTime() - new Date(record.checkInTime).getTime();
  if (ms <= 0) return undefined;

  return Math.round((ms / 3_600_000) * 100) / 100;
}

export function formatAttendanceDuration(
  record: Pick<AttendanceRecord, 'checkInTime' | 'checkOutTime' | 'workingHours'>,
): string {
  const hours = resolveWorkingHours(record);
  if (hours == null || hours <= 0) return '—';

  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes > 0) return `${wholeHours}h ${minutes}m`;
  return `${wholeHours}h`;
}
