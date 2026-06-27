import {
  DEFAULT_SHIFT,
  mapShift,
  mapShiftDefinition,
  missingOfficerFields,
} from '@/services/payroll/payrollDashboardBuilder';
import {
  summarizePayPeriodAttendance,
} from '@/services/payslip/calculatePayslipCore';
import {
  buildBlockingWarningCodes,
  validatePayslipCanApprove,
  validatePayslipSnapshotConsistency,
  type PayslipApprovalValidation,
} from '@/services/payslip/payslipValidation';
import { mapPayslip, type Payslip } from '@/types/payslip';

import type { TypedSupabaseClient } from '../api/supabase';

const PAYSLIP_APPROVAL_SELECT = `
  *,
  payslip_daily_breakdown(*)
`;

export async function fetchPayslipApprovalValidation(
  client: TypedSupabaseClient,
  payslipId: string,
  overrideNote?: string,
): Promise<PayslipApprovalValidation & { payslip: Payslip }> {
  const { data: row, error } = await client
    .from('payslips')
    .select(PAYSLIP_APPROVAL_SELECT)
    .eq('id', payslipId)
    .single();
  if (error) throw error;

  const payslip = mapPayslip(row as never);
  const officerId = payslip.officerId;
  const payPeriodStart = payslip.payPeriodStart;
  const payPeriodEnd = payslip.payPeriodEnd;

  const [
    { data: officer },
    { data: contract },
    { data: bank },
    { data: compRows },
    { data: shiftLink },
    { data: shifts },
    { data: holidays },
  ] = await Promise.all([
    client.from('officers').select('id, full_name').eq('id', officerId).single(),
    client
      .from('employment_contracts')
      .select('employee_designation, employee_department')
      .eq('officer_id', officerId)
      .maybeSingle(),
    client
      .from('officer_bank_details')
      .select('account_number')
      .eq('officer_id', officerId)
      .maybeSingle(),
    client
      .from('employee_compensation')
      .select('officer_id')
      .eq('officer_id', officerId)
      .lte('effective_from', payPeriodEnd)
      .or(`effective_to.is.null,effective_to.gte.${payPeriodStart}`)
      .limit(1),
    client
      .from('shift_definition_officers')
      .select('shift_definitions(start_time, end_time, working_days, is_overnight)')
      .eq('officer_id', officerId)
      .maybeSingle(),
    client
      .from('shifts')
      .select(
        'id, shift_date, check_in_time, check_out_time, attendance_status, working_hours, status',
      )
      .eq('officer_id', officerId)
      .gte('shift_date', payPeriodStart)
      .lte('shift_date', payPeriodEnd),
    client
      .from('company_holidays')
      .select('holiday_date')
      .gte('holiday_date', payPeriodStart)
      .lte('holiday_date', payPeriodEnd),
  ]);

  const profile = {
    officer_id: officerId,
    full_name: officer?.full_name ?? null,
    employee_id: null,
    designation: contract?.employee_designation ?? null,
    department: contract?.employee_department ?? null,
    bank_account_number: bank?.account_number ?? null,
    has_compensation: (compRows ?? []).length > 0,
  };

  const shiftDef =
    mapShiftDefinition((shiftLink?.shift_definitions as never) ?? null) ?? DEFAULT_SHIFT;
  const hasShiftAssignment = Boolean(shiftLink?.shift_definitions);

  const attendanceSummary = summarizePayPeriodAttendance({
    payPeriodStart,
    payPeriodEnd,
    shiftDefinition: shiftDef,
    hasShiftAssignment,
    shifts: (shifts ?? []).map((s) =>
      mapShift({
        id: s.id as string,
        officer_id: officerId,
        shift_date: s.shift_date as string,
        check_in_time: s.check_in_time as string | null,
        check_out_time: s.check_out_time as string | null,
        attendance_status: s.attendance_status as string | null,
        working_hours: s.working_hours as number | null,
        status: s.status as string | null,
      }),
    ),
    holidays: (holidays ?? []).map((h) => h.holiday_date as string),
  });

  const snapshotValidation = validatePayslipSnapshotConsistency({
    grossEarnings: payslip.grossEarnings,
    netPay: payslip.netPay,
    totalActualHours: payslip.totalActualHours,
    hourlyRate: payslip.hourlyRate,
    totalAdditions: payslip.totalAdditions,
    totalDeductions: payslip.totalDeductions,
    dailyBreakdown: payslip.dailyBreakdown,
  });

  const warningCodes = buildBlockingWarningCodes({
    missingOfficerFields: missingOfficerFields(profile),
    hasCompensation: profile.has_compensation,
    hasShiftAssignment,
    unresolvedCount: attendanceSummary.unresolved,
    incompleteCount: attendanceSummary.incomplete,
    netPay: payslip.netPay,
    snapshotValid: snapshotValidation.valid,
  });

  const validation = validatePayslipCanApprove({
    warningCodes,
    snapshotErrors: snapshotValidation.errors,
    netPay: payslip.netPay,
    overrideNote,
  });

  return { ...validation, payslip };
}
