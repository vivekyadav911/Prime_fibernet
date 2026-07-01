import type { AttendanceIssueSummary } from '@/services/payslip/calculatePayslipCore';

export function primaryBlockingReason(input: {
  issueSummary: AttendanceIssueSummary;
  missingOfficerFields: string[];
  hasCompensation: boolean;
  snapshotInvalid: boolean;
}): string | null {
  if (input.missingOfficerFields.length > 0) return 'complete officer profile';
  if (!input.hasCompensation) return 'no salary configured';
  if (input.snapshotInvalid) return 'invalid payslip snapshot';
  if (input.issueSummary.noShiftAssigned) return 'no shift assigned';
  if (input.issueSummary.noCheckInCount > 0) {
    return `${input.issueSummary.noCheckInCount} days missing check-in`;
  }
  if (input.issueSummary.incompleteCount > 0) {
    return `${input.issueSummary.incompleteCount} day(s) missing check-out`;
  }
  return null;
}

export function fixIssuesLabel(primaryReason: string | null): string {
  if (!primaryReason) return 'Fix issues';
  return `Fix issues — ${primaryReason}`;
}
