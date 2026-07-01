import {
  calculatePayslipCore,
  type CalculatePayslipCoreInput,
  type CompensationInput,
  type PayslipResult,
} from '@/services/payslip/calculatePayslipCore';
import {
  mapContractTermRows,
  resolveContractCompensation,
  type ContractCompensationResolution,
} from '@/services/payroll/contractCompensation';
import {
  DEFAULT_SHIFT,
  mapShift,
  mapShiftDefinition,
} from '@/services/payroll/payrollDashboardBuilder';
import type { PayTypeRule } from '@/types/payslip';
import { mapPayTypeRule } from '@/types/payslip';
import type { TypedSupabaseClient } from '@/services/api/supabase';

export type PayslipCalculationLoadResult = {
  input: CalculatePayslipCoreInput;
  result: PayslipResult;
  compensation: ContractCompensationResolution;
  payRules: PayTypeRule[];
};

export async function fetchPayrollCompensation(
  client: TypedSupabaseClient,
  officerId: string,
  options?: { includeLegacyOrphans?: boolean },
): Promise<ContractCompensationResolution> {
  const { data: contract } = await client
    .from('employment_contracts')
    .select('id, officer_id, status, date_of_joining, ctc_annual, basic_salary_monthly')
    .eq('officer_id', officerId)
    .maybeSingle();

  const [{ data: explicitTerms }, legacyResult] = await Promise.all([
    client
      .from('contract_compensation_terms')
      .select('*')
      .eq('officer_id', officerId)
      .order('effective_from', { ascending: true }),
    options?.includeLegacyOrphans
      ? client
          .from('employee_compensation')
          .select('id, monthly_salary, effective_from, effective_to, source, contract_term_id')
          .eq('officer_id', officerId)
          .order('effective_from', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  return resolveContractCompensation({
    officerId,
    contract: contract as never,
    explicitTerms: (explicitTerms ?? []) as never,
    legacyRecords: (legacyResult.data ?? []).map((row) => ({
      id: row.id as string,
      monthlySalary: Number(row.monthly_salary),
      effectiveFrom: row.effective_from as string,
      effectiveTo: (row.effective_to as string) ?? null,
      source: (row.source as string) ?? 'legacy_manual',
      contractTermId: (row.contract_term_id as string) ?? null,
    })),
  });
}

export async function loadPayslipCalculation(
  client: TypedSupabaseClient,
  input: {
    officerId: string;
    payPeriodStart: string;
    payPeriodEnd: string;
    payPeriodLabel: string;
    preservedAdditions?: number;
    preservedDeductions?: number;
  },
): Promise<PayslipCalculationLoadResult> {
  const [
    { data: officer, error: officerErr },
    { data: contract },
    { data: bank },
    { data: shiftLink },
    { data: shifts, error: shiftErr },
    { data: holidays, error: holErr },
    { data: payRuleRows, error: ruleErr },
    { data: thresholdRows, error: thresholdErr },
    compensation,
  ] = await Promise.all([
    client.from('officers').select('id, full_name, employee_id').eq('id', input.officerId).single(),
    client
      .from('employment_contracts')
      .select('employee_designation, employee_department')
      .eq('officer_id', input.officerId)
      .maybeSingle(),
    client
      .from('officer_bank_details')
      .select('account_number')
      .eq('officer_id', input.officerId)
      .maybeSingle(),
    client
      .from('shift_definition_officers')
      .select('shift_definitions(start_time, end_time, working_days, is_overnight)')
      .eq('officer_id', input.officerId)
      .maybeSingle(),
    client
      .from('shifts')
      .select(
        'id, shift_date, check_in_time, check_out_time, attendance_status, working_hours, status, payroll_resolution_type, payroll_bulk_pay_mode',
      )
      .eq('officer_id', input.officerId)
      .gte('shift_date', input.payPeriodStart)
      .lte('shift_date', input.payPeriodEnd),
    client
      .from('company_holidays')
      .select('holiday_date')
      .gte('holiday_date', input.payPeriodStart)
      .lte('holiday_date', input.payPeriodEnd),
    client.from('pay_type_rules').select('*'),
    client.from('attendance_label_thresholds').select('*'),
    fetchPayrollCompensation(client, input.officerId),
  ]);

  if (officerErr) throw officerErr;
  if (shiftErr) throw shiftErr;
  if (holErr) throw holErr;
  if (ruleErr) throw ruleErr;
  if (thresholdErr) throw thresholdErr;

  if (!compensation.hasContractSource) {
    throw new Error(
      compensation.warnings.join(' ') ||
        'No contract-sourced compensation configured for this officer',
    );
  }

  const shiftDefinition =
    mapShiftDefinition((shiftLink?.shift_definitions as never) ?? null) ?? DEFAULT_SHIFT;
  const payRules = (payRuleRows ?? []).map((row) => mapPayTypeRule(row as never));

  const coreInput: CalculatePayslipCoreInput = {
    officer: {
      officerId: input.officerId,
      fullName: officer?.full_name,
      employeeId: officer?.employee_id,
      department: contract?.employee_department,
      designation: contract?.employee_designation,
      bankAccountNumber: bank?.account_number,
    },
    payPeriodStart: input.payPeriodStart,
    payPeriodEnd: input.payPeriodEnd,
    payPeriodLabel: input.payPeriodLabel,
    compensations: compensation.compensations,
    shiftDefinition,
    hasShiftAssignment: Boolean(shiftLink?.shift_definitions),
    shifts: (shifts ?? []).map((row) =>
      mapShift({
        id: row.id as string,
        officer_id: input.officerId,
        shift_date: row.shift_date as string,
        check_in_time: row.check_in_time as string | null,
        check_out_time: row.check_out_time as string | null,
        attendance_status: row.attendance_status as string | null,
        working_hours: row.working_hours as number | null,
        status: row.status as string | null,
        payroll_resolution_type: row.payroll_resolution_type as string | null,
        payroll_bulk_pay_mode: row.payroll_bulk_pay_mode as 'paid' | 'unpaid' | null,
      }),
    ),
    holidays: (holidays ?? []).map((row) => row.holiday_date as string),
    payRules: payRules.map((rule) => ({
      attendanceStatus: rule.attendanceStatus,
      payFraction: rule.payFraction,
      usesScheduledHours: rule.usesScheduledHours,
    })),
    labelThresholds: (thresholdRows ?? []).map((row) => ({
      label: row.label as string,
      minHoursFraction: Number(row.min_hours_fraction),
      maxHoursFraction:
        row.max_hours_fraction != null ? Number(row.max_hours_fraction) : null,
      sortOrder: Number(row.sort_order),
    })),
    preservedAdditions: input.preservedAdditions,
    preservedDeductions: input.preservedDeductions,
  };

  const result = calculatePayslipCore(coreInput);

  return {
    input: coreInput,
    result,
    compensation,
    payRules,
  };
}

export type PayslipLiveCalculation = {
  grossPay: number;
  netPay: number;
  hourlyRate: number;
  totalActualHours: number;
  totalWorkedDays: number;
  workingDays: number;
  dailyBreakdown: PayslipResult['dailyBreakdown'];
  warnings: string[];
  rateChangeDates: string[];
  compensationWarnings: string[];
  compensationNotices: string[];
};

const MONEY_TOLERANCE = 0.02;
const HOURS_TOLERANCE = 0.05;

export function isPayslipLiveCalculationStale(
  live: Pick<PayslipLiveCalculation, 'grossPay' | 'netPay' | 'totalActualHours'>,
  stored: {
    grossEarnings: number;
    netPay: number;
    totalActualHours: number;
    updatedAt?: string | null;
  },
): boolean {
  return (
    Math.abs(stored.grossEarnings - live.grossPay) > MONEY_TOLERANCE ||
    Math.abs(stored.netPay - live.netPay) > MONEY_TOLERANCE ||
    Math.abs(stored.totalActualHours - live.totalActualHours) > HOURS_TOLERANCE
  );
}

export function buildLiveCalculationView(
  result: PayslipResult,
  compensation: ContractCompensationResolution,
  lineItemAdditions = 0,
  lineItemDeductions = 0,
): PayslipLiveCalculation {
  const netPay = result.grossPay + lineItemAdditions - lineItemDeductions;

  return {
    grossPay: result.grossPay,
    netPay,
    hourlyRate: result.hourlyRate,
    totalActualHours: result.totalActualHours,
    totalWorkedDays: result.totalWorkedDays,
    workingDays: result.workingDays,
    dailyBreakdown: result.dailyBreakdown,
    warnings: result.warnings,
    rateChangeDates: result.rateChangeDates,
    compensationWarnings: compensation.warnings,
    compensationNotices: compensation.informationalNotices,
  };
}

export { mapContractTermRows, type CompensationInput };
