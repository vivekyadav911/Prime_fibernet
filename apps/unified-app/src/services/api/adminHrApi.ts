import type { AttendanceRecord, PayrollEntry } from '@/types/api/admin';

import { baseApi } from './baseApi';
import { OFFICER_USERS_NAME_EMBED } from './mappers';

export const adminHrApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAttendance: builder.query<AttendanceRecord[], { date?: string; officerId?: string }>({
      query: ({ date, officerId }) => ({
        handler: async (client) => {
          const targetDate = date ?? new Date().toISOString().slice(0, 10);
          let query = client.from('shifts').select('*, officers(full_name)').eq('shift_date', targetDate);
          if (officerId) query = query.eq('officer_id', officerId);
          const { data, error } = await query;
          if (error) throw error;

          return (data ?? []).map((row) => {
            const checkIn = row.check_in_time as string | null;
            const checkOut = row.check_out_time as string | null;
            let hours = 0;
            if (checkIn && checkOut) {
              hours = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 3600000;
            }
            return {
              id: row.id as string,
              officerId: row.officer_id as string,
              officerName: (row.officers as { full_name?: string })?.full_name ?? 'Officer',
              checkInTime: checkIn,
              checkOutTime: checkOut,
              hoursWorked: Math.round(hours * 10) / 10,
              location: (row.location as string) ?? null,
              status: (row.status === 'completed' ? 'present' : row.status === 'active' ? 'late' : 'absent') as AttendanceRecord['status'],
            };
          });
        },
      }),
      providesTags: ['Shifts'],
    }),

    getCheckInExceptions: builder.query<
      { id: string; officerName: string; checkInTime: string; reason: string; status: string }[],
      void
    >({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('attendance_exceptions')
            .select('*, officers(full_name)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
          if (error) throw error;
          return (data ?? []).map((row) => ({
            id: row.id as string,
            officerName: (row.officers as { full_name?: string })?.full_name ?? 'Officer',
            checkInTime: row.check_in_time as string,
            reason: (row.reason as string) ?? 'Geofence exception',
            status: row.status as string,
          }));
        },
      }),
      providesTags: ['Shifts'],
    }),

    reviewCheckInException: builder.mutation<void, { id: string; action: 'approve' | 'reject' }>({
      query: ({ id, action }) => ({
        handler: async (client) => {
          const { error } = await client
            .from('attendance_exceptions')
            .update({ status: action === 'approve' ? 'approved' : 'rejected' })
            .eq('id', id);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Shifts'],
    }),

    getAttendanceRecords: builder.query<
      { officerId: string; officerName: string; present: number; absent: number; late: number; leaves: number; overtime: number }[],
      { month?: string; officerId?: string }
    >({
      query: ({ month, officerId }) => ({
        handler: async (client) => {
          const monthStart = month ?? new Date().toISOString().slice(0, 7);
          let query = client.from('shifts').select('*, officers(full_name)').gte('shift_date', `${monthStart}-01`);
          if (officerId) query = query.eq('officer_id', officerId);
          const { data, error } = await query;
          if (error) throw error;

          const byOfficer = new Map<string, { name: string; present: number; absent: number; late: number }>();
          for (const row of data ?? []) {
            const oid = row.officer_id as string;
            const existing = byOfficer.get(oid) ?? {
              name: (row.officers as { full_name?: string })?.full_name ?? 'Officer',
              present: 0,
              absent: 0,
              late: 0,
            };
            if (row.status === 'completed') existing.present += 1;
            else if (row.status === 'active') existing.late += 1;
            else existing.absent += 1;
            byOfficer.set(oid, existing);
          }

          return [...byOfficer.entries()].map(([oid, v]) => ({
            officerId: oid,
            officerName: v.name,
            present: v.present,
            absent: v.absent,
            late: v.late,
            leaves: 0,
            overtime: 0,
          }));
        },
      }),
      providesTags: ['Shifts'],
    }),

    getCompletedShifts: builder.query<
      { id: string; officerName: string; shiftDate: string; startTime: string; endTime: string; duration: number; locationVerified: boolean }[],
      { page?: number }
    >({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('shifts')
            .select('*, officers(full_name)')
            .eq('status', 'completed')
            .order('shift_date', { ascending: false })
            .limit(100);
          if (error) throw error;
          return (data ?? []).map((row) => {
            const start = row.check_in_time as string;
            const end = row.check_out_time as string;
            const duration =
              start && end
                ? (new Date(end).getTime() - new Date(start).getTime()) / 3600000
                : 0;
            return {
              id: row.id as string,
              officerName: (row.officers as { full_name?: string })?.full_name ?? 'Officer',
              shiftDate: row.shift_date as string,
              startTime: start,
              endTime: end,
              duration: Math.round(duration * 10) / 10,
              locationVerified: Boolean(row.location),
            };
          });
        },
      }),
      providesTags: ['Shifts'],
    }),

    getPayroll: builder.query<PayrollEntry[], { month?: string; year?: string }>({
      query: ({ month, year }) => ({
        handler: async (client) => {
          const { data: officers, error } = await client
            .from('officers')
            .select(`*, ${OFFICER_USERS_NAME_EMBED}`);
          if (error) throw error;

          return (officers ?? []).map((row) => ({
            officerId: row.id as string,
            officerName: (row.users as { name?: string })?.name ?? 'Officer',
            baseSalary: Number(row.base_salary ?? 25000),
            allowances: Number(row.allowances ?? 2000),
            overtime: Number(row.overtime_pay ?? 0),
            bonus: Number(row.bonus ?? 0),
            deductions: Number(row.deductions ?? 0),
            netPay:
              Number(row.base_salary ?? 25000) +
              Number(row.allowances ?? 2000) +
              Number(row.overtime_pay ?? 0) +
              Number(row.bonus ?? 0) -
              Number(row.deductions ?? 0),
          }));
        },
      }),
      providesTags: ['Payslips'],
    }),

    generatePayslip: builder.mutation<void, { officerId: string; month: string; year: string }>({
      query: (body) => ({
        handler: async (client) => {
          const { error } = await client.functions.invoke('generate-payslip', { body });
          if (error) throw error;
        },
      }),
      invalidatesTags: ['Payslips'],
    }),

    getAllPayslips: builder.query<
      { id: string; officerName: string; month: string; amount: number; issuedDate: string; pdfUrl: string | null }[],
      { page?: number; officerId?: string }
    >({
      query: ({ officerId }) => ({
        handler: async (client) => {
          let query = client.from('payslips').select('*, officers(full_name)').order('month', { ascending: false });
          if (officerId) query = query.eq('officer_id', officerId);
          const { data, error } = await query;
          if (error) throw error;
          return (data ?? []).map((row) => ({
            id: row.id as string,
            officerName: (row.officers as { full_name?: string })?.full_name ?? 'Officer',
            month: row.month as string,
            amount: Number(row.net_pay ?? 0),
            issuedDate: (row.issued_at as string) ?? row.month as string,
            pdfUrl: (row.pdf_url as string) ?? null,
          }));
        },
      }),
      providesTags: ['Payslips'],
    }),
  }),
});

export const {
  useGetAttendanceQuery,
  useGetCheckInExceptionsQuery,
  useReviewCheckInExceptionMutation,
  useGetAttendanceRecordsQuery,
  useGetCompletedShiftsQuery,
  useGetPayrollQuery,
  useGeneratePayslipMutation,
  useGetAllPayslipsQuery,
} = adminHrApi;
