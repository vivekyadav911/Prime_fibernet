import type { AttendanceStatus } from '@/types/attendance';

export type CalendarDayCell = {
  date: string;
  day: number;
  inMonth: boolean;
  status?: AttendanceStatus;
};

export const CALENDAR_STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: '#22C55E',
  absent: '#EF4444',
  late: '#F59E0B',
  half_day: '#14B8A6',
  on_leave: '#1E3A5F',
  holiday: '#D1D5DB',
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function buildCalendarMonthCells(
  year: number,
  month: number,
  statusByDate: Map<string, AttendanceStatus>,
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
    const date = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ date, day, inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;
    cells.push({ date, day, inMonth: true, status: statusByDate.get(date) });
  }

  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  let trailingDay = 1;
  while (cells.length < totalCells) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const date = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(trailingDay).padStart(2, '0')}`;
    cells.push({ date, day: trailingDay, inMonth: false });
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
