import { buildPayrollDashboardEntries } from '@/services/payroll/payrollDashboardBuilder';
import type { PayrollDashboardEntry } from '@/types/payslip';
import {
  canReviewPayslip,
  hasInvalidSnapshot,
  isPayrollEligible,
  shouldShowNetPay,
} from '@/utils/payrollDashboardActions';
import { dayBeforeIso } from '@/services/payslip/payslipValidation';

function baseEntry(overrides: Partial<PayrollDashboardEntry> = {}): PayrollDashboardEntry {
  return {
    officerId: 'off-1',
    officerName: 'Test Officer',
    avatarUrl: null,
    payslipId: 'ps-1',
    status: 'needs_review',
    netPayPreview: 25500,
    generatedPdfUrl: null,
    payPeriodLabel: 'June 2026',
    payPeriodStart: '2026-06-01',
    payPeriodEnd: '2026-06-30',
    blocked: true,
    blockingDates: [],
    attendanceSummary: {
      workingDays: 26,
      present: 5,
      absent: 0,
      leave: 0,
      holiday: 0,
      weeklyOff: 0,
      unresolved: 21,
      incomplete: 0,
      unresolvedDates: [],
      incompleteDates: [],
      canGenerate: false,
      noShiftAssigned: false,
      issueSummary: {
        noShiftAssigned: false,
        noCheckInCount: 21,
        noCheckInDates: [],
        incompleteCount: 0,
        incompleteDates: [],
        issues: [],
        primaryIssue: 'no_check_in',
      },
      warnings: [],
    },
    warningCodes: ['snapshot_invalid', 'missing_officer_data'],
    missingOfficerFields: ['full_name'],
    hasCompensation: true,
    hasShiftAssignment: true,
    fixIssuesHint: null,
    ...overrides,
  };
}

describe('payrollDashboardActions', () => {
  it('blocks review and net pay for invalid snapshot entries', () => {
    const entry = baseEntry();
    expect(hasInvalidSnapshot(entry)).toBe(true);
    expect(canReviewPayslip(entry)).toBe(false);
    expect(shouldShowNetPay(entry)).toBe(false);
  });

  it('allows review when payslip is valid and not blocked', () => {
    const entry = baseEntry({
      blocked: false,
      warningCodes: [],
      missingOfficerFields: [],
      status: 'draft',
    });
    expect(canReviewPayslip(entry)).toBe(true);
    expect(shouldShowNetPay(entry)).toBe(true);
  });

  it('excludes officers with incomplete profiles from eligibility', () => {
    expect(isPayrollEligible(baseEntry())).toBe(false);
    expect(isPayrollEligible(baseEntry({ missingOfficerFields: [] }))).toBe(true);
  });

  it('marks dashboard entries with empty breakdown as blocked', () => {
    const entries = buildPayrollDashboardEntries({
      officers: [{ id: 'off-1', full_name: 'Valid', profile_photo_url: null }],
      payslips: [
        {
          id: 'ps-1',
          officer_id: 'off-1',
          status: 'needs_review',
          net_pay: 25500,
          gross_earnings: 25000,
          hourly_rate: 0,
          total_actual_hours: 0,
          total_additions: 500,
          total_deductions: 0,
          generated_pdf_url: null,
          pay_period_label: 'June 2026',
          employee_name: 'Valid',
          payslip_daily_breakdown: [],
        },
      ],
      shifts: [],
      holidays: [],
      shiftDefinitions: [
        {
          officer_id: 'off-1',
          shift_definitions: {
            start_time: '09:00:00',
            end_time: '18:00:00',
            working_days: [1, 2, 3, 4, 5, 6],
            is_overnight: false,
          },
        },
      ],
      profiles: [
        {
          officer_id: 'off-1',
          full_name: 'Valid',
          employee_id: null,
          designation: 'Tech',
          department: 'Ops',
          bank_account_number: '1234567890',
          has_compensation: true,
        },
      ],
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      periodLabel: 'June 2026',
    });

    expect(entries[0]?.blocked).toBe(true);
    expect(entries[0]?.warningCodes).toContain('snapshot_invalid');
    expect(canReviewPayslip(entries[0]!)).toBe(false);
  });
});

describe('compensation supersession', () => {
  it('dayBeforeIso returns the prior calendar day', () => {
    expect(dayBeforeIso('2026-06-18')).toBe('2026-06-17');
  });

  it('non-overlapping ranges do not share a day', () => {
    const firstEnd = dayBeforeIso('2026-06-18');
    expect(firstEnd).toBe('2026-06-17');
    expect(firstEnd < '2026-06-18').toBe(true);
  });
});
