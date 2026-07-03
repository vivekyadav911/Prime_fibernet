import { buildAttendanceCsv } from '@/utils/attendanceExport';
import { countAttendanceStatuses, type AttendanceStatusDayRow } from '@/utils/attendanceStatus';
import type { AttendanceRecord } from '@/types/attendance';

function makeRecord(date: string, status: AttendanceRecord['status']): AttendanceRecord {
  return {
    id: `rec-${date}`,
    officerId: 'officer-a',
    officerName: 'Officer A',
    geofenceId: 'zone-1',
    geofenceName: 'Zone 1',
    date,
    checkInLocation: { latitude: 0, longitude: 0 },
    checkInMethod: 'manual_inside',
    checkInDistanceFromFence: 0,
    status,
    isLate: status === 'late',
    createdAt: '2026-07-01T00:00:00.000Z',
  };
}

function makeStatusRow(shiftDate: string, status: AttendanceStatusDayRow['status']): AttendanceStatusDayRow {
  return {
    officerId: 'officer-a',
    officerName: 'Officer A',
    shiftDate,
    status,
    isScheduledWorkingDay: true,
    geofenceVerified: false,
    activeHeadcount: 1,
  };
}

describe('attendanceExport canonical parity', () => {
  it('exports canonical status column matching stat tile counts', () => {
    const statusRows = [
      makeStatusRow('2026-07-02', 'present'),
      makeStatusRow('2026-07-03', 'late'),
      makeStatusRow('2026-07-04', 'half_day'),
      makeStatusRow('2026-07-08', 'on_leave'),
      makeStatusRow('2026-07-10', 'absent'),
      makeStatusRow('2026-07-15', 'holiday'),
    ];
    const records = statusRows.map((row) => makeRecord(row.shiftDate, row.status as AttendanceRecord['status']));

    const csv = buildAttendanceCsv(records, statusRows);
    const counts = countAttendanceStatuses(statusRows);

    expect(csv.match(/present/g)?.length).toBe(counts.present);
    expect(csv.match(/absent/g)?.length).toBe(counts.absent);
    expect(csv.match(/late/g)?.length).toBe(counts.late);
    expect(csv.match(/half_day/g)?.length).toBe(counts.halfDay);
    expect(csv.match(/on_leave/g)?.length).toBe(counts.onLeave);
    expect(csv.match(/holiday/g)?.length).toBe(counts.holiday);
  });
});
