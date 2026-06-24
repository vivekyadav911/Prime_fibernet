import type { Payslip } from '@/types/payslip';

export function payslipPdfTitle(payslip: Pick<Payslip, 'payPeriodLabel' | 'employeeName'>): string {
  return `Payslip — ${payslip.payPeriodLabel}`;
}

export function payslipPdfFileName(payslip: Pick<Payslip, 'payPeriodLabel' | 'employeeName'>): string {
  const safePeriod = payslip.payPeriodLabel.replace(/[^\w]+/g, '_');
  const safeName = (payslip.employeeName || 'Employee').replace(/[^\w]+/g, '_');
  return `Payslip_${safeName}_${safePeriod}.pdf`;
}

export type PayslipPdfNavigationParams = {
  storagePath: string;
  title: string;
  fileName: string;
};

export function payslipPdfViewerParams(
  payslip: Pick<Payslip, 'payPeriodLabel' | 'employeeName' | 'generatedPdfUrl'>,
): PayslipPdfNavigationParams | null {
  if (!payslip.generatedPdfUrl) return null;
  return {
    storagePath: payslip.generatedPdfUrl,
    title: payslipPdfTitle(payslip),
    fileName: payslipPdfFileName(payslip),
  };
}
