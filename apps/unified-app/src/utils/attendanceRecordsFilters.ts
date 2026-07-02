import type { AttendanceRecord, AttendanceStatus } from '@/types/attendance';

export type AttendanceRecordsSortKey =
  | 'date_desc'
  | 'date_asc'
  | 'name_asc'
  | 'name_desc'
  | 'checkin_desc'
  | 'checkin_asc'
  | 'status';

export type AttendanceStatusFilter = AttendanceStatus | 'all';

const STATUS_RANK: Record<AttendanceStatus, number> = {
  absent: 6,
  late: 5,
  half_day: 4,
  on_leave: 3,
  present: 2,
  holiday: 1,
};

function compareCheckIn(a: AttendanceRecord, b: AttendanceRecord): number {
  const aTime = a.checkInTime ? new Date(a.checkInTime).getTime() : 0;
  const bTime = b.checkInTime ? new Date(b.checkInTime).getTime() : 0;
  return aTime - bTime;
}

export function filterAndSortAttendanceRecords(
  records: AttendanceRecord[],
  searchQuery: string,
  statusFilter: AttendanceStatusFilter,
  sortBy: AttendanceRecordsSortKey,
  officerId?: string | null,
): AttendanceRecord[] {
  const query = searchQuery.trim().toLowerCase();

  let filtered = records;

  if (officerId) {
    filtered = filtered.filter((record) => record.officerId === officerId);
  }

  if (query) {
    filtered = filtered.filter((record) => {
      const haystack = [
        record.officerName,
        record.geofenceName,
        record.notes ?? '',
        record.manualEntryReason ?? '',
        record.status,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  if (statusFilter !== 'all') {
    filtered = filtered.filter((record) => record.status === statusFilter);
  }

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'name_asc':
        return a.officerName.localeCompare(b.officerName);
      case 'name_desc':
        return b.officerName.localeCompare(a.officerName);
      case 'date_asc':
        return a.date.localeCompare(b.date) || a.officerName.localeCompare(b.officerName);
      case 'date_desc':
        return b.date.localeCompare(a.date) || a.officerName.localeCompare(b.officerName);
      case 'checkin_asc':
        return compareCheckIn(a, b) || a.officerName.localeCompare(b.officerName);
      case 'checkin_desc':
        return compareCheckIn(b, a) || a.officerName.localeCompare(b.officerName);
      case 'status':
        return (
          STATUS_RANK[b.status] - STATUS_RANK[a.status] ||
          a.date.localeCompare(b.date) ||
          a.officerName.localeCompare(b.officerName)
        );
      default:
        return 0;
    }
  });

  return sorted;
}
