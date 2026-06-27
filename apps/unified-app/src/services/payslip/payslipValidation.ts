import type { PayrollWarningCode, Payslip, PayslipDailyBreakdown } from '@/types/payslip';

const MONEY_TOLERANCE = 0.02;
const HOURS_TOLERANCE = 0.05;

export type PayslipSnapshotValidation = {
  valid: boolean;
  errors: string[];
};

export type PayslipApprovalValidation = {
  allowed: boolean;
  blockingFlags: PayrollWarningCode[];
  reasons: string[];
};

export function validatePayslipSnapshotConsistency(payslip: {
  grossEarnings: number;
  netPay: number;
  totalActualHours: number;
  hourlyRate: number;
  totalAdditions: number;
  totalDeductions: number;
  dailyBreakdown?: PayslipDailyBreakdown[];
}): PayslipSnapshotValidation {
  const errors: string[] = [];
  const breakdown = payslip.dailyBreakdown ?? [];

  if (breakdown.length === 0 && payslip.grossEarnings > 0) {
    errors.push('Daily breakdown is empty but gross earnings is non-zero (stale payslip snapshot)');
  }

  const breakdownGross = breakdown.reduce((sum, row) => sum + row.dayPay, 0);
  if (Math.abs(breakdownGross - payslip.grossEarnings) > MONEY_TOLERANCE) {
    errors.push(
      `Daily breakdown gross (${breakdownGross.toFixed(2)}) does not match summary gross (${payslip.grossEarnings.toFixed(2)})`,
    );
  }

  const breakdownHours = breakdown.reduce((sum, row) => sum + row.actualHours, 0);
  if (Math.abs(breakdownHours - payslip.totalActualHours) > HOURS_TOLERANCE) {
    errors.push(
      `Daily breakdown hours (${breakdownHours.toFixed(2)}) do not match summary hours (${payslip.totalActualHours.toFixed(2)})`,
    );
  }

  const expectedNet = payslip.grossEarnings + payslip.totalAdditions - payslip.totalDeductions;
  if (Math.abs(expectedNet - payslip.netPay) > MONEY_TOLERANCE) {
    errors.push(
      `Net pay (${payslip.netPay.toFixed(2)}) does not reconcile with gross + additions − deductions`,
    );
  }

  if (payslip.grossEarnings > 0 && payslip.hourlyRate <= 0 && breakdown.some((d) => d.dayPay > 0)) {
    errors.push('Hourly rate is zero but paid days exist in the breakdown');
  }

  const labelsMissing = breakdown.filter((d) => d.isScheduledWorkingDay && !d.displayLabel?.trim());
  if (labelsMissing.length > 0) {
    errors.push(`${labelsMissing.length} scheduled day(s) missing attendance labels in breakdown`);
  }

  return { valid: errors.length === 0, errors };
}

export function buildBlockingWarningCodes(input: {
  missingOfficerFields: string[];
  hasCompensation: boolean;
  hasShiftAssignment: boolean;
  unresolvedCount: number;
  incompleteCount: number;
  netPay: number | null;
  snapshotValid: boolean;
}): PayrollWarningCode[] {
  const codes: PayrollWarningCode[] = [];
  if (input.missingOfficerFields.length) codes.push('missing_officer_data');
  if (!input.hasCompensation) codes.push('no_compensation');
  if (!input.hasShiftAssignment) codes.push('no_shift_assigned');
  if (input.unresolvedCount > 0) codes.push('unresolved_attendance');
  if (input.incompleteCount > 0) codes.push('incomplete_attendance');
  if (input.netPay === 0) codes.push('zero_pay');
  if (!input.snapshotValid) codes.push('snapshot_invalid');
  return codes;
}

export function validatePayslipCanApprove(input: {
  warningCodes: PayrollWarningCode[];
  snapshotErrors: string[];
  netPay: number;
  overrideNote?: string;
}): PayslipApprovalValidation {
  const blockingFlags = input.warningCodes.filter(
    (c) => c !== 'zero_pay',
  );

  const reasons: string[] = [...input.snapshotErrors];

  if (blockingFlags.includes('missing_officer_data')) {
    reasons.push('Officer profile is incomplete — cannot approve');
  }
  if (blockingFlags.includes('no_shift_assigned')) {
    reasons.push('Officer has no shift schedule assigned — cannot approve');
  }
  if (blockingFlags.includes('unresolved_attendance')) {
    reasons.push('Unresolved attendance days remain — cannot approve');
  }
  if (blockingFlags.includes('incomplete_attendance')) {
    reasons.push('Incomplete attendance (missing check-out) — cannot approve');
  }
  if (blockingFlags.includes('no_compensation')) {
    reasons.push('No salary record configured — cannot approve');
  }
  if (blockingFlags.includes('snapshot_invalid')) {
    reasons.push('Payslip snapshot is inconsistent — regenerate before approving');
  }

  if (input.netPay <= 0 && !input.overrideNote?.trim()) {
    reasons.push('Net pay is zero or negative — override note required');
  }

  const allowed = reasons.length === 0;

  return {
    allowed,
    blockingFlags: [...blockingFlags, ...(input.netPay <= 0 ? (['zero_pay'] as const) : [])],
    reasons,
  };
}

export function payslipNeedsReviewError(payslip: Payslip): string | null {
  const validation = validatePayslipSnapshotConsistency(payslip);
  if (!validation.valid) {
    return validation.errors.join('\n');
  }
  return null;
}

export function dayBeforeIso(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function formatCompensationRange(
  effectiveFrom: string,
  effectiveTo: string | null,
  now = new Date(),
): string {
  const fromLabel = new Date(`${effectiveFrom}T12:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  if (!effectiveTo) {
    return `${fromLabel} to present`;
  }
  const toLabel = new Date(`${effectiveTo}T12:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const isSuperseded = effectiveTo < now.toISOString().slice(0, 10);
  return `${fromLabel} to ${toLabel}${isSuperseded ? ' (superseded)' : ''}`;
}
