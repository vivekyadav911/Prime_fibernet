import { useCallback, useMemo, useState } from 'react';

import {
  periodFromMonthYear,
  useCalculatePayslipMutation,
  useGetPayrollDashboardQuery,
} from '@/services/api/payrollApi';
import { clampPayrollMonth, clampPayrollYear } from '@/utils/payrollPeriod';

export function usePayrollDashboard(initialMonth?: number, initialYear?: number) {
  const now = new Date();
  const [month, setMonthRaw] = useState(initialMonth ?? now.getMonth() + 1);
  const [year, setYearRaw] = useState(initialYear ?? now.getFullYear());

  const setMonth = useCallback((value: number) => {
    setMonthRaw(clampPayrollMonth(value));
  }, []);

  const setYear = useCallback((value: number) => {
    setYearRaw(clampPayrollYear(value));
  }, []);

  const setPeriod = useCallback((nextMonth: number, nextYear: number) => {
    const normalized = periodFromMonthYear(nextMonth, nextYear);
    setMonthRaw(normalized.month);
    setYearRaw(normalized.year);
  }, []);

  const { data, isLoading, isError, error, refetch } = useGetPayrollDashboardQuery({
    month,
    year,
  });

  const [calculatePayslip, { isLoading: isGenerating }] = useCalculatePayslipMutation();

  const period = useMemo(() => periodFromMonthYear(month, year), [month, year]);

  const triggerGenerate = useCallback(
    async (officerId: string, forceOverwriteDraft = false) => {
      return calculatePayslip({
        officerId,
        payPeriodStart: period.start,
        payPeriodEnd: period.end,
        forceOverwriteDraft,
      }).unwrap();
    },
    [calculatePayslip, period],
  );

  const triggerBulkGenerate = useCallback(
    async (officerIds: string[]) => {
      const results = await Promise.allSettled(
        officerIds.map((id) => triggerGenerate(id, false)),
      );
      return results;
    },
    [triggerGenerate],
  );

  return {
    month,
    year,
    setMonth,
    setYear,
    setPeriod,
    period,
    entries: data ?? [],
    isLoading,
    isError,
    error,
    refetch,
    triggerGenerate,
    triggerBulkGenerate,
    isGenerating,
  };
}
