import {
  calculatePayslipCore,
  PayslipCalculationError,
  payslipRenderSnapshot,
  summarizePayPeriodAttendance,
  type CalculatePayslipCoreInput,
  type LabelThresholdInput,
  type PayTypeRuleInput,
  type ShiftDefinitionInput,
  type ShiftRecordInput,
} from '@/services/payslip/calculatePayslipCore';
import {
  buildBlockingWarningCodes,
  validatePayslipSnapshotConsistency,
} from '@/services/payslip/payslipValidation';
import { buildGenerationPreview } from '@/services/payroll/payrollDashboardBuilder';
import { buildPayslipHtml } from '@/utils/payslipPdf';
import type { Payslip } from '@/types/payslip';

const SHIFT: ShiftDefinitionInput = {
  startTime: '09:00:00',
  endTime: '18:00:00',
  workingDays: [1, 2, 3, 4, 5, 6],
  isOvernight: false,
};

const THRESHOLDS: LabelThresholdInput[] = [
  { label: 'Present', minHoursFraction: 0.9, maxHoursFraction: 1.0, sortOrder: 50 },
  { label: 'Half Day', minHoursFraction: 0.5, maxHoursFraction: 0.899, sortOrder: 40 },
  { label: 'Absent', minHoursFraction: 0, maxHoursFraction: 0.499, sortOrder: 10 },
];

const PAY_RULES: PayTypeRuleInput[] = [
  { attendanceStatus: 'present', payFraction: 1, usesScheduledHours: false },
  { attendanceStatus: 'half_day', payFraction: 0.5, usesScheduledHours: false },
  { attendanceStatus: 'on_leave', payFraction: 1, usesScheduledHours: true },
  { attendanceStatus: 'holiday', payFraction: 1, usesScheduledHours: true },
  { attendanceStatus: 'absent', payFraction: 0, usesScheduledHours: true },
];

const OFFICER = {
  officerId: 'officer-integration-001',
  fullName: 'Integration Officer',
  employeeId: 'EMP-9001',
  department: 'Operations',
  designation: 'Field Officer',
  bankAccountNumber: '9876543210',
};

function shiftForDate(
  date: string,
  attendanceStatus: string,
  workingHours: number,
): ShiftRecordInput {
  return {
    id: `shift-${date}`,
    shiftDate: date,
    checkInTime: `${date}T09:00:00Z`,
    checkOutTime: `${date}T18:00:00Z`,
    attendanceStatus,
    workingHours,
    status: 'completed',
  };
}

/** June 2026 — Mon–Sat working week, 30 days, mixed attendance, zero unresolved. */
function june2026CompleteMonthShifts(): ShiftRecordInput[] {
  const shifts: ShiftRecordInput[] = [];
  for (let day = 1; day <= 30; day += 1) {
    const date = `2026-06-${String(day).padStart(2, '0')}`;
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (dow === 0) continue; // Sunday weekly off
    if (day === 5) {
      shifts.push(shiftForDate(date, 'on_leave', 0));
    } else if (day === 12) {
      shifts.push(shiftForDate(date, 'half_day', 4.5));
    } else if (day === 18) {
      shifts.push(shiftForDate(date, 'absent', 0));
    } else {
      shifts.push(shiftForDate(date, 'present', 9));
    }
  }
  return shifts;
}

function fullFixtureInput(
  overrides: Partial<CalculatePayslipCoreInput> = {},
): CalculatePayslipCoreInput {
  return {
    officer: OFFICER,
    payPeriodStart: '2026-06-01',
    payPeriodEnd: '2026-06-30',
    payPeriodLabel: 'June 2026',
    compensations: [
      {
        id: 'comp-single',
        monthlySalary: 25000,
        effectiveFrom: '2026-01-01',
        effectiveTo: null,
      },
    ],
    shiftDefinition: SHIFT,
    hasShiftAssignment: true,
    shifts: june2026CompleteMonthShifts(),
    holidays: ['2026-06-15'],
    payRules: PAY_RULES,
    labelThresholds: THRESHOLDS,
    ...overrides,
  };
}

function payslipFromResult(
  result: ReturnType<typeof calculatePayslipCore>,
): Payslip {
  return {
    id: 'ps-integration',
    officerId: OFFICER.officerId,
    payPeriodStart: result.period.start,
    payPeriodEnd: result.period.end,
    payPeriodLabel: result.period.label,
    companyName: 'Prime Fibernet',
    companyAddress: 'Test',
    companyLogoUrl: null,
    employeeName: result.officerSnapshot.fullName,
    employeeDesignation: result.officerSnapshot.designation,
    employeeIdDisplay: result.officerSnapshot.employeeIdDisplay,
    employeeDepartment: result.officerSnapshot.department,
    bankAccountLast4: result.officerSnapshot.bankAccountLast4,
    hourlyRate: result.hourlyRate,
    totalScheduledDays: result.workingDays,
    totalWorkedDays: result.totalWorkedDays,
    totalActualHours: result.totalActualHours,
    grossEarnings: result.grossPay,
    totalAdditions: result.additions,
    totalDeductions: result.deductions,
    netPay: result.netPay,
    status: 'draft',
    generatedPdfUrl: null,
    authorizedBy: null,
    authorizedSignatureName: null,
    authorizedAt: null,
    generatedBy: null,
    negativePayOverrideNote: null,
    voidedAt: null,
    voidedBy: null,
    voidReason: null,
    calculationWarnings: result.warnings,
    createdAt: result.generatedAt,
    updatedAt: result.generatedAt,
    dailyBreakdown: result.dailyBreakdown.map((d, i) => ({
      id: `bd-${i}`,
      payslipId: 'ps-integration',
      date: d.date,
      attendanceRecordId: d.attendanceRecordId,
      isScheduledWorkingDay: d.isScheduledWorkingDay,
      actualHours: d.actualHours,
      displayLabel: d.displayLabel,
      dayPay: d.dayPay,
      hourlyRateApplied: d.hourlyRateApplied,
      createdAt: result.generatedAt,
    })),
  };
}

describe('payslip integration fixtures', () => {
  it('generates a complete June payslip with reconciled review and PDF totals', () => {
    const result = calculatePayslipCore(fullFixtureInput());
    expect(result.blocked).toBe(false);
    expect(result.hourlyRate).toBeGreaterThan(0);
    expect(result.totalActualHours).toBeGreaterThan(0);

    const breakdownGross = result.dailyBreakdown.reduce((s, d) => s + d.dayPay, 0);
    const breakdownHours = result.dailyBreakdown.reduce((s, d) => s + d.actualHours, 0);
    expect(result.grossPay).toBeCloseTo(breakdownGross, 2);
    expect(result.totalActualHours).toBeCloseTo(breakdownHours, 2);

    const payslip = payslipFromResult(result);
    const snapshotCheck = validatePayslipSnapshotConsistency(payslip);
    expect(snapshotCheck.valid).toBe(true);

    const reviewSnapshot = payslipRenderSnapshot(payslip);
    const pdfHtml = buildPayslipHtml(payslip);
    const pdfSnapshot = payslipRenderSnapshot(payslip);
    expect(reviewSnapshot).toBe(pdfSnapshot);
    expect(pdfHtml).toContain(formatCurrencyInPdf(result.netPay));
    expect(pdfHtml).toContain(String(result.totalActualHours));
  });

  it('blocks confirm-generation preview when shift assignment is missing', () => {
    const attendanceSummary = summarizePayPeriodAttendance({
      payPeriodStart: '2026-06-01',
      payPeriodEnd: '2026-06-30',
      shiftDefinition: SHIFT,
      hasShiftAssignment: false,
      shifts: [],
      holidays: [],
    });
    expect(attendanceSummary.noShiftAssigned).toBe(true);
    expect(attendanceSummary.canGenerate).toBe(false);

    const preview = buildGenerationPreview({
      officerId: OFFICER.officerId,
      officerName: OFFICER.fullName!,
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      periodLabel: 'June 2026',
      shiftDefinition: SHIFT,
      hasShiftAssignment: false,
      shifts: [],
      holidays: [],
      missingOfficerFields: [],
      hasCompensation: true,
    });
    expect(preview.canGenerate).toBe(false);
    expect(preview.warnings.some((w) => w.includes('shift'))).toBe(true);

    const codes = buildBlockingWarningCodes({
      missingOfficerFields: [],
      hasCompensation: true,
      hasShiftAssignment: false,
      unresolvedCount: 0,
      incompleteCount: 0,
      netPay: null,
      snapshotValid: true,
    });
    expect(codes).toContain('no_shift_assigned');

    expect(() => calculatePayslipCore(fullFixtureInput({ hasShiftAssignment: false }))).toThrow(
      PayslipCalculationError,
    );
    try {
      calculatePayslipCore(fullFixtureInput({ hasShiftAssignment: false }));
    } catch (e) {
      expect(e).toBeInstanceOf(PayslipCalculationError);
      expect((e as PayslipCalculationError).code).toBe('NO_SHIFT_ASSIGNED');
    }
  });

  it('throws when multiple salary records cover the same day', () => {
    expect(() =>
      calculatePayslipCore(
        fullFixtureInput({
          compensations: [
            {
              id: 'comp-a',
              monthlySalary: 50000,
              effectiveFrom: '2026-05-27',
              effectiveTo: null,
            },
            {
              id: 'comp-b',
              monthlySalary: 25000,
              effectiveFrom: '2026-06-18',
              effectiveTo: null,
            },
          ],
        }),
      ),
    ).toThrow(PayslipCalculationError);
  });
});

function formatCurrencyInPdf(amount: number): string {
  return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
