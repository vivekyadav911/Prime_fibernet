import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

type PayTypeRule = {
  attendance_status: string;
  pay_fraction: number;
  uses_scheduled_hours: boolean;
};

type LabelThreshold = {
  label: string;
  min_hours_fraction: number;
  max_hours_fraction: number | null;
  sort_order: number;
};

type CompensationRow = {
  id: string;
  monthly_salary: number;
  effective_from: string;
  effective_to: string | null;
};

type ShiftDefinition = {
  start_time: string;
  end_time: string;
  working_days: number[];
  is_overnight: boolean;
};

type ShiftRow = {
  id: string;
  shift_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  attendance_status: string | null;
  working_hours: number | null;
  status: string | null;
};

type CalcDay = {
  date: string;
  attendance_record_id: string | null;
  is_scheduled_working_day: boolean;
  actual_hours: number;
  display_label: string;
  day_pay: number;
  hourly_rate_applied: number;
};

function parseTimeToHours(time: string): number {
  const parts = time.split(':');
  const h = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 0);
  const s = Number(parts[2]?.split('.')[0] ?? 0);
  return h + m / 60 + s / 3600;
}

/** shift_hours_per_day = end_time - start_time (handles overnight) */
function shiftHoursPerDay(def: ShiftDefinition): number {
  const start = parseTimeToHours(def.start_time);
  const end = parseTimeToHours(def.end_time);
  if (def.is_overnight || end <= start) {
    return 24 - start + end;
  }
  return end - start;
}

/**
 * hourly_rate = monthly_salary / monthly_hours_average
 * monthly_hours_average = (shift_hours_per_day * working_days_per_week * 52) / 12
 */
function computeHourlyRate(monthlySalary: number, def: ShiftDefinition): number {
  const hoursPerDay = shiftHoursPerDay(def);
  const workingDaysPerWeek = def.working_days.length;
  const annualHours = hoursPerDay * workingDaysPerWeek * 52;
  const monthlyHoursAverage = annualHours / 12;
  if (monthlyHoursAverage <= 0) return 0;
  return Math.round((monthlySalary / monthlyHoursAverage) * 100) / 100;
}

function eachDateInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function dayOfWeek(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay();
}

function hoursBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.round((ms / 3600000) * 100) / 100;
}

function compensationForDate(rows: CompensationRow[], date: string): CompensationRow | null {
  const matches = rows.filter((r) => {
    const from = r.effective_from;
    const to = r.effective_to;
    return date >= from && (to == null || date <= to);
  });
  matches.sort((a, b) => b.effective_from.localeCompare(a.effective_from));
  return matches[0] ?? null;
}

function resolveDisplayLabel(
  actualHours: number,
  shiftHours: number,
  attendanceStatus: string | null,
  thresholds: LabelThreshold[],
  isHoliday: boolean,
  isWeeklyOff: boolean,
): string {
  if (isHoliday) return 'Holiday';
  if (isWeeklyOff) return 'Weekly Off';
  if (attendanceStatus === 'on_leave') return 'Leave';
  if (attendanceStatus === 'holiday') return 'Holiday';

  if (actualHours <= 0 && (!attendanceStatus || attendanceStatus === 'absent')) {
    return 'Absent';
  }

  const fraction = shiftHours > 0 ? actualHours / shiftHours : 0;
  const sorted = [...thresholds].sort((a, b) => b.sort_order - a.sort_order);
  for (const t of sorted) {
    const min = Number(t.min_hours_fraction);
    const max = t.max_hours_fraction != null ? Number(t.max_hours_fraction) : null;
    if (fraction >= min && (max == null || fraction <= max)) {
      return t.label;
    }
  }
  return actualHours > 0 ? 'Present' : 'Absent';
}

function computeDayPay(
  rule: PayTypeRule | undefined,
  hourlyRate: number,
  shiftHours: number,
  actualHours: number,
  attendanceStatus: string | null,
  isAbsent: boolean,
): number {
  if (isAbsent) return 0;

  if (rule?.uses_scheduled_hours) {
    return Math.round(hourlyRate * shiftHours * Number(rule.pay_fraction) * 100) / 100;
  }

  if (rule && !rule.uses_scheduled_hours && attendanceStatus && rule.pay_fraction < 1) {
    return Math.round(hourlyRate * actualHours * Number(rule.pay_fraction) * 100) / 100;
  }

  return Math.round(hourlyRate * actualHours * 100) / 100;
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

    const { data: compensations, error: compErr } = await supabase
      .from('employee_compensation')
      .select('*')
      .eq('officer_id', officerId)
      .lte('effective_from', payPeriodEnd)
      .or(`effective_to.is.null,effective_to.gte.${payPeriodStart}`);
    if (compErr) throw compErr;
    if (!compensations?.length) {
      throw new Error('No employee compensation configured for this officer');
    }

    const { data: shiftLink } = await supabase
      .from('shift_definition_officers')
      .select('shift_definitions(start_time, end_time, working_days, is_overnight)')
      .eq('officer_id', officerId)
      .limit(1)
      .maybeSingle();

    let shiftDef: ShiftDefinition = {
      start_time: '09:00:00',
      end_time: '18:00:00',
      working_days: [1, 2, 3, 4, 5, 6],
      is_overnight: false,
    };

    const rawDef = shiftLink?.shift_definitions as ShiftDefinition | ShiftDefinition[] | null;
    if (rawDef) {
      const d = Array.isArray(rawDef) ? rawDef[0] : rawDef;
      if (d) shiftDef = d;
    }

    const shiftHours = shiftHoursPerDay(shiftDef);

    const [{ data: shifts }, { data: holidays }, { data: payRules }, { data: thresholds }] =
      await Promise.all([
        supabase
          .from('shifts')
          .select('id, shift_date, check_in_time, check_out_time, attendance_status, working_hours, status')
          .eq('officer_id', officerId)
          .gte('shift_date', payPeriodStart)
          .lte('shift_date', payPeriodEnd),
        supabase
          .from('company_holidays')
          .select('holiday_date, name')
          .gte('holiday_date', payPeriodStart)
          .lte('holiday_date', payPeriodEnd),
        supabase.from('pay_type_rules').select('*'),
        supabase.from('attendance_label_thresholds').select('*'),
      ]);

    const shiftByDate = new Map<string, ShiftRow>();
    (shifts ?? []).forEach((s: ShiftRow) => {
      if (s.shift_date) shiftByDate.set(s.shift_date, s);
    });

    const holidayDates = new Set((holidays ?? []).map((h: { holiday_date: string }) => h.holiday_date));
    const rulesByStatus = new Map<string, PayTypeRule>();
    (payRules ?? []).forEach((r: PayTypeRule) => rulesByStatus.set(r.attendance_status, r));

    const rateChangeDates = new Set<string>();
    const prevComp = new Map<string, string>();
    for (const d of eachDateInRange(payPeriodStart, payPeriodEnd)) {
      const comp = compensationForDate(compensations as CompensationRow[], d);
      if (comp) {
        const key = `${comp.id}-${comp.monthly_salary}`;
        const prev = prevComp.get('last');
        if (prev && prev !== key) rateChangeDates.add(d);
        prevComp.set('last', key);
      }
    }

    const blockingDates: string[] = [];
    const dailyBreakdown: CalcDay[] = [];
    let totalScheduledDays = 0;
    let totalWorkedDays = 0;
    let totalActualHours = 0;
    let grossEarnings = 0;
    let primaryHourlyRate = 0;

    for (const date of eachDateInRange(payPeriodStart, payPeriodEnd)) {
      const dow = dayOfWeek(date);
      const isScheduled = shiftDef.working_days.includes(dow);
      const isHoliday = holidayDates.has(date);
      const isWeeklyOff = !isScheduled && !isHoliday;

      const comp = compensationForDate(compensations as CompensationRow[], date);
      const monthlySalary = comp ? Number(comp.monthly_salary) : 0;
      const hourlyRate = computeHourlyRate(monthlySalary, shiftDef);
      if (primaryHourlyRate === 0) primaryHourlyRate = hourlyRate;

      const shift = shiftByDate.get(date);
      let actualHours = 0;
      let attendanceStatus = shift?.attendance_status ?? null;

      if (shift?.working_hours != null) {
        actualHours = Number(shift.working_hours);
      } else if (shift?.check_in_time && shift?.check_out_time) {
        actualHours = hoursBetween(shift.check_in_time, shift.check_out_time);
      }

      if (isScheduled && shift?.check_in_time && !shift.check_out_time && shift.status === 'active') {
        blockingDates.push(date);
      }

      if (isScheduled) totalScheduledDays += 1;
      if (actualHours > 0) {
        totalWorkedDays += 1;
        totalActualHours += actualHours;
      }

      let displayLabel = resolveDisplayLabel(
        actualHours,
        shiftHours,
        attendanceStatus,
        (thresholds ?? []) as LabelThreshold[],
        isHoliday,
        isWeeklyOff,
      );

      let dayPay = 0;

      if (isHoliday) {
        const rule = rulesByStatus.get('holiday');
        dayPay = computeDayPay(rule, hourlyRate, shiftHours, actualHours, 'holiday', false);
        displayLabel = 'Holiday';
      } else if (isWeeklyOff) {
        dayPay = 0;
        displayLabel = 'Weekly Off';
      } else if (isScheduled) {
        const isIncomplete = blockingDates.includes(date);
        if (!isIncomplete) {
          if (attendanceStatus && rulesByStatus.has(attendanceStatus)) {
            const rule = rulesByStatus.get(attendanceStatus)!;
            const isAbsent = attendanceStatus === 'absent' && actualHours <= 0;
            dayPay = computeDayPay(rule, hourlyRate, shiftHours, actualHours, attendanceStatus, isAbsent);
          } else if (actualHours <= 0 && (!attendanceStatus || attendanceStatus === 'absent')) {
            dayPay = 0;
            displayLabel = 'Absent';
          } else {
            dayPay = computeDayPay(undefined, hourlyRate, shiftHours, actualHours, attendanceStatus, false);
          }
        }
      }

      grossEarnings += dayPay;

      dailyBreakdown.push({
        date,
        attendance_record_id: shift?.id ?? null,
        is_scheduled_working_day: isScheduled,
        actual_hours: actualHours,
        display_label: displayLabel,
        day_pay: dayPay,
        hourly_rate_applied: hourlyRate,
      });
    }

    if (blockingDates.length > 0) {
      return new Response(
        JSON.stringify({
          payslip_id: null,
          blocked: true,
          blocking_dates: blockingDates,
          gross_earnings: grossEarnings,
          net_pay: grossEarnings,
          hourly_rate: primaryHourlyRate,
          total_scheduled_days: totalScheduledDays,
          total_worked_days: totalWorkedDays,
          total_actual_hours: Math.round(totalActualHours * 100) / 100,
          daily_breakdown: dailyBreakdown,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const [{ data: officer }, { data: contract }, { data: companyDefaults }, { data: companyInfo }] =
      await Promise.all([
        supabase.from('officers').select('id, full_name, employee_id, department').eq('id', officerId).single(),
        supabase
          .from('employment_contracts')
          .select('employee_designation, employee_department, date_of_joining, basic_salary_monthly')
          .eq('officer_id', officerId)
          .maybeSingle(),
        supabase.from('company_contract_defaults').select('*').limit(1).maybeSingle(),
        supabase.from('company_info').select('company_name, address, city, state').limit(1).maybeSingle(),
      ]);

    const companyName =
      companyDefaults?.company_name ?? companyInfo?.company_name ?? 'Prime Fibernet';
    const companyAddress =
      companyDefaults?.company_address ??
      [companyInfo?.address, companyInfo?.city, companyInfo?.state].filter(Boolean).join(', ') ??
      '';
    const companyLogoUrl = companyDefaults?.logo_url ?? null;

    const payPeriodLabel = new Date(`${payPeriodStart}T00:00:00Z`).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

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

    const netPay = grossEarnings + preservedAdditions - preservedDeductions;

    const payslipRow = {
      officer_id: officerId,
      pay_period_start: payPeriodStart,
      pay_period_end: payPeriodEnd,
      pay_period_label: payPeriodLabel,
      company_name: companyName,
      company_address: companyAddress,
      company_logo_url: companyLogoUrl,
      employee_name: officer?.full_name ?? contract?.employee_full_name ?? 'Employee',
      employee_designation: contract?.employee_designation ?? 'Officer',
      employee_id_display: officer?.employee_id ?? officerId.slice(0, 8).toUpperCase(),
      employee_department: contract?.employee_department ?? officer?.department ?? null,
      bank_account_last4: null,
      hourly_rate: primaryHourlyRate,
      total_scheduled_days: totalScheduledDays,
      total_worked_days: totalWorkedDays,
      total_actual_hours: Math.round(totalActualHours * 100) / 100,
      gross_earnings: Math.round(grossEarnings * 100) / 100,
      total_additions: preservedAdditions,
      total_deductions: preservedDeductions,
      net_pay: Math.round(netPay * 100) / 100,
      status: 'draft',
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

    const breakdownRows = dailyBreakdown.map((d) => ({
      payslip_id: payslipId,
      date: d.date,
      attendance_record_id: d.attendance_record_id,
      is_scheduled_working_day: d.is_scheduled_working_day,
      actual_hours: d.actual_hours,
      display_label: d.display_label,
      day_pay: d.day_pay,
      hourly_rate_applied: d.hourly_rate_applied,
    }));

    const { error: bdErr } = await supabase.from('payslip_daily_breakdown').insert(breakdownRows);
    if (bdErr) throw bdErr;

    return new Response(
      JSON.stringify({
        payslip_id: payslipId,
        blocked: false,
        blocking_dates: [],
        gross_earnings: payslipRow.gross_earnings,
        net_pay: payslipRow.net_pay,
        hourly_rate: primaryHourlyRate,
        total_scheduled_days: totalScheduledDays,
        total_worked_days: totalWorkedDays,
        total_actual_hours: payslipRow.total_actual_hours,
        daily_breakdown: dailyBreakdown,
        rate_change_dates: [...rateChangeDates],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
