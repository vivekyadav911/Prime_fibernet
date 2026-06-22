/**
 * Employment contract types for officer employment agreements.
 *
 * LEGAL NOTE: Template clause language is a starting point only. Have actual
 * contracts reviewed by legal counsel before use with real employees, especially
 * around non-compete enforceability (Section 27, Indian Contract Act) and
 * statutory compliance (PF/ESI thresholds change periodically).
 */

export type EmploymentType =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'probation'
  | 'intern';

export type ContractStatus =
  | 'draft'
  | 'generated'
  | 'sent'
  | 'signed'
  | 'active'
  | 'terminated'
  | 'archived';

export type SignatureStatus =
  | 'unsigned'
  | 'employee_signed'
  | 'employer_signed'
  | 'fully_signed';

export type ContractSignerRole = 'employee' | 'employer';

export type CustomClause = {
  title: string;
  body: string;
};

export type EmploymentContractRow = {
  id: string;
  officer_id: string;
  company_name: string;
  company_address: string;
  company_cin: string | null;
  company_pan: string | null;
  authorized_signatory_name: string;
  authorized_signatory_designation: string;
  employee_full_name: string;
  employee_address: string;
  employee_phone: string | null;
  employee_email: string | null;
  employee_pan: string | null;
  employee_aadhaar_last4: string | null;
  employee_designation: string;
  employee_department: string | null;
  employment_type: EmploymentType;
  date_of_joining: string;
  probation_period_months: number | null;
  contract_end_date: string | null;
  reporting_manager: string | null;
  work_location: string;
  ctc_annual: number;
  basic_salary_monthly: number | null;
  hra_monthly: number | null;
  special_allowance_monthly: number | null;
  pf_employer_contribution: number | null;
  gratuity_applicable: boolean | null;
  bonus_terms: string | null;
  salary_payment_date: string | null;
  salary_revision_clause: string | null;
  working_days_per_week: number | null;
  working_hours_per_day: string | null;
  weekly_off: string | null;
  leave_policy: string | null;
  notice_period_days: number | null;
  notice_period_probation_days: number | null;
  termination_clause: string | null;
  resignation_clause: string | null;
  confidentiality_clause: string | null;
  non_compete_clause: string | null;
  non_compete_months: number | null;
  ip_assignment_clause: string | null;
  pf_applicable: boolean | null;
  esi_applicable: boolean | null;
  professional_tax_applicable: boolean | null;
  tds_applicable: boolean | null;
  custom_clauses: CustomClause[] | null;
  governing_law_jurisdiction: string | null;
  status: ContractStatus;
  generated_pdf_url: string | null;
  version: number;
  employee_signature_path: string | null;
  employee_signed_at: string | null;
  employee_signed_by: string | null;
  employer_signature_path: string | null;
  employer_signed_at: string | null;
  employer_signed_by: string | null;
  signature_request_sent_at: string | null;
  signature_status: SignatureStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EmploymentContract = {
  id: string;
  officerId: string;
  companyName: string;
  companyAddress: string;
  companyCin: string | null;
  companyPan: string | null;
  authorizedSignatoryName: string;
  authorizedSignatoryDesignation: string;
  employeeFullName: string;
  employeeAddress: string;
  employeePhone: string | null;
  employeeEmail: string | null;
  employeePan: string | null;
  employeeAadhaarLast4: string | null;
  employeeDesignation: string;
  employeeDepartment: string | null;
  employmentType: EmploymentType;
  dateOfJoining: string;
  probationPeriodMonths: number;
  contractEndDate: string | null;
  reportingManager: string | null;
  workLocation: string;
  ctcAnnual: number;
  basicSalaryMonthly: number | null;
  hraMonthly: number | null;
  specialAllowanceMonthly: number | null;
  pfEmployerContribution: number | null;
  gratuityApplicable: boolean;
  bonusTerms: string | null;
  salaryPaymentDate: string;
  salaryRevisionClause: string;
  workingDaysPerWeek: number;
  workingHoursPerDay: string;
  weeklyOff: string;
  leavePolicy: string | null;
  noticePeriodDays: number;
  noticePeriodProbationDays: number;
  terminationClause: string | null;
  resignationClause: string | null;
  confidentialityClause: string | null;
  nonCompeteClause: string | null;
  nonCompeteMonths: number;
  ipAssignmentClause: string | null;
  pfApplicable: boolean;
  esiApplicable: boolean;
  professionalTaxApplicable: boolean;
  tdsApplicable: boolean;
  customClauses: CustomClause[];
  governingLawJurisdiction: string;
  status: ContractStatus;
  generatedPdfUrl: string | null;
  version: number;
  employeeSignaturePath: string | null;
  employeeSignedAt: string | null;
  employeeSignedBy: string | null;
  employerSignaturePath: string | null;
  employerSignedAt: string | null;
  employerSignedBy: string | null;
  signatureRequestSentAt: string | null;
  signatureStatus: SignatureStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContractVersion = {
  id: string;
  contractId: string;
  versionNumber: number;
  snapshot: EmploymentContract;
  pdfUrl: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type CompanyDefaults = {
  id: string;
  companyName: string;
  companyAddress: string;
  companyCin: string | null;
  companyPan: string | null;
  defaultSignatoryName: string | null;
  defaultSignatoryDesignation: string | null;
  logoUrl: string | null;
  defaultGoverningLaw: string | null;
  updatedAt: string;
};

export type ContractFormValues = {
  officerId: string;
  contractId?: string;
  useSavedCompanyDetails: boolean;
  companyName: string;
  companyAddress: string;
  companyCin: string;
  companyPan: string;
  authorizedSignatoryName: string;
  authorizedSignatoryDesignation: string;
  employeeFullName: string;
  employeeAddress: string;
  employeePhone: string;
  employeeEmail: string;
  employeePan: string;
  employeeAadhaarLast4: string;
  employeeDesignation: string;
  employeeDepartment: string;
  employmentType: EmploymentType;
  dateOfJoining: string;
  probationPeriodMonths: string;
  contractEndDate: string;
  reportingManager: string;
  workLocation: string;
  ctcAnnual: string;
  basicSalaryMonthly: string;
  hraMonthly: string;
  specialAllowanceMonthly: string;
  pfEmployerContribution: string;
  gratuityApplicable: boolean;
  bonusTerms: string;
  salaryPaymentDate: string;
  salaryRevisionClause: string;
  workingDaysPerWeek: string;
  workingHoursPerDay: string;
  weeklyOff: string;
  leavePolicy: string;
  noticePeriodDays: string;
  noticePeriodProbationDays: string;
  terminationClause: string;
  resignationClause: string;
  confidentialityClause: string;
  nonCompeteEnabled: boolean;
  nonCompeteClause: string;
  nonCompeteMonths: string;
  ipAssignmentClause: string;
  pfApplicable: boolean;
  esiApplicable: boolean;
  professionalTaxApplicable: boolean;
  tdsApplicable: boolean;
  customClauses: CustomClause[];
  governingLawJurisdiction: string;
};

function parseCustomClauses(raw: unknown): CustomClause[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is CustomClause => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof (item as CustomClause).title === 'string' &&
        typeof (item as CustomClause).body === 'string'
      );
    })
    .map((item) => ({ title: item.title, body: item.body }));
}

export function mapEmploymentContractRow(row: EmploymentContractRow): EmploymentContract {
  return {
    id: row.id,
    officerId: row.officer_id,
    companyName: row.company_name,
    companyAddress: row.company_address,
    companyCin: row.company_cin,
    companyPan: row.company_pan,
    authorizedSignatoryName: row.authorized_signatory_name,
    authorizedSignatoryDesignation: row.authorized_signatory_designation,
    employeeFullName: row.employee_full_name,
    employeeAddress: row.employee_address,
    employeePhone: row.employee_phone,
    employeeEmail: row.employee_email,
    employeePan: row.employee_pan,
    employeeAadhaarLast4: row.employee_aadhaar_last4,
    employeeDesignation: row.employee_designation,
    employeeDepartment: row.employee_department,
    employmentType: row.employment_type,
    dateOfJoining: row.date_of_joining,
    probationPeriodMonths: row.probation_period_months ?? 0,
    contractEndDate: row.contract_end_date,
    reportingManager: row.reporting_manager,
    workLocation: row.work_location,
    ctcAnnual: Number(row.ctc_annual),
    basicSalaryMonthly: row.basic_salary_monthly != null ? Number(row.basic_salary_monthly) : null,
    hraMonthly: row.hra_monthly != null ? Number(row.hra_monthly) : null,
    specialAllowanceMonthly:
      row.special_allowance_monthly != null ? Number(row.special_allowance_monthly) : null,
    pfEmployerContribution:
      row.pf_employer_contribution != null ? Number(row.pf_employer_contribution) : null,
    gratuityApplicable: row.gratuity_applicable ?? true,
    bonusTerms: row.bonus_terms,
    salaryPaymentDate: row.salary_payment_date ?? '1st of every month',
    salaryRevisionClause: row.salary_revision_clause ?? 'Subject to annual performance review',
    workingDaysPerWeek: row.working_days_per_week ?? 6,
    workingHoursPerDay: row.working_hours_per_day ?? '9:00 AM to 6:00 PM',
    weeklyOff: row.weekly_off ?? 'Sunday',
    leavePolicy: row.leave_policy,
    noticePeriodDays: row.notice_period_days ?? 30,
    noticePeriodProbationDays: row.notice_period_probation_days ?? 15,
    terminationClause: row.termination_clause,
    resignationClause: row.resignation_clause,
    confidentialityClause: row.confidentiality_clause,
    nonCompeteClause: row.non_compete_clause,
    nonCompeteMonths: row.non_compete_months ?? 0,
    ipAssignmentClause: row.ip_assignment_clause,
    pfApplicable: row.pf_applicable ?? true,
    esiApplicable: row.esi_applicable ?? false,
    professionalTaxApplicable: row.professional_tax_applicable ?? true,
    tdsApplicable: row.tds_applicable ?? true,
    customClauses: parseCustomClauses(row.custom_clauses),
    governingLawJurisdiction: row.governing_law_jurisdiction ?? 'Courts of [City], India',
    status: row.status,
    generatedPdfUrl: row.generated_pdf_url,
    version: row.version,
    employeeSignaturePath: row.employee_signature_path ?? null,
    employeeSignedAt: row.employee_signed_at ?? null,
    employeeSignedBy: row.employee_signed_by ?? null,
    employerSignaturePath: row.employer_signature_path ?? null,
    employerSignedAt: row.employer_signed_at ?? null,
    employerSignedBy: row.employer_signed_by ?? null,
    signatureRequestSentAt: row.signature_request_sent_at ?? null,
    signatureStatus: row.signature_status ?? 'unsigned',
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCompanyDefaultsRow(row: {
  id: string;
  company_name: string;
  company_address: string;
  company_cin?: string | null;
  company_pan?: string | null;
  default_signatory_name?: string | null;
  default_signatory_designation?: string | null;
  logo_url?: string | null;
  default_governing_law?: string | null;
  updated_at: string;
}): CompanyDefaults {
  return {
    id: row.id,
    companyName: row.company_name,
    companyAddress: row.company_address,
    companyCin: row.company_cin ?? null,
    companyPan: row.company_pan ?? null,
    defaultSignatoryName: row.default_signatory_name ?? null,
    defaultSignatoryDesignation: row.default_signatory_designation ?? null,
    logoUrl: row.logo_url ?? null,
    defaultGoverningLaw: row.default_governing_law ?? null,
    updatedAt: row.updated_at,
  };
}

function numStr(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return String(value);
}

export function contractToFormValues(contract: EmploymentContract): ContractFormValues {
  return {
    officerId: contract.officerId,
    contractId: contract.id,
    useSavedCompanyDetails: false,
    companyName: contract.companyName,
    companyAddress: contract.companyAddress,
    companyCin: contract.companyCin ?? '',
    companyPan: contract.companyPan ?? '',
    authorizedSignatoryName: contract.authorizedSignatoryName,
    authorizedSignatoryDesignation: contract.authorizedSignatoryDesignation,
    employeeFullName: contract.employeeFullName,
    employeeAddress: contract.employeeAddress,
    employeePhone: contract.employeePhone ?? '',
    employeeEmail: contract.employeeEmail ?? '',
    employeePan: contract.employeePan ?? '',
    employeeAadhaarLast4: contract.employeeAadhaarLast4 ?? '',
    employeeDesignation: contract.employeeDesignation,
    employeeDepartment: contract.employeeDepartment ?? '',
    employmentType: contract.employmentType,
    dateOfJoining: contract.dateOfJoining,
    probationPeriodMonths: String(contract.probationPeriodMonths),
    contractEndDate: contract.contractEndDate ?? '',
    reportingManager: contract.reportingManager ?? '',
    workLocation: contract.workLocation,
    ctcAnnual: numStr(contract.ctcAnnual),
    basicSalaryMonthly: numStr(contract.basicSalaryMonthly),
    hraMonthly: numStr(contract.hraMonthly),
    specialAllowanceMonthly: numStr(contract.specialAllowanceMonthly),
    pfEmployerContribution: numStr(contract.pfEmployerContribution),
    gratuityApplicable: contract.gratuityApplicable,
    bonusTerms: contract.bonusTerms ?? '',
    salaryPaymentDate: contract.salaryPaymentDate,
    salaryRevisionClause: contract.salaryRevisionClause,
    workingDaysPerWeek: String(contract.workingDaysPerWeek),
    workingHoursPerDay: contract.workingHoursPerDay,
    weeklyOff: contract.weeklyOff,
    leavePolicy: contract.leavePolicy ?? '',
    noticePeriodDays: String(contract.noticePeriodDays),
    noticePeriodProbationDays: String(contract.noticePeriodProbationDays),
    terminationClause: contract.terminationClause ?? '',
    resignationClause: contract.resignationClause ?? '',
    confidentialityClause: contract.confidentialityClause ?? '',
    nonCompeteEnabled: (contract.nonCompeteMonths ?? 0) > 0,
    nonCompeteClause: contract.nonCompeteClause ?? '',
    nonCompeteMonths: String(contract.nonCompeteMonths),
    ipAssignmentClause: contract.ipAssignmentClause ?? '',
    pfApplicable: contract.pfApplicable,
    esiApplicable: contract.esiApplicable,
    professionalTaxApplicable: contract.professionalTaxApplicable,
    tdsApplicable: contract.tdsApplicable,
    customClauses: contract.customClauses,
    governingLawJurisdiction: contract.governingLawJurisdiction,
  };
}

function parseNum(value: string, fallback = 0): number {
  const n = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

export function formValuesToContractRow(
  values: ContractFormValues,
  status: ContractStatus,
  userId: string | null,
): Omit<
  EmploymentContractRow,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'generated_pdf_url'
  | 'version'
  | 'employee_signature_path'
  | 'employee_signed_at'
  | 'employee_signed_by'
  | 'employer_signature_path'
  | 'employer_signed_at'
  | 'employer_signed_by'
  | 'signature_request_sent_at'
  | 'signature_status'
> & {
  id?: string;
  version?: number;
  generated_pdf_url?: string | null;
} {
  const nonCompeteMonths = values.nonCompeteEnabled ? parseNum(values.nonCompeteMonths, 0) : 0;
  return {
    id: values.contractId,
    officer_id: values.officerId,
    company_name: values.companyName.trim(),
    company_address: values.companyAddress.trim(),
    company_cin: values.companyCin.trim() || null,
    company_pan: values.companyPan.trim() || null,
    authorized_signatory_name: values.authorizedSignatoryName.trim(),
    authorized_signatory_designation: values.authorizedSignatoryDesignation.trim(),
    employee_full_name: values.employeeFullName.trim(),
    employee_address: values.employeeAddress.trim(),
    employee_phone: values.employeePhone.trim() || null,
    employee_email: values.employeeEmail.trim() || null,
    employee_pan: values.employeePan.trim() || null,
    employee_aadhaar_last4: values.employeeAadhaarLast4.trim() || null,
    employee_designation: values.employeeDesignation.trim(),
    employee_department: values.employeeDepartment.trim() || null,
    employment_type: values.employmentType,
    date_of_joining: values.dateOfJoining,
    probation_period_months: parseNum(values.probationPeriodMonths, 0),
    contract_end_date: values.contractEndDate.trim() || null,
    reporting_manager: values.reportingManager.trim() || null,
    work_location: values.workLocation.trim(),
    ctc_annual: parseNum(values.ctcAnnual),
    basic_salary_monthly: parseNum(values.basicSalaryMonthly) || null,
    hra_monthly: parseNum(values.hraMonthly) || null,
    special_allowance_monthly: parseNum(values.specialAllowanceMonthly) || null,
    pf_employer_contribution: parseNum(values.pfEmployerContribution) || null,
    gratuity_applicable: values.gratuityApplicable,
    bonus_terms: values.bonusTerms.trim() || null,
    salary_payment_date: values.salaryPaymentDate.trim() || '1st of every month',
    salary_revision_clause: values.salaryRevisionClause.trim() || 'Subject to annual performance review',
    working_days_per_week: parseNum(values.workingDaysPerWeek, 6),
    working_hours_per_day: values.workingHoursPerDay.trim() || '9:00 AM to 6:00 PM',
    weekly_off: values.weeklyOff.trim() || 'Sunday',
    leave_policy: values.leavePolicy.trim() || null,
    notice_period_days: parseNum(values.noticePeriodDays, 30),
    notice_period_probation_days: parseNum(values.noticePeriodProbationDays, 15),
    termination_clause: values.terminationClause.trim() || null,
    resignation_clause: values.resignationClause.trim() || null,
    confidentiality_clause: values.confidentialityClause.trim() || null,
    non_compete_clause: values.nonCompeteEnabled ? values.nonCompeteClause.trim() || null : null,
    non_compete_months: nonCompeteMonths,
    ip_assignment_clause: values.ipAssignmentClause.trim() || null,
    pf_applicable: values.pfApplicable,
    esi_applicable: values.esiApplicable,
    professional_tax_applicable: values.professionalTaxApplicable,
    tds_applicable: values.tdsApplicable,
    custom_clauses: values.customClauses,
    governing_law_jurisdiction: values.governingLawJurisdiction.trim() || 'Courts of [City], India',
    status,
    created_by: userId,
  };
}

export function employmentContractToRow(contract: EmploymentContract): EmploymentContractRow {
  return {
    id: contract.id,
    officer_id: contract.officerId,
    company_name: contract.companyName,
    company_address: contract.companyAddress,
    company_cin: contract.companyCin,
    company_pan: contract.companyPan,
    authorized_signatory_name: contract.authorizedSignatoryName,
    authorized_signatory_designation: contract.authorizedSignatoryDesignation,
    employee_full_name: contract.employeeFullName,
    employee_address: contract.employeeAddress,
    employee_phone: contract.employeePhone,
    employee_email: contract.employeeEmail,
    employee_pan: contract.employeePan,
    employee_aadhaar_last4: contract.employeeAadhaarLast4,
    employee_designation: contract.employeeDesignation,
    employee_department: contract.employeeDepartment,
    employment_type: contract.employmentType,
    date_of_joining: contract.dateOfJoining,
    probation_period_months: contract.probationPeriodMonths,
    contract_end_date: contract.contractEndDate,
    reporting_manager: contract.reportingManager,
    work_location: contract.workLocation,
    ctc_annual: contract.ctcAnnual,
    basic_salary_monthly: contract.basicSalaryMonthly,
    hra_monthly: contract.hraMonthly,
    special_allowance_monthly: contract.specialAllowanceMonthly,
    pf_employer_contribution: contract.pfEmployerContribution,
    gratuity_applicable: contract.gratuityApplicable,
    bonus_terms: contract.bonusTerms,
    salary_payment_date: contract.salaryPaymentDate,
    salary_revision_clause: contract.salaryRevisionClause,
    working_days_per_week: contract.workingDaysPerWeek,
    working_hours_per_day: contract.workingHoursPerDay,
    weekly_off: contract.weeklyOff,
    leave_policy: contract.leavePolicy,
    notice_period_days: contract.noticePeriodDays,
    notice_period_probation_days: contract.noticePeriodProbationDays,
    termination_clause: contract.terminationClause,
    resignation_clause: contract.resignationClause,
    confidentiality_clause: contract.confidentialityClause,
    non_compete_clause: contract.nonCompeteClause,
    non_compete_months: contract.nonCompeteMonths,
    ip_assignment_clause: contract.ipAssignmentClause,
    pf_applicable: contract.pfApplicable,
    esi_applicable: contract.esiApplicable,
    professional_tax_applicable: contract.professionalTaxApplicable,
    tds_applicable: contract.tdsApplicable,
    custom_clauses: contract.customClauses,
    governing_law_jurisdiction: contract.governingLawJurisdiction,
    status: contract.status,
    generated_pdf_url: contract.generatedPdfUrl,
    version: contract.version,
    employee_signature_path: contract.employeeSignaturePath,
    employee_signed_at: contract.employeeSignedAt,
    employee_signed_by: contract.employeeSignedBy,
    employer_signature_path: contract.employerSignaturePath,
    employer_signed_at: contract.employerSignedAt,
    employer_signed_by: contract.employerSignedBy,
    signature_request_sent_at: contract.signatureRequestSentAt,
    signature_status: contract.signatureStatus,
    created_by: contract.createdBy,
    created_at: contract.createdAt,
    updated_at: contract.updatedAt,
  };
}

export function buildContractStoragePath(
  officerId: string,
  contractId: string,
  version: number,
): string {
  return `${officerId}/${contractId}/v${version}.pdf`;
}

export function buildContractSignaturePath(
  officerId: string,
  contractId: string,
  role: ContractSignerRole,
): string {
  return `${officerId}/${contractId}/signatures/${role}.png`;
}

export function computeSignatureStatus(
  hasEmployee: boolean,
  hasEmployer: boolean,
): SignatureStatus {
  if (hasEmployee && hasEmployer) return 'fully_signed';
  if (hasEmployee) return 'employee_signed';
  if (hasEmployer) return 'employer_signed';
  return 'unsigned';
}
