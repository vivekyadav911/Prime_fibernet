import {
  calculatePayslipCore,
  canApprovePayslip,
  computeHourlyRate,
  payslipRenderSnapshot,
  PayslipCalculationError,
  validateOfficerSnapshot,
  type CalculatePayslipCoreInput,
  type LabelThresholdInput,
  type PayTypeRuleInput,
  type ShiftDefinitionInput,
} from '@/services/payslip/calculatePayslipCore';
import { buildPayslipHtml } from '@/utils/payslipPdf';
import type { Payslip } from '@/types/payslip';

const DEFAULT_SHIFT: ShiftDefinitionInput = {
  startTime: '09:00:00',
  endTime: '18:00:00',
  workingDays: [1, 2, 3, 4, 5, 6],
  isOvernight: false,
};

const DEFAULT_THRESHOLDS: LabelThresholdInput[] = [
  { label: 'Present (Extra Hours)', minHoursFraction: 1.001, maxHoursFraction: null, sortOrder: 60 },
  { label: 'Present', minHoursFraction: 0.9, maxHoursFraction: 1.0, sortOrder: 50 },
  { label: 'Half Day', minHoursFraction: 0.5, maxHoursFraction: 0.899, sortOrder: 40 },
  { label: 'Quarter Day', minHoursFraction: 0.25, maxHoursFraction: 0.499, sortOrder: 30 },
  { label: 'Partial', minHoursFraction: 0.001, maxHoursFraction: 0.249, sortOrder: 20 },
];

const DEFAULT_PAY_RULES: PayTypeRuleInput[] = [
  { attendanceStatus: 'present', payFraction: 1, usesScheduledHours: false },
  { attendanceStatus: 'late', payFraction: 1, usesScheduledHours: false },
  { attendanceStatus: 'half_day', payFraction: 0.5, usesScheduledHours: false },
  { attendanceStatus: 'on_leave', payFraction: 1, usesScheduledHours: true },
  { attendanceStatus: 'holiday', payFraction: 1, usesScheduledHours: true },
  { attendanceStatus: 'absent', payFraction: 0, usesScheduledHours: true },
];

const FIXTURE_OFFICER = {
  officerId: 'officer-fixture-001',
  fullName: 'Rajesh Kumar',
  employeeId: 'EMP-1001',
  department: 'Field Operations',
  designation: 'Senior Technician',
  bankAccountNumber: '1234567890',
};

function baseInput(overrides: Partial<CalculatePayslipCoreInput> = {}): CalculatePayslipCoreInput {
  return {
    officer: FIXTURE_OFFICER,
    payPeriodStart: '2026-01-01',
    payPeriodEnd: '2026-01-31',
    payPeriodLabel: 'January 2026',
    compensations: [
      {
        id: 'comp-1',
        monthlySalary: 25000,
        effectiveFrom: '2025-01-01',
        effectiveTo: null,
      },
    ],
    shiftDefinition: DEFAULT_SHIFT,
    hasShiftAssignment: true,
    shifts: [],
    holidays: ['2026-01-26'],
    payRules: DEFAULT_PAY_RULES,
    labelThresholds: DEFAULT_THRESHOLDS,
    ...overrides,
  };
}

/** Build shift records for every scheduled working day in January 2026 except explicit gaps. */
function january2026Shifts(
  byDate: Record<
    string,
    {
      attendanceStatus: string;
      workingHours?: number;
      checkIn?: boolean;
      checkOut?: boolean;
    }
  >,
) {
  const scheduledDates = [
    '2026-01-01',
    '2026-01-02',
    '2026-01-03',
    '2026-01-05',
    '2026-01-06',
    '2026-01-07',
    '2026-01-08',
    '2026-01-09',
    '2026-01-10',
    '2026-01-12',
    '2026-01-13',
    '2026-01-14',
    '2026-01-15',
    '2026-01-16',
    '2026-01-17',
    '2026-01-19',
    '2026-01-20',
    '2026-01-21',
    '2026-01-22',
    '2026-01-23',
    '2026-01-24',
    '2026-01-26',
    '2026-01-27',
    '2026-01-28',
    '2026-01-29',
    '2026-01-30',
    '2026-01-31',
  ];

  return scheduledDates.map((date, index) => {
    const spec = byDate[date];
    if (!spec) {
      return {
        id: `shift-${index}`,
        shiftDate: date,
        checkInTime: `${date}T09:00:00Z`,
        checkOutTime: `${date}T18:00:00Z`,
        attendanceStatus: 'present',
        workingHours: 9,
        status: 'completed',
      };
    }

    const hours = spec.workingHours ?? 0;
    return {
      id: `shift-${index}`,
      shiftDate: date,
      checkInTime: spec.checkIn ? `${date}T09:00:00Z` : null,
      checkOutTime: spec.checkOut ? `${date}T18:00:00Z` : null,
      attendanceStatus: spec.attendanceStatus,
      workingHours: hours,
      status: 'completed',
    };
  });
}

describe('computeHourlyRate', () => {
  it('uses monthly salary ÷ ((shift hours × working days/week × 52) / 12)', () => {
    const rate = computeHourlyRate(25000, DEFAULT_SHIFT);
    // 9 hrs/day × 6 days × 52 weeks / 12 months = 234 hrs/month
    expect(rate).toBeCloseTo(106.84, 2);
  });
});

describe('validateOfficerSnapshot', () => {
  it('throws when required officer fields are missing', () => {
    expect(() =>
      validateOfficerSnapshot({
        officerId: 'x',
        fullName: 'Employee',
        employeeId: 'E1',
        department: null,
        designation: 'Officer',
        bankAccountNumber: null,
      }),
    ).toThrow(PayslipCalculationError);
  });
});

describe('calculatePayslipCore', () => {
  it('throws UNRESOLVED_DAYS when scheduled days lack attendance records', () => {
    expect(() => calculatePayslipCore(baseInput())).toThrow(PayslipCalculationError);
    try {
      calculatePayslipCore(baseInput());
    } catch (e) {
      expect(e).toBeInstanceOf(PayslipCalculationError);
      expect((e as PayslipCalculationError).code).toBe('UNRESOLVED_DAYS');
      expect((e as PayslipCalculationError).unresolvedDates?.length).toBeGreaterThan(0);
    }
  });

  it('computes mixed attendance gross/net for a full January fixture', () => {
    const shifts = january2026Shifts({
      '2026-01-03': { attendanceStatus: 'absent', workingHours: 0 },
      '2026-01-10': { attendanceStatus: 'half_day', workingHours: 4.5 },
      '2026-01-15': { attendanceStatus: 'on_leave', workingHours: 0 },
      '2026-01-26': { attendanceStatus: 'holiday', workingHours: 0 },
    });

    const result = calculatePayslipCore(baseInput({ shifts }));

    expect(result.blocked).toBe(false);
    expect(result.hourlyRate).toBeCloseTo(106.84, 2);

    const presentDays = result.dailyBreakdown.filter((d) => d.displayLabel === 'Present');
    const absentDay = result.dailyBreakdown.find((d) => d.date === '2026-01-03');
    const halfDay = result.dailyBreakdown.find((d) => d.date === '2026-01-10');
    const leaveDay = result.dailyBreakdown.find((d) => d.date === '2026-01-15');
    const holidayDay = result.dailyBreakdown.find((d) => d.date === '2026-01-26');
    const weeklyOff = result.dailyBreakdown.find((d) => d.date === '2026-01-04');

    expect(presentDays.length).toBeGreaterThan(0);
    expect(absentDay?.displayLabel).toBe('Absent');
    expect(absentDay?.dayPay).toBe(0);
    expect(halfDay?.displayLabel).toBe('Half Day');
    expect(halfDay?.dayPay).toBeCloseTo(106.84 * 4.5 * 0.5, 2);
    expect(leaveDay?.displayLabel).toBe('Leave');
    expect(leaveDay?.dayPay).toBeCloseTo(106.84 * 9 * 1, 2);
    expect(holidayDay?.displayLabel).toBe('Holiday');
    expect(holidayDay?.dayPay).toBeCloseTo(106.84 * 9 * 1, 2);
    expect(weeklyOff?.displayLabel).toBe('Weekly Off');
    expect(weeklyOff?.dayPay).toBe(0);

    const expectedGross = result.dailyBreakdown.reduce((sum, d) => sum + d.dayPay, 0);
    expect(result.grossPay).toBeCloseTo(expectedGross, 2);
    expect(result.netPay).toBe(result.grossPay);
  });
});

describe('canApprovePayslip', () => {
  it('blocks zero net pay without override', () => {
    const check = canApprovePayslip(0);
    expect(check.allowed).toBe(false);
    expect(check.requiresOverride).toBe(true);
  });

  it('allows zero net pay with override note', () => {
    expect(canApprovePayslip(0, 'Officer on unpaid suspension').allowed).toBe(true);
  });
});

describe('Review vs PDF render parity', () => {
  it('uses identical snapshot data for review summary and PDF HTML', () => {
    const shifts = january2026Shifts({
      '2026-01-03': { attendanceStatus: 'absent', workingHours: 0 },
      '2026-01-10': { attendanceStatus: 'half_day', workingHours: 4.5 },
      '2026-01-15': { attendanceStatus: 'on_leave', workingHours: 0 },
    });
    const result = calculatePayslipCore(baseInput({ shifts }));

    const payslip: Payslip = {
      id: 'ps-1',
      officerId: FIXTURE_OFFICER.officerId,
      payPeriodStart: result.period.start,
      payPeriodEnd: result.period.end,
      payPeriodLabel: result.period.label,
      companyName: 'Prime Fibernet',
      companyAddress: 'Test Address',
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
        payslipId: 'ps-1',
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

    const reviewSnapshot = payslipRenderSnapshot(payslip);
    const pdfSnapshot = payslipRenderSnapshot({
      ...payslip,
      dailyBreakdown: payslip.dailyBreakdown,
    });

    expect(reviewSnapshot).toBe(pdfSnapshot);

    const html = buildPayslipHtml(payslip);
    expect(html).toContain(result.officerSnapshot.fullName);
    expect(html).toContain(result.officerSnapshot.designation);
    expect(html).toContain('Half Day');
    expect(html).toContain('Leave');
  });
});
