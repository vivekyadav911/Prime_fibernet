export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseIsoDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  return new Date(y, m - 1, d);
}

export function formatDisplayDate(iso: string): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return '';
  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

export function clampDate(
  date: Date,
  minimumDate?: Date,
  maximumDate?: Date,
): Date {
  let next = startOfDay(date);
  if (minimumDate && next < startOfDay(minimumDate)) {
    next = startOfDay(minimumDate);
  }
  if (maximumDate && next > startOfDay(maximumDate)) {
    next = startOfDay(maximumDate);
  }
  return next;
}

export function resolveDraftDate(
  value: string,
  minimumDate?: Date,
  maximumDate?: Date,
): Date {
  const parsed = parseIsoDate(value);
  const fallback = minimumDate ?? startOfDay(new Date());
  const candidate = parsed ? startOfDay(parsed) : fallback;
  return clampDate(candidate, minimumDate, maximumDate);
}

export function defaultYearRange(minimumDate?: Date, maximumDate?: Date): {
  minYear: number;
  maxYear: number;
} {
  const currentYear = new Date().getFullYear();
  return {
    minYear: minimumDate?.getFullYear() ?? currentYear - 100,
    maxYear: maximumDate?.getFullYear() ?? currentYear + 10,
  };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function canNavigateMonth(
  year: number,
  month: number,
  direction: -1 | 1,
  minimumDate?: Date,
  maximumDate?: Date,
): boolean {
  let nextMonth = month + direction;
  let nextYear = year;
  if (nextMonth < 0) {
    nextMonth = 11;
    nextYear -= 1;
  } else if (nextMonth > 11) {
    nextMonth = 0;
    nextYear += 1;
  }

  const firstOfNext = new Date(nextYear, nextMonth, 1);
  const lastOfNext = new Date(nextYear, nextMonth, daysInMonth(nextYear, nextMonth));

  if (minimumDate && startOfDay(lastOfNext) < startOfDay(minimumDate)) return false;
  if (maximumDate && startOfDay(firstOfNext) > startOfDay(maximumDate)) return false;
  return true;
}
