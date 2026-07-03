import {
  buildCalendarMonthCells,
  chunkCalendarRows,
  getMonthIsoRange,
  listMonthsBetween,
} from '@/utils/attendanceCalendarGrid';
import {
  buildDayAggregateMap,
  buildStatusByDateFromRows,
  countAttendanceStatuses,
  type AttendanceStatusDayRow,
} from '@/utils/attendanceStatus';

function makeStatusRow(
  shiftDate: string,
  status: AttendanceStatusDayRow['status'],
  officerId = 'officer-a',
  headcount = 2,
): AttendanceStatusDayRow {
  return {
    officerId,
    officerName: officerId,
    shiftDate,
    status,
    isScheduledWorkingDay: true,
    geofenceVerified: false,
    activeHeadcount: headcount,
  };
}

describe('attendanceCalendarGrid', () => {
  it('renders every day in June 2026', () => {
    const cells = buildCalendarMonthCells(2026, 6, new Map());
    const inMonthDays = cells.filter((cell) => cell.inMonth).map((cell) => cell.day);

    expect(inMonthDays).toHaveLength(30);
    expect(inMonthDays).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
  });

  it('marks June 28 2026 as in-month (not padding)', () => {
    const cells = buildCalendarMonthCells(2026, 6, new Map());
    const june28 = cells.find((cell) => cell.date === '2026-06-28');

    expect(june28).toBeDefined();
    expect(june28?.inMonth).toBe(true);
    expect(june28?.day).toBe(28);
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

  it('lists every month spanned by a date range', () => {
    expect(listMonthsBetween('2026-05-03', '2026-06-30')).toEqual([
      { year: 2026, month: 5 },
      { year: 2026, month: 6 },
    ]);
  });

  it('returns a single month when range stays within one month', () => {
    expect(listMonthsBetween('2026-06-01', '2026-06-30')).toEqual([{ year: 2026, month: 6 }]);
  });

  it('covers months starting on each weekday with correct in-month day count', () => {
    const cases = [
      { year: 2026, month: 6, days: 30 },
      { year: 2026, month: 2, days: 28 },
      { year: 2024, month: 2, days: 29 },
      { year: 2026, month: 1, days: 31 },
      { year: 2026, month: 5, days: 31 },
    ];

    for (const { year, month, days } of cases) {
      const cells = buildCalendarMonthCells(year, month, new Map());
      expect(cells.filter((cell) => cell.inMonth)).toHaveLength(days);
    }
  });
});

describe('attendanceStatus aggregates', () => {
  it('uses active headcount as denominator, not record count', () => {
    const rows = [
      makeStatusRow('2026-06-01', 'present', 'a', 2),
      makeStatusRow('2026-06-01', 'absent', 'b', 2),
    ];
    const density = buildDayAggregateMap(rows).get('2026-06-01');

    expect(density).toEqual({
      present: 1,
      absent: 1,
      late: 0,
      halfDay: 0,
      onLeave: 0,
      holiday: 0,
      total: 2,
      headcount: 2,
    });
  });

  it('keeps stat tiles aligned with canonical statuses', () => {
    const rows = [
      makeStatusRow('2026-07-02', 'present'),
      makeStatusRow('2026-07-03', 'late'),
      makeStatusRow('2026-07-04', 'half_day'),
      makeStatusRow('2026-07-08', 'on_leave'),
      makeStatusRow('2026-07-10', 'absent'),
      makeStatusRow('2026-07-15', 'holiday'),
      makeStatusRow('2026-07-20', 'not_yet_recorded'),
    ];

    expect(countAttendanceStatuses(rows)).toEqual({
      present: 1,
      absent: 1,
      late: 1,
      halfDay: 1,
      onLeave: 1,
      holiday: 1,
    });

    const statusByDate = buildStatusByDateFromRows(rows);
    expect(statusByDate.get('2026-07-10')).toBe('absent');
    expect(statusByDate.get('2026-07-08')).toBe('on_leave');
    expect(statusByDate.get('2026-07-20')).toBe('not_yet_recorded');
  });

  it('maps every in-month day when canonical rows cover the month', () => {
    const { from, to } = getMonthIsoRange(2026, 6);
    const rows: AttendanceStatusDayRow[] = [];
    const start = new Date(from);
    const end = new Date(to);

    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const iso = cursor.toISOString().slice(0, 10);
      rows.push(makeStatusRow(iso, iso === '2026-06-12' ? 'absent' : 'present'));
    }

    const statusByDate = buildStatusByDateFromRows(rows);
    const cells = buildCalendarMonthCells(2026, 6, statusByDate);
    const inMonthCells = cells.filter((cell) => cell.inMonth);

    expect(inMonthCells.every((cell) => cell.status !== undefined)).toBe(true);
    expect(inMonthCells.find((cell) => cell.date === '2026-06-12')?.status).toBe('absent');
  });
});
