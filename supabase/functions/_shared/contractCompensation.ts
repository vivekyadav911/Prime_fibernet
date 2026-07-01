import type { CompensationInput } from './payslipCalculation.ts';

export type ContractCompensationTerm = {
  id: string;
  officerId: string;
  contractId: string;
  contractVersionId: string | null;
  monthlySalary: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  source: string;
  reason: string | null;
};

type ContractRow = {
  id: string;
  officer_id: string;
  status: string;
  date_of_joining: string;
  ctc_annual: number;
  basic_salary_monthly: number | null;
};

type ContractTermRow = {
  id: string;
  officer_id: string;
  contract_id: string;
  contract_version_id: string | null;
  monthly_salary: number;
  effective_from: string;
  effective_to: string | null;
  source: string;
  reason: string | null;
};

const PAYROLL_ELIGIBLE = new Set(['generated', 'sent', 'signed', 'active']);

function monthlySalaryFromContractValues(input: {
  basicSalaryMonthly: number | null | undefined;
  ctcAnnual: number | null | undefined;
}): number {
  if (input.basicSalaryMonthly != null && Number(input.basicSalaryMonthly) > 0) {
    return Math.round(Number(input.basicSalaryMonthly) * 100) / 100;
  }
  const ctc = Number(input.ctcAnnual ?? 0);
  if (ctc <= 0) return 0;
  return Math.round((ctc / 12) * 100) / 100;
}

function mapContractTermRows(rows: ContractTermRow[]): ContractCompensationTerm[] {
  return rows.map((row) => ({
    id: row.id,
    officerId: row.officer_id,
    contractId: row.contract_id,
    contractVersionId: row.contract_version_id,
    monthlySalary: Number(row.monthly_salary),
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    source: row.source,
    reason: row.reason,
  }));
}

function buildTermFromLiveContract(officerId: string, contract: ContractRow): ContractCompensationTerm | null {
  const salary = monthlySalaryFromContractValues({
    basicSalaryMonthly: contract.basic_salary_monthly,
    ctcAnnual: Number(contract.ctc_annual),
  });
  if (salary <= 0) return null;

  return {
    id: contract.id,
    officerId,
    contractId: contract.id,
    contractVersionId: null,
    monthlySalary: salary,
    effectiveFrom: contract.date_of_joining,
    effectiveTo: null,
    source: 'initial_contract',
    reason: 'Employment contract (current record)',
  };
}

function buildContractCompensationTerms(input: {
  officerId: string;
  contract: ContractRow | null;
  explicitTerms: ContractTermRow[];
}): ContractCompensationTerm[] {
  if (input.explicitTerms.length > 0) {
    return mapContractTermRows(input.explicitTerms);
  }
  if (!input.contract || !PAYROLL_ELIGIBLE.has(input.contract.status)) {
    return [];
  }
  const liveTerm = buildTermFromLiveContract(input.officerId, input.contract);
  return liveTerm ? [liveTerm] : [];
}

export function resolveContractCompensationForPayroll(input: {
  officerId: string;
  contract: ContractRow | null;
  explicitTerms: ContractTermRow[];
}): { compensations: CompensationInput[]; warnings: string[] } {
  const warnings: string[] = [];

  const contractTerms = buildContractCompensationTerms({
    officerId: input.officerId,
    contract: input.contract,
    explicitTerms: input.explicitTerms,
  });

  if (!input.contract) {
    throw new Error('No employment contract on file — add compensation via Officer Contract');
  }
  if (!PAYROLL_ELIGIBLE.has(input.contract.status)) {
    throw new Error(
      `Employment contract status is "${input.contract.status}" — generate/sign the contract before payroll`,
    );
  }
  if (contractTerms.length === 0) {
    throw new Error('Employment contract has no salary (basic monthly or CTC) configured');
  }

  return {
    compensations: contractTerms.map((term) => ({
      id: term.id,
      monthlySalary: term.monthlySalary,
      effectiveFrom: term.effectiveFrom,
      effectiveTo: term.effectiveTo,
    })),
    warnings,
  };
}
