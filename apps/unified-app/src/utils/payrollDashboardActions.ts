import type { PayrollDashboardEntry } from '@/types/payslip';

export function canReviewPayslip(entry: PayrollDashboardEntry): boolean {
  return Boolean(
    entry.payslipId &&
      !entry.blocked &&
      !entry.warningCodes.includes('snapshot_invalid'),
  );
}

export function shouldShowNetPay(entry: PayrollDashboardEntry): boolean {
  return entry.netPayPreview != null && canReviewPayslip(entry);
}

export function hasInvalidSnapshot(entry: PayrollDashboardEntry): boolean {
  return entry.warningCodes.includes('snapshot_invalid');
}

export function isPayrollEligible(entry: PayrollDashboardEntry): boolean {
  return entry.missingOfficerFields.length === 0;
}
