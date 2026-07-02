import {
  buildCalendarMonthCells,
  chunkCalendarRows,
  buildDayDensityMap,
} from '@/utils/attendanceCalendarGrid';
import type { AttendanceRecord } from '@/types/attendance';

function makeRecord(date: string, status: AttendanceRecord['status'], officerId: string): AttendanceRecord {
  return {
    id: `${officerId}-${date}`,
    officerId,
    officerName: officerId,
    geofenceId: 'zone-1',
    geofenceName: 'Zone 1',
    date,
    checkInLocation: { latitude: 0, longitude: 0 },
    checkInMethod: 'manual_inside',
    checkInDistanceFromFence: 0,
    status,
    isLate: status === 'late',
    createdAt: '2026-06-01T00:00:00.000Z',
  };
}

describe('attendanceCalendarGrid', () => {
  it('renders every day in June 2026', () => {
    const cells = buildCalendarMonthCells(2026, 6, new Map());
    const inMonthDays = cells.filter((cell) => cell.inMonth).map((cell) => cell.day);

    expect(inMonthDays).toHaveLength(30);
    expect(inMonthDays).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
  });

  it('always produces full 7-column rows', () => {
    const cells = buildCalendarMonthCells(2026, 6, new Map());
    const rows = chunkCalendarRows(cells);

    expect(cells.length % 7).toBe(0);
    rows.forEach((row) => expect(row).toHaveLength(7));
  });

  it('aligns June 1 2026 (Monday) under Mon column with Sunday start', () => {
    const cells = buildCalendarMonthCells(2026, 6, new Map());
    const rows = chunkCalendarRows(cells);
    const firstRow = rows[0]!;

    expect(firstRow[0]!.day).toBe(31);
    expect(firstRow[0]!.inMonth).toBe(false);
    expect(firstRow[1]!.day).toBe(1);
    expect(firstRow[1]!.inMonth).toBe(true);
  });

  it('aggregates density per day across employees', () => {
    const records = [
      makeRecord('2026-06-01', 'present', 'a'),
      makeRecord('2026-06-01', 'absent', 'b'),
      makeRecord('2026-06-01', 'present', 'c'),
    ];
    const density = buildDayDensityMap(records).get('2026-06-01');

    expect(density).toEqual({
      present: 2,
      absent: 1,
      late: 0,
      halfDay: 0,
      onLeave: 0,
      holiday: 0,
      total: 3,
    });
  });
});
