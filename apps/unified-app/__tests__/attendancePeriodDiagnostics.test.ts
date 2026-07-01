import {
  diagnosePayPeriodAttendance,
  summarizePayPeriodAttendance,
  type ShiftDefinitionInput,
} from '@/services/payslip/calculatePayslipCore';
import {
  fixIssuesLabel,
  primaryBlockingReason,
} from '@/services/payroll/attendancePeriodDiagnostics';

const SHIFT: ShiftDefinitionInput = {
  startTime: '09:00:00',
  endTime: '18:00:00',
  workingDays: [1, 2, 3, 4, 5, 6],
  isOvernight: false,
};

describe('attendance period diagnostics', () => {
  it('classifies missing check-in separately from incomplete checkout', () => {
    const summary = summarizePayPeriodAttendance({
      payPeriodStart: '2026-06-01',
      payPeriodEnd: '2026-06-07',
      shiftDefinition: SHIFT,
      hasShiftAssignment: true,
      shifts: [
        {
          id: 's1',
          shiftDate: '2026-06-03',
          checkInTime: '2026-06-03T03:30:00.000Z',
          checkOutTime: null,
          attendanceStatus: 'present',
          workingHours: null,
          status: 'active',
        },
      ],
      holidays: [],
    });

    expect(summary.issueSummary.noCheckInCount).toBeGreaterThan(0);
    expect(summary.issueSummary.incompleteCount).toBe(1);
    expect(summary.issueSummary.primaryIssue).toBe('no_check_in');
    expect(summary.warnings.some((w) => w.includes('no check-in record'))).toBe(true);
  });

  it('surfaces no shift assigned as primary blocking reason', () => {
    const issueSummary = diagnosePayPeriodAttendance({
      payPeriodStart: '2026-06-01',
      payPeriodEnd: '2026-06-30',
      shiftDefinition: SHIFT,
      hasShiftAssignment: false,
      shifts: [],
      holidays: [],
    });

    expect(issueSummary.noShiftAssigned).toBe(true);
    expect(
      primaryBlockingReason({
        issueSummary,
        missingOfficerFields: [],
        hasCompensation: true,
        snapshotInvalid: false,
      }),
    ).toBe('no shift assigned');
    expect(fixIssuesLabel('no shift assigned')).toBe('Fix issues — no shift assigned');
  });

  it('builds list hint for missing check-ins', () => {
    const issueSummary = diagnosePayPeriodAttendance({
      payPeriodStart: '2026-06-01',
      payPeriodEnd: '2026-06-30',
      shiftDefinition: SHIFT,
      hasShiftAssignment: true,
      shifts: [],
      holidays: [],
    });

    expect(issueSummary.noCheckInCount).toBeGreaterThan(20);
    expect(
      fixIssuesLabel(
        primaryBlockingReason({
          issueSummary,
          missingOfficerFields: [],
          hasCompensation: true,
          snapshotInvalid: false,
        }),
      ),
    ).toContain('missing check-in');
  });
});
