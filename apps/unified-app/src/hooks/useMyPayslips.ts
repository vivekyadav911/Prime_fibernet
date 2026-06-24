import { useCallback } from 'react';

import { useGetMyPayslipsQuery } from '@/services/api/payrollApi';
import { useAppSelector } from '@/store/hooks';

import type { Payslip } from '@/types/payslip';
import { payslipPdfFileName, payslipPdfTitle } from '@/utils/payslipNavigation';

import { usePayslipPDF } from './usePayslipPDF';

export function useMyPayslips() {
  const userId = useAppSelector((s) => s.auth.user?.id ?? '');
  const { data, isLoading, isError, error, refetch } = useGetMyPayslipsQuery(userId, {
    skip: !userId,
  });

  const { shareFromStoragePath, prepareLocalPdfView } = usePayslipPDF();

  const downloadPayslip = useCallback(
    async (storagePath: string) => {
      return prepareLocalPdfView(storagePath);
    },
    [prepareLocalPdfView],
  );

  const sharePayslip = useCallback(
    async (storagePath: string, payslip?: Pick<Payslip, 'payPeriodLabel' | 'employeeName'>) => {
      const title = payslip ? payslipPdfTitle(payslip) : 'My Payslip';
      const fileName = payslip ? payslipPdfFileName(payslip) : 'Payslip.pdf';
      await shareFromStoragePath(storagePath, title, fileName);
    },
    [shareFromStoragePath],
  );

  return {
    payslips: data ?? [],
    isLoading,
    isError,
    error,
    refetch,
    downloadPayslip,
    sharePayslip,
  };
}
