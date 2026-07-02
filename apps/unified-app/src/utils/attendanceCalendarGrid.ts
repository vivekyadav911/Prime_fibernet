import type { AttendanceRecord, AttendanceStatus } from '@/types/attendance';
import { parseLocalDateString } from '@/utils/dateUtils';

export type CalendarDayCell = {
  date: string;
  day: number;
  inMonth: boolean;
  isWeekend: boolean;
  status?: AttendanceStatus;
  density?: DayAttendanceDensity;
};

export type DayAttendanceDensity = {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  onLeave: number;
  holiday: number;
  total: number;
};

export const CALENDAR_STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: '#1a4731',
  absent: '#7f1d1d',
  late: '#92400e',
  half_day: '#134e4a',
  on_leave: '#1e3a5f',
  holiday: '#E5E7EB',
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isWeekendDate(year: number, monthIndex: number, day: number): boolean {
  const weekday = new Date(year, monthIndex, day).getDay();
  return weekday === 0 || weekday === 6;
}

export function buildDayDensityMap(records: AttendanceRecord[]): Map<string, DayAttendanceDensity> {
  const map = new Map<string, DayAttendanceDensity>();

  records.forEach((record) => {
    const existing = map.get(record.date) ?? {
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      onLeave: 0,
      holiday: 0,
      total: 0,
    };

    existing.total += 1;
    switch (record.status) {
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

    map.set(record.date, existing);
  });

  return map;
}

export function buildStatusByDateForOfficer(
  records: AttendanceRecord[],
  officerId: string,
): Map<string, AttendanceStatus> {
  const map = new Map<string, AttendanceStatus>();
  records
    .filter((record) => record.officerId === officerId)
    .forEach((record) => map.set(record.date, record.status));
  return map;
}

export function buildCalendarMonthCells(
  year: number,
  month: number,
  statusByDate: Map<string, AttendanceStatus>,
  densityByDate: Map<string, DayAttendanceDensity> = new Map(),
): CalendarDayCell[] {
  const monthIndex = month - 1;
  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const monthStr = String(month).padStart(2, '0');
  const cells: CalendarDayCell[] = [];

  const prevMonthDays = getDaysInMonth(year, month === 1 ? 12 : month - 1);
  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    const day = prevMonthDays - i;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthIndex = prevMonth - 1;
    const date = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({
      date,
      day,
      inMonth: false,
      isWeekend: isWeekendDate(prevYear, prevMonthIndex, day),
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;
    cells.push({
      date,
      day,
      inMonth: true,
      isWeekend: isWeekendDate(year, monthIndex, day),
      status: statusByDate.get(date),
      density: densityByDate.get(date),
    });
  }

  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  let trailingDay = 1;
  while (cells.length < totalCells) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonthIndex = nextMonth - 1;
    const date = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(trailingDay).padStart(2, '0')}`;
    cells.push({
      date,
      day: trailingDay,
      inMonth: false,
      isWeekend: isWeekendDate(nextYear, nextMonthIndex, trailingDay),
    });
    trailingDay += 1;
  }

  return cells;
}

export function chunkCalendarRows(cells: CalendarDayCell[]): CalendarDayCell[][] {
  const rows: CalendarDayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

export function listMonthsBetween(fromIso: string, toIso: string): Array<{ year: number; month: number }> {
  const [fromY, fromM] = fromIso.split('-').map(Number);
  const [toY, toM] = toIso.split('-').map(Number);
  const months: Array<{ year: number; month: number }> = [];

  let y = fromY!;
  let m = fromM!;
  const endY = toY!;
  const endM = toM!;

  while (y < endY || (y === endY && m <= endM)) {
    months.push({ year: y, month: m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }

  return months;
}

export function getMonthIsoRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = getDaysInMonth(year, month);
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

export function formatMonthYearLabel(year: number, month: number): string {
  return parseLocalDateString(`${year}-${String(month).padStart(2, '0')}-01`).toLocaleDateString([], {
    month: 'short',
    year: 'numeric',
  });
}
