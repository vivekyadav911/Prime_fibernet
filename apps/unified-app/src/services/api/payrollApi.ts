import type {
  AttendanceLabelThreshold,
  CompanyHoliday,
  EmployeeCompensation,
  GeneratePayslipInput,
  LineItemType,
  PayTypeRule,
  PayrollDashboardEntry,
  Payslip,
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

import { baseApi } from './baseApi';

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

function periodFromMonthYear(month: number, year: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export const payrollApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPayrollDashboard: builder.query<
      PayrollDashboardEntry[],
      { month: number; year: number }
    >({
      query: ({ month, year }) => ({
        handler: async (client) => {
          const { start, end } = periodFromMonthYear(month, year);

          const [{ data: officers, error: offErr }, { data: payslips, error: payErr }] =
            await Promise.all([
              client.from('officers').select('id, full_name').order('full_name'),
              client
                .from('payslips')
                .select('id, officer_id, status, net_pay, generated_pdf_url, pay_period_label, employee_name')
                .eq('pay_period_start', start)
                .eq('pay_period_end', end),
            ]);
          if (offErr) throw offErr;
          if (payErr) throw payErr;

          const payslipByOfficer = new Map(
            (payslips ?? []).map((p) => [p.officer_id as string, p]),
          );

          return (officers ?? []).map((o) => {
            const ps = payslipByOfficer.get(o.id as string);
            return {
              officerId: o.id as string,
              officerName: (o.full_name as string) ?? 'Officer',
              payslipId: (ps?.id as string) ?? null,
              status: ps ? (ps.status as PayslipStatus) : ('not_started' as const),
              netPayPreview: ps?.net_pay != null ? Number(ps.net_pay) : null,
              generatedPdfUrl: (ps?.generated_pdf_url as string) ?? null,
              payPeriodLabel: (ps?.pay_period_label as string) ?? null,
              blocked: false,
              blockingDates: [],
            };
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
          const { data: current } = await client
            .from('payslips')
            .select('net_pay')
            .eq('id', payslipId)
            .single();

          if (Number(current?.net_pay ?? 0) < 0 && !negativePayOverrideNote?.trim()) {
            throw new Error('Net pay is negative — provide an override note to approve');
          }

          const { error } = await client
            .from('payslips')
            .update({
              status: 'approved',
              authorized_signature_name: signatureName,
              authorized_by: session.session?.user?.id ?? null,
              authorized_at: new Date().toISOString(),
              negative_pay_override_note: negativePayOverrideNote?.trim() || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', payslipId);
          if (error) throw error;

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
      { holidayDate: string; name: string }
    >({
      query: (body) => ({
        handler: async (client) => {
          const { data: session } = await client.auth.getSession();
          const { data, error } = await client
            .from('company_holidays')
            .insert({
              holiday_date: body.holidayDate,
              name: body.name,
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

          await client
            .from('employee_compensation')
            .update({ effective_to: body.effectiveFrom })
            .eq('officer_id', body.officerId)
            .is('effective_to', null);

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
  }),
});

export const {
  useGetPayrollDashboardQuery,
  useCalculatePayslipMutation,
  useGetPayslipQuery,
  useGetPayslipByPeriodQuery,
  useAddPayslipLineItemMutation,
  useRemovePayslipLineItemMutation,
  useApprovePayslipMutation,
  useUpdatePayslipPdfUrlMutation,
  useLazyGetPayslipSignedUrlQuery,
  useGetMyPayslipsQuery,
  useGetPayTypeRulesQuery,
  useUpdatePayTypeRuleMutation,
  useGetLabelThresholdsQuery,
  useUpdateLabelThresholdMutation,
  useGetCompanyHolidaysQuery,
  useCreateCompanyHolidayMutation,
  useDeleteCompanyHolidayMutation,
  useGetEmployeeCompensationsQuery,
  useUpsertEmployeeCompensationMutation,
} = payrollApi;

export { periodFromMonthYear };
