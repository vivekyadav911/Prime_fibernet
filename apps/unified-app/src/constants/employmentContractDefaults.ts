/**
 * Default clause templates for new employment contracts.
 * LEGAL NOTE: Review with legal counsel before production use.
 */

export const DEFAULT_LEAVE_POLICY =
  '12 days Casual Leave, 12 days Sick Leave, and 15 days Earned Leave per annum, as per company policy. Public holidays shall be as notified by the Company from time to time.';

export const DEFAULT_BONUS_TERMS = 'Performance bonus as per company policy, subject to eligibility criteria.';

export const DEFAULT_SALARY_PAYMENT_DATE = '1st of every month';

export const DEFAULT_SALARY_REVISION_CLAUSE =
  'Subject to annual performance review and company policy.';

export const DEFAULT_WORKING_HOURS = '9:00 AM to 6:00 PM';

export const DEFAULT_WEEKLY_OFF = 'Sunday';

export const DEFAULT_TERMINATION_CLAUSE =
  'The Company may terminate this employment for cause, including but not limited to misconduct, breach of contract, or persistent underperformance, in accordance with applicable labour laws. Upon termination without cause, the Employee shall be entitled to notice or payment in lieu thereof as specified herein.';

export const DEFAULT_RESIGNATION_CLAUSE =
  'The Employee may resign from employment by providing written notice as specified in this contract. During the notice period, the Employee shall continue to perform duties and facilitate a smooth handover. The Company may accept an earlier relieving date at its discretion.';

export const DEFAULT_CONFIDENTIALITY_CLAUSE =
  'The Employee shall not, during or after employment, disclose any confidential information belonging to the Company, including business plans, customer data, pricing, technical information, or trade secrets, except as required by law or with prior written consent of the Company.';

export const DEFAULT_NON_COMPETE_CLAUSE =
  'During employment and for the period specified herein after cessation of employment, the Employee shall not engage in any activity that directly competes with the core business of the Company within the agreed scope and duration, subject to applicable law including Section 27 of the Indian Contract Act, 1872.';

export const DEFAULT_IP_ASSIGNMENT_CLAUSE =
  'All work product, inventions, designs, software, documentation, and intellectual property created by the Employee during the course of employment and relating to the business of the Company shall be the exclusive property of the Company.';

export const DEFAULT_GOVERNING_LAW = 'Courts of [City], India';

export const WEEKLY_OFF_OPTIONS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const EMPLOYMENT_TYPE_OPTIONS: { value: import('@/types/contract').EmploymentType; label: string }[] = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'probation', label: 'Probation' },
  { value: 'intern', label: 'Intern' },
];

export const PF_EMPLOYER_CAP_MONTHLY = 1800;

export function buildDefaultFormValues(
  officerId: string,
  profile: {
    fullName: string;
    email: string;
    phone: string;
    currentAddress?: string | null;
    permanentAddress?: string | null;
    joiningDate?: string | null;
    role?: string | null;
  },
  company?: {
    companyName?: string;
    companyAddress?: string;
    companyCin?: string;
    companyPan?: string;
    signatoryName?: string;
    signatoryDesignation?: string;
    governingLaw?: string;
  },
): import('@/types/contract').ContractFormValues {
  const address = profile.currentAddress ?? profile.permanentAddress ?? '';
  return {
    officerId,
    useSavedCompanyDetails: true,
    companyName: company?.companyName ?? '',
    companyAddress: company?.companyAddress ?? '',
    companyCin: company?.companyCin ?? '',
    companyPan: company?.companyPan ?? '',
    authorizedSignatoryName: company?.signatoryName ?? '',
    authorizedSignatoryDesignation: company?.signatoryDesignation ?? '',
    employeeFullName: profile.fullName,
    employeeAddress: address,
    employeePhone: profile.phone ?? '',
    employeeEmail: profile.email ?? '',
    employeePan: '',
    employeeAadhaarLast4: '',
    employeeDesignation: profile.role ?? '',
    employeeDepartment: '',
    employmentType: 'full_time',
    dateOfJoining: profile.joiningDate ?? new Date().toISOString().slice(0, 10),
    probationPeriodMonths: '0',
    contractEndDate: '',
    reportingManager: '',
    workLocation: '',
    ctcAnnual: '',
    basicSalaryMonthly: '',
    hraMonthly: '',
    specialAllowanceMonthly: '',
    pfEmployerContribution: '',
    gratuityApplicable: true,
    bonusTerms: DEFAULT_BONUS_TERMS,
    salaryPaymentDate: DEFAULT_SALARY_PAYMENT_DATE,
    salaryRevisionClause: DEFAULT_SALARY_REVISION_CLAUSE,
    workingDaysPerWeek: '6',
    workingHoursPerDay: DEFAULT_WORKING_HOURS,
    weeklyOff: DEFAULT_WEEKLY_OFF,
    leavePolicy: DEFAULT_LEAVE_POLICY,
    noticePeriodDays: '30',
    noticePeriodProbationDays: '15',
    terminationClause: DEFAULT_TERMINATION_CLAUSE,
    resignationClause: DEFAULT_RESIGNATION_CLAUSE,
    confidentialityClause: DEFAULT_CONFIDENTIALITY_CLAUSE,
    nonCompeteEnabled: false,
    nonCompeteClause: DEFAULT_NON_COMPETE_CLAUSE,
    nonCompeteMonths: '0',
    ipAssignmentClause: DEFAULT_IP_ASSIGNMENT_CLAUSE,
    pfApplicable: true,
    esiApplicable: false,
    professionalTaxApplicable: true,
    tdsApplicable: true,
    customClauses: [],
    governingLawJurisdiction: company?.governingLaw ?? DEFAULT_GOVERNING_LAW,
  };
}
