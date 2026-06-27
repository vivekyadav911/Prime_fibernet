import { useCallback } from 'react';

import {
  useAddPayslipLineItemMutation,
  useApprovePayslipMutation,
  useCalculatePayslipMutation,
  useGetPayslipQuery,
  useRemovePayslipLineItemMutation,
} from '@/services/api/payrollApi';
import type { LineItemType } from '@/types/payslip';

import { usePayslipPDF } from './usePayslipPDF';

export function usePayslipCalculation(payslipId: string | null) {
  const { data: payslip, isLoading, isError, error, refetch } = useGetPayslipQuery(
    payslipId ?? '',
    { skip: !payslipId },
  );

  const [calculatePayslip, { isLoading: isCalculating }] = useCalculatePayslipMutation();
  const [addLineItem, { isLoading: isAddingItem }] = useAddPayslipLineItemMutation();
  const [removeLineItem, { isLoading: isRemovingItem }] = useRemovePayslipLineItemMutation();
  const [approvePayslip, { isLoading: isApproving }] = useApprovePayslipMutation();
  const { generateAndUploadPDF, shareFromStoragePath } = usePayslipPDF();

  const runCalculation = useCallback(
    async (
      officerId: string,
      payPeriodStart: string,
      payPeriodEnd: string,
      forceOverwriteDraft = false,
    ) => {
      return calculatePayslip({
        officerId,
        payPeriodStart,
        payPeriodEnd,
        forceOverwriteDraft,
      }).unwrap();
    },
    [calculatePayslip],
  );

  const addItem = useCallback(
    async (itemType: LineItemType, label: string, amount: number, notes?: string) => {
      if (!payslipId) throw new Error('No payslip selected');
      return addLineItem({ payslipId, itemType, label, amount, notes }).unwrap();
    },
    [addLineItem, payslipId],
  );

  const removeItem = useCallback(
    async (lineItemId: string) => {
      if (!payslipId) throw new Error('No payslip selected');
      return removeLineItem({ lineItemId, payslipId }).unwrap();
    },
    [removeLineItem, payslipId],
  );

  const approve = useCallback(
    async (signatureName: string, negativePayOverrideNote?: string) => {
      if (!payslipId) throw new Error('No payslip selected');
      return approvePayslip({ payslipId, signatureName, negativePayOverrideNote }).unwrap();
    },
    [approvePayslip, payslipId],
  );

  const generatePDF = useCallback(async () => {
    if (!payslipId) throw new Error('Payslip not loaded');
    const refreshed = await refetch();
    const snapshot = refreshed.data;
    if (!snapshot) throw new Error('Payslip not loaded');
    if (snapshot.status !== 'approved' && snapshot.status !== 'paid') {
      throw new Error('Payslip must be approved before generating PDF');
    }
    if (!snapshot.dailyBreakdown?.length) {
      throw new Error('Payslip snapshot is missing daily breakdown — regenerate the payslip first');
    }
    return generateAndUploadPDF(snapshot);
  }, [generateAndUploadPDF, payslipId, refetch]);

  const sharePDF = useCallback(async () => {
    if (!payslip?.generatedPdfUrl) throw new Error('PDF not generated yet');
    await shareFromStoragePath(payslip.generatedPdfUrl);
  }, [payslip, shareFromStoragePath]);

  return {
    payslip,
    isLoading,
    isError,
    error,
    refetch,
    runCalculation,
    isCalculating,
    addItem,
    removeItem,
    isAddingItem,
    isRemovingItem,
    approve,
    isApproving,
    generatePDF,
    sharePDF,
  };
}
