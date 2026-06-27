import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';
import {
  calculatePayslipCore,
  PayslipCalculationError,
  type CompensationInput,
  type LabelThresholdInput,
  type PayTypeRuleInput,
  type ShiftDefinitionInput,
  type ShiftRecordInput,
} from '../_shared/payslipCalculation.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

type DbShiftDefinition = {
  start_time: string;
  end_time: string;
  working_days: number[];
  is_overnight: boolean;
};

type DbShiftRow = {
  id: string;
  shift_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  attendance_status: string | null;
  working_hours: number | null;
  status: string | null;
};

function periodLabelFromStart(payPeriodStart: string): string {
  return new Date(`${payPeriodStart}T00:00:00Z`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function mapShiftDefinition(raw: DbShiftDefinition | null): ShiftDefinitionInput {
  if (!raw) {
    return {
      startTime: '09:00:00',
      endTime: '18:00:00',
      workingDays: [1, 2, 3, 4, 5, 6],
      isOvernight: false,
    };
  }
  return {
    startTime: raw.start_time,
    endTime: raw.end_time,
    workingDays: raw.working_days,
    isOvernight: raw.is_overnight,
  };
}

function resultToApiResponse(payslipId: string | null, result: ReturnType<typeof calculatePayslipCore>) {
  return {
    payslip_id: payslipId,
    blocked: result.blocked,
    blocking_dates: result.blockingDates,
    gross_earnings: result.grossPay,
    net_pay: result.netPay,
    hourly_rate: result.hourlyRate,
    total_scheduled_days: result.workingDays,
    total_worked_days: result.totalWorkedDays,
    total_actual_hours: result.totalActualHours,
    warnings: result.warnings,
    rate_change_dates: result.rateChangeDates,
    daily_breakdown: result.dailyBreakdown.map((d) => ({
      date: d.date,
      attendance_record_id: d.attendanceRecordId,
      is_scheduled_working_day: d.isScheduledWorkingDay,
      actual_hours: d.actualHours,
      display_label: d.displayLabel,
      day_pay: d.dayPay,
      hourly_rate_applied: d.hourlyRateApplied,
      pay_fraction: d.payFraction,
      hours_counted: d.hoursCounted,
    })),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: adminCheck, error: adminErr } = await userClient.rpc('is_admin_user');
    if (adminErr || !adminCheck) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const officerId: string = body.officer_id;
    const payPeriodStart: string = body.pay_period_start;
    const payPeriodEnd: string = body.pay_period_end;
    const forceOverwriteDraft = Boolean(body.force_overwrite_draft);

    if (!officerId || !payPeriodStart || !payPeriodEnd) {
      throw new Error('officer_id, pay_period_start, pay_period_end are required');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData } = await userClient.auth.getUser();
    const generatedBy = userData.user?.id ?? null;

    const { data: existingPayslip } = await supabase
      .from('payslips')
      .select('id, status')
      .eq('officer_id', officerId)
      .eq('pay_period_start', payPeriodStart)
      .eq('pay_period_end', payPeriodEnd)
      .maybeSingle();

    if (existingPayslip) {
      if (['approved', 'paid'].includes(existingPayslip.status)) {
        return new Response(
          JSON.stringify({ error: 'Payslip already approved or paid — cannot overwrite' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      if (!forceOverwriteDraft) {
        return new Response(
          JSON.stringify({
            error: 'Draft payslip exists — set force_overwrite_draft to replace',
            payslip_id: existingPayslip.id,
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const [
      { data: compensations, error: compErr },
      { data: shiftLink },
      { data: shifts },
      { data: holidays },
      { data: payRules },
      { data: thresholds },
      { data: officer },
      { data: contract },
      { data: bankDetails },
      { data: companyDefaults },
      { data: companyInfo },
    ] = await Promise.all([
      supabase
        .from('employee_compensation')
        .select('*')
        .eq('officer_id', officerId)
        .lte('effective_from', payPeriodEnd)
        .or(`effective_to.is.null,effective_to.gte.${payPeriodStart}`),
      supabase
        .from('shift_definition_officers')
        .select('shift_definitions(start_time, end_time, working_days, is_overnight)')
        .eq('officer_id', officerId)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('shifts')
        .select(
          'id, shift_date, check_in_time, check_out_time, attendance_status, working_hours, status',
        )
        .eq('officer_id', officerId)
        .gte('shift_date', payPeriodStart)
        .lte('shift_date', payPeriodEnd),
      supabase
        .from('company_holidays')
        .select('holiday_date')
        .gte('holiday_date', payPeriodStart)
        .lte('holiday_date', payPeriodEnd),
      supabase.from('pay_type_rules').select('*'),
      supabase.from('attendance_label_thresholds').select('*'),
      supabase
        .from('officers')
        .select('id, full_name, employee_id')
        .eq('id', officerId)
        .single(),
      supabase
        .from('employment_contracts')
        .select('employee_designation, employee_department')
        .eq('officer_id', officerId)
        .maybeSingle(),
      supabase
        .from('officer_bank_details')
        .select('account_number')
        .eq('officer_id', officerId)
        .maybeSingle(),
      supabase.from('company_contract_defaults').select('*').limit(1).maybeSingle(),
      supabase.from('company_info').select('company_name, address, city, state').limit(1).maybeSingle(),
    ]);

    if (compErr) throw compErr;

    const rawDef = shiftLink?.shift_definitions as DbShiftDefinition | DbShiftDefinition[] | null;
    const shiftDefRow = rawDef ? (Array.isArray(rawDef) ? rawDef[0] : rawDef) : null;
    const shiftDefinition = mapShiftDefinition(shiftDefRow);
    const hasShiftAssignment = Boolean(shiftDefRow);

    let preservedAdditions = 0;
    let preservedDeductions = 0;
    let payslipId = existingPayslip?.id ?? null;

    if (payslipId) {
      const { data: items } = await supabase
        .from('payslip_line_items')
        .select('item_type, amount')
        .eq('payslip_id', payslipId);
      (items ?? []).forEach((item: { item_type: string; amount: number }) => {
        if (item.item_type === 'addition') preservedAdditions += Number(item.amount);
        else preservedDeductions += Number(item.amount);
      });
    }

    const result = calculatePayslipCore({
      officer: {
        officerId,
        fullName: officer?.full_name,
        employeeId: officer?.employee_id,
        department: contract?.employee_department,
        designation: contract?.employee_designation,
        bankAccountNumber: bankDetails?.account_number,
      },
      payPeriodStart,
      payPeriodEnd,
      payPeriodLabel: periodLabelFromStart(payPeriodStart),
      compensations: (compensations ?? []).map(
        (c): CompensationInput => ({
          id: c.id,
          monthlySalary: Number(c.monthly_salary),
          effectiveFrom: c.effective_from,
          effectiveTo: c.effective_to,
        }),
      ),
      shiftDefinition,
      hasShiftAssignment,
      shifts: (shifts ?? []).map(
        (s: DbShiftRow): ShiftRecordInput => ({
          id: s.id,
          shiftDate: s.shift_date,
          checkInTime: s.check_in_time,
          checkOutTime: s.check_out_time,
          attendanceStatus: s.attendance_status,
          workingHours: s.working_hours != null ? Number(s.working_hours) : null,
          status: s.status,
        }),
      ),
      holidays: (holidays ?? []).map((h: { holiday_date: string }) => h.holiday_date),
      payRules: (payRules ?? []).map(
        (r): PayTypeRuleInput => ({
          attendanceStatus: r.attendance_status,
          payFraction: Number(r.pay_fraction),
          usesScheduledHours: r.uses_scheduled_hours,
        }),
      ),
      labelThresholds: (thresholds ?? []).map(
        (t): LabelThresholdInput => ({
          label: t.label,
          minHoursFraction: Number(t.min_hours_fraction),
          maxHoursFraction: t.max_hours_fraction != null ? Number(t.max_hours_fraction) : null,
          sortOrder: t.sort_order,
        }),
      ),
      preservedAdditions,
      preservedDeductions,
    });

    if (result.blocked) {
      return new Response(JSON.stringify(resultToApiResponse(null, result)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const companyName =
      companyDefaults?.company_name ?? companyInfo?.company_name ?? 'Prime Fibernet';
    const companyAddress =
      companyDefaults?.company_address ??
      [companyInfo?.address, companyInfo?.city, companyInfo?.state].filter(Boolean).join(', ') ??
      '';
    const companyLogoUrl = companyDefaults?.logo_url ?? null;
    const snap = result.officerSnapshot;
    const initialStatus =
      result.netPay === 0
        ? 'flagged_zero_pay'
        : result.warnings.length
          ? 'needs_review'
          : 'draft';

    const payslipRow = {
      officer_id: officerId,
      pay_period_start: payPeriodStart,
      pay_period_end: payPeriodEnd,
      pay_period_label: result.period.label,
      company_name: companyName,
      company_address: companyAddress,
      company_logo_url: companyLogoUrl,
      employee_name: snap.fullName,
      employee_designation: snap.designation,
      employee_id_display: snap.employeeIdDisplay,
      employee_department: snap.department,
      bank_account_last4: snap.bankAccountLast4,
      hourly_rate: result.hourlyRate,
      total_scheduled_days: result.workingDays,
      total_worked_days: result.totalWorkedDays,
      total_actual_hours: result.totalActualHours,
      gross_earnings: result.grossPay,
      total_additions: result.additions,
      total_deductions: result.deductions,
      net_pay: result.netPay,
      status: initialStatus,
      calculation_warnings: result.warnings,
      attendance_snapshot: {
        summary: {
          working_days: result.workingDays,
          present: result.dailyBreakdown.filter((d) => d.displayLabel === 'Present' || d.displayLabel.includes('Extra')).length,
          absent: result.dailyBreakdown.filter((d) => d.displayLabel === 'Absent').length,
          leave: result.dailyBreakdown.filter((d) => d.displayLabel === 'Leave').length,
          holiday: result.dailyBreakdown.filter((d) => d.displayLabel === 'Holiday').length,
        },
        daily_breakdown: result.dailyBreakdown.map((d) => ({
          date: d.date,
          display_label: d.displayLabel,
          day_pay: d.dayPay,
          actual_hours: d.actualHours,
        })),
      },
      generated_by: generatedBy,
      updated_at: new Date().toISOString(),
    };

    if (payslipId) {
      const { error: updErr } = await supabase.from('payslips').update(payslipRow).eq('id', payslipId);
      if (updErr) throw updErr;
      await supabase.from('payslip_daily_breakdown').delete().eq('payslip_id', payslipId);
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('payslips')
        .insert(payslipRow)
        .select('id')
        .single();
      if (insErr) throw insErr;
      payslipId = inserted.id;
    }

    const breakdownRows = result.dailyBreakdown.map((d) => ({
      payslip_id: payslipId,
      date: d.date,
      attendance_record_id: d.attendanceRecordId,
      is_scheduled_working_day: d.isScheduledWorkingDay,
      actual_hours: d.actualHours,
      display_label: d.displayLabel,
      day_pay: d.dayPay,
      hourly_rate_applied: d.hourlyRateApplied,
    }));

    const { error: bdErr } = await supabase.from('payslip_daily_breakdown').insert(breakdownRows);
    if (bdErr) throw bdErr;

    await supabase.from('payroll_audit_log').insert({
      payslip_id: payslipId,
      action: existingPayslip ? 'regenerated' : 'generated',
      performed_by: generatedBy,
      previous_status: existingPayslip?.status ?? null,
      new_status: initialStatus,
      metadata: {
        gross_pay: result.grossPay,
        net_pay: result.netPay,
        warnings: result.warnings,
      },
    });

    return new Response(JSON.stringify(resultToApiResponse(payslipId, result)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof PayslipCalculationError) {
      return new Response(
        JSON.stringify({
          error: error.message,
          code: error.code,
          unresolved_dates: error.unresolvedDates ?? [],
          missing_fields: error.missingFields ?? [],
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
