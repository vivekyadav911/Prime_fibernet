import {
  buildGenerationPreview,
  buildPayrollDashboardEntries,
  DEFAULT_SHIFT,
  mapShift,
  mapShiftDefinition,
  missingOfficerFields,
} from '@/services/payroll/payrollDashboardBuilder';
import { fetchPayslipApprovalValidation } from '@/services/payroll/payslipApprovalContext';
import { dayBeforeIso } from '@/services/payslip/payslipValidation';
import type {
  AttendanceLabelThreshold,
  CompanyHoliday,
  EmployeeCompensation,
  GeneratePayslipInput,
  LineItemType,
  PayTypeRule,
  PayrollDashboardEntry,
  PayrollGenerationPreview,
  Payslip,
  PayslipAuditLogEntry,
  PayslipCalculationResult,
  PayslipStatus,
} from '@/types/payslip';
import {
  mapAttendanceLabelThreshold,
  mapCompanyHoliday,
  mapEmployeeCompensation,
  mapPayTypeRule,
  mapPayslip,
} from '@/types/payslip';
import { periodFromMonthYear } from '@/utils/payrollPeriod';

import { baseApi } from './baseApi';
import type { TypedSupabaseClient } from './supabase';

const PAYSLIP_SELECT = `
  *,
  officers(full_name),
  payslip_daily_breakdown(*),
  payslip_line_items(*)
`;

export const PAYSLIPS_BUCKET = 'payslips';

export function buildPayslipStoragePath(officerId: string, payslipId: string): string {
  return `${officerId}/${payslipId}.pdf`;
}

async function insertPayrollAudit(
  client: TypedSupabaseClient,
  entry: {
    payslipId: string;
    action: string;
    performedBy: string | null;
    previousStatus?: string | null;
    newStatus?: string | null;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await client.from('payroll_audit_log').insert({
    payslip_id: entry.payslipId,
    action: entry.action,
    performed_by: entry.performedBy,
    previous_status: entry.previousStatus ?? null,
    new_status: entry.newStatus ?? null,
    reason: entry.reason ?? null,
    metadata: entry.metadata ?? {},
  });
  if (error) throw error;
}

export const payrollApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPayrollDashboard: builder.query<
      PayrollDashboardEntry[],
      { month: number; year: number }
    >({
      query: ({ month, year }) => ({
        handler: async (client) => {
          const period = periodFromMonthYear(month, year);

          const [
            { data: officers, error: offErr },
            { data: payslips, error: payErr },
            { data: shifts, error: shiftErr },
            { data: holidays, error: holErr },
            { data: shiftDefs, error: defErr },
            { data: contracts, error: contractErr },
            { data: bankRows, error: bankErr },
            { data: compensations, error: compErr },
          ] = await Promise.all([
            client
              .from('officers')
              .select('id, full_name, profile_photo_url')
              .order('full_name'),
            client
              .from('payslips')
              .select(
                `id, officer_id, status, net_pay, gross_earnings, hourly_rate, total_actual_hours,
                 total_additions, total_deductions, generated_pdf_url, pay_period_label, employee_name,
                 payslip_daily_breakdown(day_pay, actual_hours, display_label, is_scheduled_working_day)`,
              )
              .eq('pay_period_start', period.start)
              .eq('pay_period_end', period.end)
              .neq('status', 'voided'),
            client
              .from('shifts')
              .select(
                'id, officer_id, shift_date, check_in_time, check_out_time, attendance_status, working_hours, status',
              )
              .gte('shift_date', period.start)
              .lte('shift_date', period.end),
            client
              .from('company_holidays')
              .select('holiday_date')
              .gte('holiday_date', period.start)
              .lte('holiday_date', period.end),
            client
              .from('shift_definition_officers')
              .select(
                'officer_id, shift_definitions(start_time, end_time, working_days, is_overnight)',
              ),
            client
              .from('employment_contracts')
              .select('officer_id, employee_designation, employee_department'),
            client.from('officer_bank_details').select('officer_id, account_number'),
            client
              .from('employee_compensation')
              .select('officer_id')
              .lte('effective_from', period.end)
              .or(`effective_to.is.null,effective_to.gte.${period.start}`),
          ]);

          if (offErr) throw offErr;
          if (payErr) throw payErr;
          if (shiftErr) throw shiftErr;
          if (holErr) throw holErr;
          if (defErr) throw defErr;
          if (contractErr) throw contractErr;
          if (bankErr) throw bankErr;
          if (compErr) throw compErr;

          const contractByOfficer = new Map(
            (contracts ?? []).map((c) => [c.officer_id as string, c]),
          );
          const bankByOfficer = new Map((bankRows ?? []).map((b) => [b.officer_id as string, b]));
          const compOfficerIds = new Set((compensations ?? []).map((c) => c.officer_id as string));

          const profiles = (officers ?? []).map((o) => {
            const contract = contractByOfficer.get(o.id as string);
            const bank = bankByOfficer.get(o.id as string);
            return {
              officer_id: o.id as string,
              full_name: o.full_name as string | null,
              employee_id: null,
              designation: (contract?.employee_designation as string) ?? null,
              department: (contract?.employee_department as string) ?? null,
              bank_account_number: (bank?.account_number as string) ?? null,
              has_compensation: compOfficerIds.has(o.id as string),
            };
          });

          return buildPayrollDashboardEntries({
            officers: (officers ?? []) as never,
            payslips: (payslips ?? []) as never,
            shifts: (shifts ?? []) as never,
            holidays: (holidays ?? []).map((h) => h.holiday_date as string),
            shiftDefinitions: (shiftDefs ?? []) as never,
            profiles,
            periodStart: period.start,
            periodEnd: period.end,
            periodLabel: period.label,
          });
        },
      }),
      providesTags: ['Payroll', 'Payslips'],
    }),

    calculatePayslip: builder.mutation<PayslipCalculationResult, GeneratePayslipInput>({
      query: (body) => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('generate-payslip', {
            body: {
              officer_id: body.officerId,
              pay_period_start: body.payPeriodStart,
              pay_period_end: body.payPeriodEnd,
              force_overwrite_draft: body.forceOverwriteDraft ?? false,
            },
          });
          if (error) throw error;
          const result = data as Record<string, unknown>;
          if (result.error && !result.payslip_id && !result.blocked) {
            const code = result.code as string | undefined;
            const unresolved = (result.unresolved_dates as string[]) ?? [];
            const missing = (result.missing_fields as string[]) ?? [];
            let message = String(result.error);
            if (code === 'UNRESOLVED_DAYS' && unresolved.length) {
              message = `Incomplete attendance on: ${unresolved.join(', ')}`;
            } else if (code === 'MISSING_OFFICER_DATA' && missing.length) {
              message = `Missing officer data: ${missing.join(', ')}`;
            } else if (code === 'NO_SHIFT_ASSIGNED') {
              message = 'Officer has no shift schedule assigned — configure shift before generating';
            }
            throw new Error(message);
          }
          return {
            payslipId: (result.payslip_id as string) ?? null,
            blocked: Boolean(result.blocked),
            blockingDates: (result.blocking_dates as string[]) ?? [],
            grossEarnings: Number(result.gross_earnings ?? 0),
            netPay: Number(result.net_pay ?? 0),
            hourlyRate: Number(result.hourly_rate ?? 0),
            totalScheduledDays: Number(result.total_scheduled_days ?? 0),
            totalWorkedDays: Number(result.total_worked_days ?? 0),
            totalActualHours: Number(result.total_actual_hours ?? 0),
            dailyBreakdown: ((result.daily_breakdown as Record<string, unknown>[]) ?? []).map(
              (d) => ({
                date: d.date as string,
                attendanceRecordId: (d.attendance_record_id as string) ?? null,
                isScheduledWorkingDay: Boolean(d.is_scheduled_working_day),
                actualHours: Number(d.actual_hours ?? 0),
                displayLabel: d.display_label as string,
                dayPay: Number(d.day_pay ?? 0),
                hourlyRateApplied: Number(d.hourly_rate_applied ?? 0),
              }),
            ),
            rateChangeDates: (result.rate_change_dates as string[]) ?? undefined,
          };
        },
      }),
      invalidatesTags: ['Payslips', 'Payroll'],
    }),

    getPayslip: builder.query<Payslip, string>({
      query: (payslipId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('payslips')
            .select(PAYSLIP_SELECT)
            .eq('id', payslipId)
            .single();
          if (error) throw error;
          return mapPayslip(data as never);
        },
      }),
      providesTags: (_r, _e, id) => [{ type: 'Payslips', id }],
    }),

    getPayslipByPeriod: builder.query<
      Payslip | null,
      { officerId: string; payPeriodStart: string; payPeriodEnd: string }
    >({
      query: ({ officerId, payPeriodStart, payPeriodEnd }) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('payslips')
            .select(PAYSLIP_SELECT)
            .eq('officer_id', officerId)
            .eq('pay_period_start', payPeriodStart)
            .eq('pay_period_end', payPeriodEnd)
            .maybeSingle();
          if (error) throw error;
          return data ? mapPayslip(data as never) : null;
        },
      }),
      providesTags: ['Payslips'],
    }),

    addPayslipLineItem: builder.mutation<
      Payslip,
      { payslipId: string; itemType: LineItemType; label: string; amount: number; notes?: string }
    >({
      query: ({ payslipId, itemType, label, amount, notes }) => ({
        handler: async (client) => {
          const { data: session } = await client.auth.getSession();
          const { error: insErr } = await client.from('payslip_line_items').insert({
            payslip_id: payslipId,
            item_type: itemType,
            label,
            amount,
            notes: notes ?? null,
            added_by: session.session?.user?.id ?? null,
          });
          if (insErr) throw insErr;

          const { data: items } = await client
            .from('payslip_line_items')
            .select('item_type, amount')
            .eq('payslip_id', payslipId);

          let additions = 0;
          let deductions = 0;
          (items ?? []).forEach((i) => {
            if (i.item_type === 'addition') additions += Number(i.amount);
            else deductions += Number(i.amount);
          });

          const { data: payslip } = await client
            .from('payslips')
            .select('gross_earnings')
            .eq('id', payslipId)
            .single();

          const gross = Number(payslip?.gross_earnings ?? 0);
          const netPay = gross + additions - deductions;

          await client
            .from('payslips')
            .update({
              total_additions: additions,
              total_deductions: deductions,
              net_pay: netPay,
              updated_at: new Date().toISOString(),
            })
            .eq('id', payslipId);

          const { data, error } = await client
            .from('payslips')
            .select(PAYSLIP_SELECT)
            .eq('id', payslipId)
            .single();
          if (error) throw error;
          return mapPayslip(data as never);
        },
      }),
      invalidatesTags: (_r, _e, { payslipId }) => [{ type: 'Payslips', id: payslipId }],
    }),

    removePayslipLineItem: builder.mutation<Payslip, { lineItemId: string; payslipId: string }>({
      query: ({ lineItemId, payslipId }) => ({
        handler: async (client) => {
          const { error: delErr } = await client
            .from('payslip_line_items')
            .delete()
            .eq('id', lineItemId);
          if (delErr) throw delErr;

          const { data: items } = await client
            .from('payslip_line_items')
            .select('item_type, amount')
            .eq('payslip_id', payslipId);

          let additions = 0;
          let deductions = 0;
          (items ?? []).forEach((i) => {
            if (i.item_type === 'addition') additions += Number(i.amount);
            else deductions += Number(i.amount);
          });

          const { data: payslip } = await client
            .from('payslips')
            .select('gross_earnings')
            .eq('id', payslipId)
            .single();

          const gross = Number(payslip?.gross_earnings ?? 0);
          const netPay = gross + additions - deductions;

          await client
            .from('payslips')
            .update({
              total_additions: additions,
              total_deductions: deductions,
              net_pay: netPay,
              updated_at: new Date().toISOString(),
            })
            .eq('id', payslipId);

          const { data, error } = await client
            .from('payslips')
            .select(PAYSLIP_SELECT)
            .eq('id', payslipId)
            .single();
          if (error) throw error;
          return mapPayslip(data as never);
        },
      }),
      invalidatesTags: (_r, _e, { payslipId }) => [{ type: 'Payslips', id: payslipId }],
    }),

    approvePayslip: builder.mutation<
      Payslip,
      { payslipId: string; signatureName: string; negativePayOverrideNote?: string }
    >({
      query: ({ payslipId, signatureName, negativePayOverrideNote }) => ({
        handler: async (client) => {
          const { data: session } = await client.auth.getSession();
          const performedBy = session.session?.user?.id ?? null;

          const approvalValidation = await fetchPayslipApprovalValidation(
            client,
            payslipId,
            negativePayOverrideNote,
          );
          if (!approvalValidation.allowed) {
            throw new Error(approvalValidation.reasons.join('\n') || 'Cannot approve this payslip');
          }

          const { data: current } = await client
            .from('payslips')
            .select('status')
            .eq('id', payslipId)
            .single();

          const nextStatus: PayslipStatus = 'approved';

          const { error } = await client
            .from('payslips')
            .update({
              status: nextStatus,
              authorized_signature_name: signatureName,
              authorized_by: performedBy,
              authorized_at: new Date().toISOString(),
              negative_pay_override_note: negativePayOverrideNote?.trim() || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', payslipId);
          if (error) throw error;

          await insertPayrollAudit(client, {
            payslipId,
            action: 'approved',
            performedBy,
            previousStatus: (current?.status as string) ?? null,
            newStatus: nextStatus,
            reason: negativePayOverrideNote?.trim() || null,
          });

          const { data, error: fetchErr } = await client
            .from('payslips')
            .select(PAYSLIP_SELECT)
            .eq('id', payslipId)
            .single();
          if (fetchErr) throw fetchErr;
          return mapPayslip(data as never);
        },
      }),
      invalidatesTags: (_r, _e, { payslipId }) => [{ type: 'Payslips', id: payslipId }, 'Payroll'],
    }),

    updatePayslipPdfUrl: builder.mutation<void, { payslipId: string; storagePath: string }>({
      query: ({ payslipId, storagePath }) => ({
        handler: async (client) => {
          const { error } = await client
            .from('payslips')
            .update({
              generated_pdf_url: storagePath,
              updated_at: new Date().toISOString(),
            })
            .eq('id', payslipId);
          if (error) throw error;
        },
      }),
      invalidatesTags: (_r, _e, { payslipId }) => [{ type: 'Payslips', id: payslipId }],
    }),

    getPayslipSignedUrl: builder.query<string, { storagePath: string; expirySeconds?: number }>({
      query: ({ storagePath, expirySeconds = 604800 }) => ({
        handler: async (client) => {
          const { data, error } = await client.storage
            .from(PAYSLIPS_BUCKET)
            .createSignedUrl(storagePath, expirySeconds);
          if (error) throw error;
          if (!data?.signedUrl) throw new Error('Could not create signed URL');
          return data.signedUrl;
        },
      }),
    }),

    getMyPayslips: builder.query<Payslip[], string>({
      query: (userId) => ({
        handler: async (client) => {
          const { data: officer } = await client
            .from('officers')
            .select('id')
            .or(`user_id.eq.${userId},auth_user_id.eq.${userId}`)
            .maybeSingle();
          if (!officer?.id) return [];

          const { data, error } = await client
            .from('payslips')
            .select(PAYSLIP_SELECT)
            .eq('officer_id', officer.id)
            .in('status', ['approved', 'paid'])
            .order('pay_period_start', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => mapPayslip(row as never));
        },
      }),
      providesTags: ['Payslips'],
    }),

    // ─── Settings ────────────────────────────────────────────────────────────

    getPayTypeRules: builder.query<PayTypeRule[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('pay_type_rules')
            .select('*')
            .order('attendance_status');
          if (error) throw error;
          return (data ?? []).map((r) => mapPayTypeRule(r as never));
        },
      }),
      providesTags: ['PayslipSettings'],
    }),

    updatePayTypeRule: builder.mutation<
      PayTypeRule,
      { id: string; payFraction?: number; usesScheduledHours?: boolean; description?: string }
    >({
      query: ({ id, ...patch }) => ({
        handler: async (client) => {
          const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (patch.payFraction != null) update.pay_fraction = patch.payFraction;
          if (patch.usesScheduledHours != null) update.uses_scheduled_hours = patch.usesScheduledHours;
          if (patch.description != null) update.description = patch.description;
          const { data, error } = await client
            .from('pay_type_rules')
            .update(update)
            .eq('id', id)
            .select()
            .single();
          if (error) throw error;
          return mapPayTypeRule(data as never);
        },
      }),
      invalidatesTags: ['PayslipSettings'],
    }),

    getLabelThresholds: builder.query<AttendanceLabelThreshold[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('attendance_label_thresholds')
            .select('*')
            .order('sort_order', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((r) => mapAttendanceLabelThreshold(r as never));
        },
      }),
      providesTags: ['PayslipSettings'],
    }),

    updateLabelThreshold: builder.mutation<
      AttendanceLabelThreshold,
      { id: string; minHoursFraction?: number; maxHoursFraction?: number | null; label?: string }
    >({
      query: ({ id, ...patch }) => ({
        handler: async (client) => {
          const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (patch.minHoursFraction != null) update.min_hours_fraction = patch.minHoursFraction;
          if (patch.maxHoursFraction !== undefined) update.max_hours_fraction = patch.maxHoursFraction;
          if (patch.label != null) update.label = patch.label;
          const { data, error } = await client
            .from('attendance_label_thresholds')
            .update(update)
            .eq('id', id)
            .select()
            .single();
          if (error) throw error;
          return mapAttendanceLabelThreshold(data as never);
        },
      }),
      invalidatesTags: ['PayslipSettings'],
    }),

    getCompanyHolidays: builder.query<CompanyHoliday[], { year?: number }>({
      query: ({ year }) => ({
        handler: async (client) => {
          let q = client.from('company_holidays').select('*').order('holiday_date');
          if (year) {
            q = q.gte('holiday_date', `${year}-01-01`).lte('holiday_date', `${year}-12-31`);
          }
          const { data, error } = await q;
          if (error) throw error;
          return (data ?? []).map((r) => mapCompanyHoliday(r as never));
        },
      }),
      providesTags: ['PayslipSettings'],
    }),

    createCompanyHoliday: builder.mutation<
      CompanyHoliday,
      { holidayDate: string; name: string; appliesToAll?: boolean; scopeLabel?: string }
    >({
      query: (body) => ({
        handler: async (client) => {
          const { data: session } = await client.auth.getSession();
          const appliesToAll = body.appliesToAll ?? true;
          const { data, error } = await client
            .from('company_holidays')
            .insert({
              holiday_date: body.holidayDate,
              name: body.name,
              applies_to_all: appliesToAll,
              scope_label: body.scopeLabel?.trim() || (appliesToAll ? 'Company-wide' : 'Specific group'),
              created_by: session.session?.user?.id ?? null,
            })
            .select()
            .single();
          if (error) throw error;
          return mapCompanyHoliday(data as never);
        },
      }),
      invalidatesTags: ['PayslipSettings'],
    }),

    updateCompanyHoliday: builder.mutation<
      CompanyHoliday,
      { id: string; holidayDate: string; name: string; appliesToAll: boolean; scopeLabel?: string }
    >({
      query: ({ id, holidayDate, name, appliesToAll, scopeLabel }) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('company_holidays')
            .update({
              holiday_date: holidayDate,
              name,
              applies_to_all: appliesToAll,
              scope_label: scopeLabel?.trim() || (appliesToAll ? 'Company-wide' : 'Specific group'),
            })
            .eq('id', id)
            .select()
            .single();
          if (error) throw error;
          return mapCompanyHoliday(data as never);
        },
      }),
      invalidatesTags: ['PayslipSettings'],
    }),

    deleteCompanyHoliday: builder.mutation<void, string>({
      query: (id) => ({
        handler: async (client) => {
          const { error } = await client.from('company_holidays').delete().eq('id', id);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['PayslipSettings'],
    }),

    getEmployeeCompensations: builder.query<EmployeeCompensation[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('employee_compensation')
            .select('*, officers(full_name)')
            .order('effective_from', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((r) => mapEmployeeCompensation(r as never));
        },
      }),
      providesTags: ['PayslipSettings'],
    }),

    upsertEmployeeCompensation: builder.mutation<
      EmployeeCompensation,
      { officerId: string; monthlySalary: number; effectiveFrom: string }
    >({
      query: (body) => ({
        handler: async (client) => {
          const { data: session } = await client.auth.getSession();
          const closeBefore = dayBeforeIso(body.effectiveFrom);

          await client
            .from('employee_compensation')
            .update({ effective_to: closeBefore })
            .eq('officer_id', body.officerId)
            .lt('effective_from', body.effectiveFrom)
            .or(`effective_to.is.null,effective_to.gte.${body.effectiveFrom}`);

          const { data, error } = await client
            .from('employee_compensation')
            .insert({
              officer_id: body.officerId,
              monthly_salary: body.monthlySalary,
              effective_from: body.effectiveFrom,
              created_by: session.session?.user?.id ?? null,
            })
            .select()
            .single();
          if (error) throw error;
          return mapEmployeeCompensation(data as never);
        },
      }),
      invalidatesTags: ['PayslipSettings'],
    }),

    getPayrollGenerationPreview: builder.query<
      PayrollGenerationPreview,
      { officerId: string; payPeriodStart: string; payPeriodEnd: string }
    >({
      query: ({ officerId, payPeriodStart, payPeriodEnd }) => ({
        handler: async (client) => {
          const period = periodFromMonthYear(
            Number(payPeriodStart.slice(5, 7)),
            Number(payPeriodStart.slice(0, 4)),
          );

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

          const shiftDef = mapShiftDefinition(
            (shiftLink?.shift_definitions as never) ?? null,
          ) ?? DEFAULT_SHIFT;

          const hasShiftAssignment = Boolean(shiftLink?.shift_definitions);

          return buildGenerationPreview({
            officerId,
            officerName: officer?.full_name?.trim() || 'Unknown officer',
            periodStart: payPeriodStart,
            periodEnd: payPeriodEnd,
            periodLabel: period.label,
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
            missingOfficerFields: missingOfficerFields(profile),
            hasCompensation: profile.has_compensation,
          });
        },
      }),
      providesTags: ['Payroll'],
    }),

    getPayslipAuditLog: builder.query<PayslipAuditLogEntry[], string>({
      query: (payslipId) => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('payroll_audit_log')
            .select('*')
            .eq('payslip_id', payslipId)
            .order('performed_at', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => ({
            id: row.id as string,
            payslipId: row.payslip_id as string,
            action: row.action as string,
            performedBy: (row.performed_by as string) ?? null,
            performedAt: row.performed_at as string,
            previousStatus: (row.previous_status as string) ?? null,
            newStatus: (row.new_status as string) ?? null,
            reason: (row.reason as string) ?? null,
            metadata: (row.metadata as Record<string, unknown>) ?? {},
          }));
        },
      }),
      providesTags: (_r, _e, id) => [{ type: 'Payslips', id: `audit-${id}` }],
    }),

    voidPayslip: builder.mutation<
      Payslip,
      { payslipId: string; reason: string; regenerate?: boolean }
    >({
      query: ({ payslipId, reason }) => ({
        handler: async (client) => {
          const { data: session } = await client.auth.getSession();
          const performedBy = session.session?.user?.id ?? null;
          const { data: current } = await client
            .from('payslips')
            .select('status')
            .eq('id', payslipId)
            .single();

          const { error } = await client
            .from('payslips')
            .update({
              status: 'voided',
              voided_at: new Date().toISOString(),
              voided_by: performedBy,
              void_reason: reason.trim(),
              generated_pdf_url: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', payslipId);
          if (error) throw error;

          await insertPayrollAudit(client, {
            payslipId,
            action: 'voided',
            performedBy,
            previousStatus: (current?.status as string) ?? null,
            newStatus: 'voided',
            reason: reason.trim(),
          });

          const { data, error: fetchErr } = await client
            .from('payslips')
            .select(PAYSLIP_SELECT)
            .eq('id', payslipId)
            .single();
          if (fetchErr) throw fetchErr;
          return mapPayslip(data as never);
        },
      }),
      invalidatesTags: (_r, _e, { payslipId }) => [
        { type: 'Payslips', id: payslipId },
        'Payroll',
      ],
    }),

    bulkApprovePayslips: builder.mutation<
      { approved: string[]; failed: { payslipId: string; error: string }[] },
      { payslipIds: string[]; signatureName: string; overrideNote?: string }
    >({
      query: ({ payslipIds, signatureName, overrideNote }) => ({
        handler: async (client) => {
          const approved: string[] = [];
          const failed: { payslipId: string; error: string }[] = [];

          for (const payslipId of payslipIds) {
            try {
              const { data: session } = await client.auth.getSession();
              const performedBy = session.session?.user?.id ?? null;

              const approvalValidation = await fetchPayslipApprovalValidation(
                client,
                payslipId,
                overrideNote,
              );
              if (!approvalValidation.allowed) {
                failed.push({
                  payslipId,
                  error: approvalValidation.reasons.join('; ') || 'Cannot approve',
                });
                continue;
              }

              const { data: current } = await client
                .from('payslips')
                .select('status')
                .eq('id', payslipId)
                .single();

              const { error } = await client
                .from('payslips')
                .update({
                  status: 'approved',
                  authorized_signature_name: signatureName,
                  authorized_by: performedBy,
                  authorized_at: new Date().toISOString(),
                  negative_pay_override_note: overrideNote?.trim() || null,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', payslipId);
              if (error) throw error;

              await insertPayrollAudit(client, {
                payslipId,
                action: 'approved',
                performedBy,
                previousStatus: (current?.status as string) ?? null,
                newStatus: 'approved',
                reason: overrideNote?.trim() || null,
                metadata: { bulk: true },
              });

              approved.push(payslipId);
            } catch (e) {
              failed.push({
                payslipId,
                error: e instanceof Error ? e.message : 'Approval failed',
              });
            }
          }

          return { approved, failed };
        },
      }),
      invalidatesTags: ['Payroll', 'Payslips'],
    }),
  }),
});

export const {
  useGetPayrollDashboardQuery,
  useGetPayrollGenerationPreviewQuery,
  useCalculatePayslipMutation,
  useGetPayslipQuery,
  useGetPayslipByPeriodQuery,
  useGetPayslipAuditLogQuery,
  useAddPayslipLineItemMutation,
  useRemovePayslipLineItemMutation,
  useApprovePayslipMutation,
  useBulkApprovePayslipsMutation,
  useVoidPayslipMutation,
  useUpdatePayslipPdfUrlMutation,
  useLazyGetPayslipSignedUrlQuery,
  useGetMyPayslipsQuery,
  useGetPayTypeRulesQuery,
  useUpdatePayTypeRuleMutation,
  useGetLabelThresholdsQuery,
  useUpdateLabelThresholdMutation,
  useGetCompanyHolidaysQuery,
  useCreateCompanyHolidayMutation,
  useUpdateCompanyHolidayMutation,
  useDeleteCompanyHolidayMutation,
  useGetEmployeeCompensationsQuery,
  useUpsertEmployeeCompensationMutation,
} = payrollApi;

export { periodFromMonthYear };
