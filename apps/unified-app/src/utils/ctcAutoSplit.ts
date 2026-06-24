/** CTC auto-split using common Indian salary structure. PF cap is indicative — verify current statutory limits. */
import { PF_EMPLOYER_CAP_MONTHLY } from '@/constants/employmentContractDefaults';

export type CtcSplitResult = {
  basicSalaryMonthly: number;
  hraMonthly: number;
  specialAllowanceMonthly: number;
  pfEmployerContribution: number;
  monthlyGross: number;
};

export function autoSplitCtc(ctcAnnual: number): CtcSplitResult {
  const monthlyGross = ctcAnnual / 12;
  const basicSalaryMonthly = (ctcAnnual * 0.4) / 12;
  const hraMonthly = basicSalaryMonthly * 0.5;
  const pfEmployerContribution = Math.min(basicSalaryMonthly * 0.12, PF_EMPLOYER_CAP_MONTHLY);
  const specialAllowanceMonthly = Math.max(
    0,
    monthlyGross - basicSalaryMonthly - hraMonthly - pfEmployerContribution,
  );

  return {
    basicSalaryMonthly: round2(basicSalaryMonthly),
    hraMonthly: round2(hraMonthly),
    specialAllowanceMonthly: round2(specialAllowanceMonthly),
    pfEmployerContribution: round2(pfEmployerContribution),
    monthlyGross: round2(monthlyGross),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
