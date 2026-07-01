import type { CompensationInput } from '@/services/payslip/calculatePayslipCore';

export type ContractCompensationTerm = {
  id: string;
  officerId: string;
  contractId: string;
  contractVersionId: string | null;
  monthlySalary: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  source: 'initial_contract' | 'amendment' | 'revision' | 'contract_compensation_terms';
  reason: string | null;
};

export type LegacyCompensationRecord = {
  id: string;
  monthlySalary: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  source: string | null;
  contractTermId: string | null;
};

export type ContractCompensationResolution = {
  compensations: CompensationInput[];
  contractTerms: ContractCompensationTerm[];
  legacyOrphanRecords: LegacyCompensationRecord[];
  /** Blocking issues only — missing contract, ineligible status, etc. */
  warnings: string[];
  /** Non-blocking notices for settings / admin awareness */
  informationalNotices: string[];
  hasContractSource: boolean;
};

const PAYROLL_ELIGIBLE_CONTRACT_STATUSES = new Set([
  'generated',
  'sent',
  'signed',
  'active',
]);

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

export function monthlySalaryFromContractValues(input: {
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

export function mapContractTermRows(rows: ContractTermRow[]): ContractCompensationTerm[] {
  return rows.map((row) => ({
    id: row.id,
    officerId: row.officer_id,
    contractId: row.contract_id,
    contractVersionId: row.contract_version_id,
    monthlySalary: Number(row.monthly_salary),
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    source: row.source as ContractCompensationTerm['source'],
    reason: row.reason,
  }));
}

export function buildTermFromLiveContract(
  officerId: string,
  contract: ContractRow,
): ContractCompensationTerm | null {
  const salary = monthlySalaryFromContractValues({
    basicSalaryMonthly:
      contract.basic_salary_monthly != null ? Number(contract.basic_salary_monthly) : null,
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

/** Amendment terms from contract_compensation_terms, else the live contract row. */
export function buildContractCompensationTerms(input: {
  officerId: string;
  contract: ContractRow | null;
  explicitTerms: ContractTermRow[];
}): ContractCompensationTerm[] {
  if (input.explicitTerms.length > 0) {
    return mapContractTermRows(input.explicitTerms);
  }
  if (!input.contract || !PAYROLL_ELIGIBLE_CONTRACT_STATUSES.has(input.contract.status)) {
    return [];
  }
  const liveTerm = buildTermFromLiveContract(input.officerId, input.contract);
  return liveTerm ? [liveTerm] : [];
}

export function toCompensationInputs(terms: ContractCompensationTerm[]): CompensationInput[] {
  return terms.map((term) => ({
    id: term.id,
    monthlySalary: term.monthlySalary,
    effectiveFrom: term.effectiveFrom,
    effectiveTo: term.effectiveTo,
  }));
}

export function resolveContractCompensation(input: {
  officerId: string;
  contract: ContractRow | null;
  explicitTerms: ContractTermRow[];
  legacyRecords?: LegacyCompensationRecord[];
}): ContractCompensationResolution {
  const warnings: string[] = [];
  const informationalNotices: string[] = [];
  const legacyOrphanRecords = (input.legacyRecords ?? []).filter(
    (row) => row.source === 'legacy_manual' || !row.contractTermId,
  );

  if (legacyOrphanRecords.length > 0) {
    informationalNotices.push(
      `${legacyOrphanRecords.length} legacy payroll salary record(s) exist but are ignored — payroll uses the employment contract only`,
    );
  }

  const contractTerms = buildContractCompensationTerms({
    officerId: input.officerId,
    contract: input.contract,
    explicitTerms: input.explicitTerms,
  });

  if (!input.contract) {
    warnings.push('No employment contract on file — add compensation via Officer Contract');
  } else if (!PAYROLL_ELIGIBLE_CONTRACT_STATUSES.has(input.contract.status)) {
    warnings.push(
      `Employment contract status is "${input.contract.status}" — generate/sign the contract before payroll`,
    );
  } else if (contractTerms.length === 0) {
    warnings.push('Employment contract has no salary (basic monthly or CTC) configured');
  }

  const hasContractSource = contractTerms.length > 0;
  const compensations = hasContractSource ? toCompensationInputs(contractTerms) : [];

  return {
    compensations,
    contractTerms,
    legacyOrphanRecords,
    warnings,
    informationalNotices,
    hasContractSource,
  };
}

export function earliestCompensationDate(compensations: CompensationInput[]): string | null {
  if (!compensations.length) return null;
  return compensations.reduce(
    (min, row) => (row.effectiveFrom < min ? row.effectiveFrom : min),
    compensations[0]!.effectiveFrom,
  );
}
