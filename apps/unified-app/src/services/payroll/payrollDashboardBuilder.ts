import {
  summarizePayPeriodAttendance,
  type ShiftDefinitionInput,
  type ShiftRecordInput,
} from '@/services/payslip/calculatePayslipCore';
import {
  buildBlockingWarningCodes,
  validatePayslipSnapshotConsistency,
} from '@/services/payslip/payslipValidation';
import type {
  AttendancePeriodSummary,
  PayrollDashboardEntry,
  PayrollWarningCode,
} from '@/types/payslip';

const FALLBACK_SHIFT: ShiftDefinitionInput = {
  startTime: '09:00:00',
  endTime: '18:00:00',
  workingDays: [1, 2, 3, 4, 5, 6],
  isOvernight: false,
};

type OfficerRow = {
  id: string;
  full_name: string | null;
  profile_photo_url: string | null;
};

type PayslipRow = {
  id: string;
  officer_id: string;
  status: string;
  net_pay: number | null;
  gross_earnings?: number | null;
  hourly_rate?: number | null;
  total_actual_hours?: number | null;
  total_additions?: number | null;
  total_deductions?: number | null;
  generated_pdf_url: string | null;
  pay_period_label: string | null;
  employee_name: string | null;
  payslip_daily_breakdown?: Array<{
    day_pay: number;
    actual_hours: number;
    display_label: string;
    is_scheduled_working_day: boolean;
  }>;
};

type ShiftRow = {
  id: string;
  officer_id: string;
  shift_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  attendance_status: string | null;
  working_hours: number | null;
  status: string | null;
};

type ShiftDefRow = {
  officer_id: string;
  shift_definitions: {
    start_time: string;
    end_time: string;
    working_days: number[];
    is_overnight: boolean;
  } | {
    start_time: string;
    end_time: string;
    working_days: number[];
    is_overnight: boolean;
  }[] | null;
};

type OfficerProfileRow = {
  officer_id: string;
  full_name: string | null;
  employee_id: string | null;
  designation: string | null;
  department: string | null;
  bank_account_number: string | null;
  has_compensation: boolean;
};

function mapShiftDefinition(raw: ShiftDefRow['shift_definitions']): ShiftDefinitionInput | null {
  if (!raw) return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row) return null;
  return {
    startTime: row.start_time,
    endTime: row.end_time,
    workingDays: row.working_days,
    isOvernight: row.is_overnight,
  };
}

function mapShift(row: ShiftRow): ShiftRecordInput {
  return {
    id: row.id,
    shiftDate: row.shift_date,
    checkInTime: row.check_in_time,
    checkOutTime: row.check_out_time,
    attendanceStatus: row.attendance_status,
    workingHours: row.working_hours != null ? Number(row.working_hours) : null,
    status: row.status,
  };
}

export function missingOfficerFields(profile: OfficerProfileRow | undefined): string[] {
  if (!profile) return ['full_name', 'designation', 'department', 'bank_account'];
  const missing: string[] = [];
  if (!profile.full_name?.trim()) missing.push('full_name');
  if (!profile.designation?.trim()) missing.push('designation');
  if (!profile.department?.trim()) missing.push('department');
  if (!profile.bank_account_number?.trim()) missing.push('bank_account');
  return missing;
}

export function buildPayrollDashboardEntries(input: {
  officers: OfficerRow[];
  payslips: PayslipRow[];
  shifts: ShiftRow[];
  holidays: string[];
  shiftDefinitions: ShiftDefRow[];
  profiles: OfficerProfileRow[];
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
}): PayrollDashboardEntry[] {
  const payslipByOfficer = new Map(input.payslips.map((p) => [p.officer_id, p]));
  const shiftsByOfficer = new Map<string, ShiftRow[]>();
  input.shifts.forEach((s) => {
    const list = shiftsByOfficer.get(s.officer_id) ?? [];
    list.push(s);
    shiftsByOfficer.set(s.officer_id, list);
  });
  const shiftDefByOfficer = new Map<string, ShiftDefinitionInput>();
  input.shiftDefinitions.forEach((d) => {
    const mapped = mapShiftDefinition(d.shift_definitions);
    if (mapped) shiftDefByOfficer.set(d.officer_id, mapped);
  });
  const profileByOfficer = new Map(input.profiles.map((p) => [p.officer_id, p]));

  return input.officers.map((officer) => {
    const ps = payslipByOfficer.get(officer.id);
    const hasShiftAssignment = shiftDefByOfficer.has(officer.id);
    const shiftDef = shiftDefByOfficer.get(officer.id) ?? FALLBACK_SHIFT;
    const officerShifts = (shiftsByOfficer.get(officer.id) ?? []).map(mapShift);
    const profile = profileByOfficer.get(officer.id);
    const missingFields = missingOfficerFields(profile);
    const hasCompensation = profile?.has_compensation ?? false;

    const attendanceSummary = summarizePayPeriodAttendance({
      payPeriodStart: input.periodStart,
      payPeriodEnd: input.periodEnd,
      shiftDefinition: shiftDef,
      hasShiftAssignment,
      shifts: officerShifts,
      holidays: input.holidays,
    });

    const netPayPreview = ps?.net_pay != null ? Number(ps.net_pay) : null;

    const snapshotValid = ps
      ? validatePayslipSnapshotConsistency({
          grossEarnings: Number(ps.gross_earnings ?? 0),
          netPay: Number(ps.net_pay ?? 0),
          totalActualHours: Number(ps.total_actual_hours ?? 0),
          hourlyRate: Number(ps.hourly_rate ?? 0),
          totalAdditions: Number(ps.total_additions ?? 0),
          totalDeductions: Number(ps.total_deductions ?? 0),
          dailyBreakdown: (ps.payslip_daily_breakdown ?? []).map((d) => ({
            date: '',
            attendanceRecordId: null,
            isScheduledWorkingDay: d.is_scheduled_working_day,
            actualHours: Number(d.actual_hours),
            displayLabel: d.display_label,
            dayPay: Number(d.day_pay),
            hourlyRateApplied: null,
            id: '',
            payslipId: ps.id,
            createdAt: '',
          })),
        }).valid
      : true;

    const warningCodes = buildBlockingWarningCodes({
      missingOfficerFields: missingFields,
      hasCompensation,
      hasShiftAssignment,
      unresolvedCount: attendanceSummary.unresolved,
      incompleteCount: attendanceSummary.incomplete,
      netPay: netPayPreview,
      snapshotValid: ps ? snapshotValid : true,
    });

    const blocked =
      !attendanceSummary.canGenerate ||
      missingFields.length > 0 ||
      !hasCompensation ||
      !hasShiftAssignment ||
      (ps != null && !snapshotValid);

    return {
      officerId: officer.id,
      officerName:
        ps?.employee_name?.trim() ||
        profile?.full_name?.trim() ||
        officer.full_name?.trim() ||
        'Unknown officer',
      avatarUrl: officer.profile_photo_url ?? null,
      payslipId: ps?.id ?? null,
      status: ps ? (ps.status as PayrollDashboardEntry['status']) : 'not_started',
      netPayPreview,
      generatedPdfUrl: ps?.generated_pdf_url ?? null,
      payPeriodLabel: ps?.pay_period_label ?? input.periodLabel,
      payPeriodStart: input.periodStart,
      payPeriodEnd: input.periodEnd,
      blocked,
      blockingDates: [
        ...attendanceSummary.unresolvedDates,
        ...attendanceSummary.incompleteDates,
      ],
      attendanceSummary,
      warningCodes,
      missingOfficerFields: missingFields,
      hasCompensation,
      hasShiftAssignment,
    };
  });
}

export function buildGenerationPreview(input: {
  officerId: string;
  officerName: string;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  shiftDefinition: ShiftDefinitionInput;
  hasShiftAssignment: boolean;
  shifts: ShiftRecordInput[];
  holidays: string[];
  missingOfficerFields: string[];
  hasCompensation: boolean;
}): import('@/types/payslip').PayrollGenerationPreview {
  const attendanceSummary = summarizePayPeriodAttendance({
    payPeriodStart: input.periodStart,
    payPeriodEnd: input.periodEnd,
    shiftDefinition: input.shiftDefinition,
    hasShiftAssignment: input.hasShiftAssignment,
    shifts: input.shifts,
    holidays: input.holidays,
  });

  const warnings = [...attendanceSummary.warnings];
  if (input.missingOfficerFields.length) {
    warnings.push(`Missing officer data: ${input.missingOfficerFields.join(', ')}`);
  }
  if (!input.hasCompensation) {
    warnings.push('No salary/compensation configured for this officer');
  }
  if (!input.hasShiftAssignment) {
    warnings.push('No shift schedule assigned — configure shift before generating');
  }

  return {
    officerId: input.officerId,
    officerName: input.officerName,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    periodLabel: input.periodLabel,
    attendanceSummary,
    missingOfficerFields: input.missingOfficerFields,
    hasCompensation: input.hasCompensation,
    hasShiftAssignment: input.hasShiftAssignment,
    canGenerate:
      attendanceSummary.canGenerate &&
      input.missingOfficerFields.length === 0 &&
      input.hasCompensation &&
      input.hasShiftAssignment,
    warnings,
  };
}

export { FALLBACK_SHIFT as DEFAULT_SHIFT, mapShiftDefinition, mapShift };
