/** Validated payroll period helpers — prevents arbitrary month/year input bugs. */

export const PAYROLL_MIN_YEAR = 2020;

export function payrollMaxYear(now = new Date()): number {
  return now.getFullYear() + 1;
}

export function clampPayrollMonth(month: number): number {
  if (!Number.isFinite(month)) return 1;
  return Math.min(12, Math.max(1, Math.round(month)));
}

export function clampPayrollYear(year: number, now = new Date()): number {
  if (!Number.isFinite(year)) return now.getFullYear();
  return Math.min(payrollMaxYear(now), Math.max(PAYROLL_MIN_YEAR, Math.round(year)));
}

export function periodFromMonthYear(month: number, year: number): {
  month: number;
  year: number;
  start: string;
  end: string;
  label: string;
} {
  const safeMonth = clampPayrollMonth(month);
  const safeYear = clampPayrollYear(year);
  const start = `${safeYear}-${String(safeMonth).padStart(2, '0')}-01`;
  const lastDay = new Date(safeYear, safeMonth, 0).getDate();
  const end = `${safeYear}-${String(safeMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const label = new Date(`${start}T12:00:00Z`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return { month: safeMonth, year: safeYear, start, end, label };
}

export function stepPayrollMonth(
  month: number,
  year: number,
  delta: -1 | 1,
): { month: number; year: number } {
  let nextMonth = month + delta;
  let nextYear = year;
  if (nextMonth < 1) {
    nextMonth = 12;
    nextYear -= 1;
  } else if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const normalized = periodFromMonthYear(nextMonth, nextYear);
  return { month: normalized.month, year: normalized.year };
}

export const PAYROLL_MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const month = i + 1;
  const label = new Date(2000, i, 1).toLocaleDateString('en-IN', { month: 'long' });
  return { value: String(month), label };
});

export function payrollYearOptions(now = new Date()): { value: string; label: string }[] {
  const max = payrollMaxYear(now);
  const options: { value: string; label: string }[] = [];
  for (let y = max; y >= PAYROLL_MIN_YEAR; y -= 1) {
    options.push({ value: String(y), label: String(y) });
  }
  return options;
}
