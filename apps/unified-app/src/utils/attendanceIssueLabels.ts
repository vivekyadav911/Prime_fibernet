import type { AttendanceIssueCategory } from '@/services/payslip/calculatePayslipCore';

export const ISSUE_CATEGORY_META: Record<
  AttendanceIssueCategory,
  { title: string; description: string; accent: 'error' | 'warning' | 'info' }
> = {
  no_shift_assigned: {
    title: 'No shift assigned',
    description:
      'This officer has no shift schedule. Assign a shift before attendance can be evaluated for scheduled days.',
    accent: 'info',
  },
  no_check_in: {
    title: 'Missing check-in',
    description:
      'Scheduled working day with no attendance record — officer may have been absent or missed check-in.',
    accent: 'error',
  },
  check_in_without_check_out: {
    title: 'Check-in without check-out',
    description: 'Attendance started but was never completed — add check-out or override the day status.',
    accent: 'warning',
  },
};

export function formatIssueDate(isoDate: string): string {
  const parts = isoDate.split('-').map(Number);
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
