import {
  compensationForDate,
  computeHourlyRate,
  shiftHoursPerDay,
  type CompensationInput,
  type PayTypeRuleInput,
  type ShiftDefinitionInput,
} from '@/services/payslip/calculatePayslipCore';

export type BulkOverrideStatusChoice = 'unpaid_leave' | 'absent' | 'paid_leave' | 'holiday';

export const BULK_OVERRIDE_STATUS_OPTIONS: Array<{
  value: BulkOverrideStatusChoice;
  label: string;
  description: string;
}> = [
  {
    value: 'unpaid_leave',
    label: 'Unpaid leave',
    description: 'Marked as leave on the timesheet — no earnings for these days',
  },
  {
    value: 'absent',
    label: 'Absent',
    description: 'Unpaid absence — no earnings for these days',
  },
  {
    value: 'paid_leave',
    label: 'Paid leave',
    description: 'Full scheduled-day pay per your paid-leave rule',
  },
  {
    value: 'holiday',
    label: 'Holiday',
    description: 'Paid per your holiday rule (scheduled hours)',
  },
];

export function bulkOverrideStatusLabel(choice: BulkOverrideStatusChoice): string {
  return BULK_OVERRIDE_STATUS_OPTIONS.find((o) => o.value === choice)?.label ?? choice;
}

/** Maps UI choice to shift attendance_status + bulk pay mode stored on the shift row. */
export function resolveBulkOverrideStorage(choice: BulkOverrideStatusChoice): {
  attendanceStatus: string;
  payrollBulkPayMode: 'paid' | 'unpaid' | null;
} {
  switch (choice) {
    case 'paid_leave':
      return { attendanceStatus: 'on_leave', payrollBulkPayMode: 'paid' };
    case 'unpaid_leave':
      return { attendanceStatus: 'on_leave', payrollBulkPayMode: 'unpaid' };
    case 'holiday':
      return { attendanceStatus: 'holiday', payrollBulkPayMode: null };
    case 'absent':
    default:
      return { attendanceStatus: 'absent', payrollBulkPayMode: 'unpaid' };
  }
}

export function estimateBulkOverridePayImpact(input: {
  dates: string[];
  choice: BulkOverrideStatusChoice;
  compensations: CompensationInput[];
  shiftDefinition: ShiftDefinitionInput;
  payRules: PayTypeRuleInput[];
}): { totalImpact: number; perDayAverage: number; statusLabel: string } {
  const { attendanceStatus, payrollBulkPayMode } = resolveBulkOverrideStorage(input.choice);
  const shiftHours = shiftHoursPerDay(input.shiftDefinition);
  const rule = input.payRules.find((r) => r.attendanceStatus === attendanceStatus);

  if (
    attendanceStatus === 'absent' ||
    payrollBulkPayMode === 'unpaid' ||
    !rule ||
    rule.payFraction <= 0
  ) {
    return {
      totalImpact: 0,
      perDayAverage: 0,
      statusLabel: bulkOverrideStatusLabel(input.choice),
    };
  }

  let total = 0;
  for (const date of input.dates) {
    const comp = compensationForDate(input.compensations, date);
    const hourlyRate = computeHourlyRate(comp.monthlySalary, input.shiftDefinition);
    const hoursCounted = rule.usesScheduledHours ? shiftHours : 0;
    total += Math.round(hourlyRate * hoursCounted * rule.payFraction * 100) / 100;
  }

  const totalImpact = Math.round(total * 100) / 100;
  return {
    totalImpact,
    perDayAverage: input.dates.length ? Math.round((totalImpact / input.dates.length) * 100) / 100 : 0,
    statusLabel: bulkOverrideStatusLabel(input.choice),
  };
}
