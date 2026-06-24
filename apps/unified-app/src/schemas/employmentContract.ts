import { z } from 'zod';

import { dateSchema } from '@/types/common';

const panSchema = z
  .string()
  .optional()
  .refine((v) => !v || /^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(v.trim()), 'Invalid PAN format (e.g. ABCDE1234F)');

const aadhaarLast4Schema = z
  .string()
  .optional()
  .refine((v) => !v || /^\d{4}$/.test(v.trim()), 'Enter exactly 4 digits');

const amountSchema = z
  .string()
  .min(1, 'Required')
  .refine((v) => {
    const n = Number(v.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) && n > 0;
  }, 'Must be a positive number');

const optionalAmountSchema = z
  .string()
  .optional()
  .refine((v) => !v || /^\d+(\.\d{1,2})?$/.test(v.replace(/[^0-9.]/g, '')), 'Invalid amount');

const nonNegativeIntSchema = (label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine((v) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 0;
    }, 'Must be a non-negative integer');

const customClauseSchema = z.object({
  title: z.string().min(1, 'Title required'),
  body: z.string().min(1, 'Body required'),
});

const employmentTypeSchema = z.enum(['full_time', 'part_time', 'contract', 'probation', 'intern']);

export const employmentContractDraftSchema = z.object({
  officerId: z.string().uuid(),
  contractId: z.string().uuid().optional(),
  useSavedCompanyDetails: z.boolean(),
  companyName: z.string().optional(),
  companyAddress: z.string().optional(),
  companyCin: z.string().optional(),
  companyPan: panSchema,
  authorizedSignatoryName: z.string().optional(),
  authorizedSignatoryDesignation: z.string().optional(),
  employeeFullName: z.string().optional(),
  employeeAddress: z.string().optional(),
  employeePhone: z.string().optional(),
  employeeEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  employeePan: panSchema,
  employeeAadhaarLast4: aadhaarLast4Schema,
  employeeDesignation: z.string().optional(),
  employeeDepartment: z.string().optional(),
  employmentType: employmentTypeSchema,
  dateOfJoining: z.union([z.literal(''), dateSchema]).optional(),
  probationPeriodMonths: z.string().optional(),
  contractEndDate: z.union([z.literal(''), dateSchema]).optional(),
  reportingManager: z.string().optional(),
  workLocation: z.string().optional(),
  ctcAnnual: z.string().optional(),
  basicSalaryMonthly: optionalAmountSchema,
  hraMonthly: optionalAmountSchema,
  specialAllowanceMonthly: optionalAmountSchema,
  pfEmployerContribution: optionalAmountSchema,
  gratuityApplicable: z.boolean(),
  bonusTerms: z.string().optional(),
  salaryPaymentDate: z.string().optional(),
  salaryRevisionClause: z.string().optional(),
  workingDaysPerWeek: z.string().optional(),
  workingHoursPerDay: z.string().optional(),
  weeklyOff: z.string().optional(),
  leavePolicy: z.string().optional(),
  noticePeriodDays: z.string().optional(),
  noticePeriodProbationDays: z.string().optional(),
  terminationClause: z.string().optional(),
  resignationClause: z.string().optional(),
  confidentialityClause: z.string().optional(),
  nonCompeteEnabled: z.boolean(),
  nonCompeteClause: z.string().optional(),
  nonCompeteMonths: z.string().optional(),
  ipAssignmentClause: z.string().optional(),
  pfApplicable: z.boolean(),
  esiApplicable: z.boolean(),
  professionalTaxApplicable: z.boolean(),
  tdsApplicable: z.boolean(),
  customClauses: z.array(customClauseSchema),
  governingLawJurisdiction: z.string().optional(),
});

export const employmentContractGenerateSchema = employmentContractDraftSchema.extend({
  companyName: z.string().min(1, 'Company name is required'),
  companyAddress: z.string().min(1, 'Company address is required'),
  authorizedSignatoryName: z.string().min(1, 'Signatory name is required'),
  authorizedSignatoryDesignation: z.string().min(1, 'Signatory designation is required'),
  employeeFullName: z.string().min(2, 'Employee name is required'),
  employeeAddress: z.string().min(1, 'Employee address is required'),
  employeeDesignation: z.string().min(1, 'Designation is required'),
  dateOfJoining: dateSchema,
  workLocation: z.string().min(1, 'Work location is required'),
  ctcAnnual: amountSchema,
  noticePeriodDays: nonNegativeIntSchema('Notice period'),
  noticePeriodProbationDays: nonNegativeIntSchema('Probation notice period'),
  governingLawJurisdiction: z.string().min(1, 'Governing law is required'),
}).superRefine((data, ctx) => {
  if (data.employmentType === 'contract' && !data.contractEndDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Contract end date is required for contract employment',
      path: ['contractEndDate'],
    });
  }
  if (data.contractEndDate && data.dateOfJoining && data.contractEndDate <= data.dateOfJoining) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Contract end date must be after date of joining',
      path: ['contractEndDate'],
    });
  }
  if (data.nonCompeteEnabled && (!data.nonCompeteMonths || Number(data.nonCompeteMonths) <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Non-compete duration is required when enabled',
      path: ['nonCompeteMonths'],
    });
  }
});

export type EmploymentContractDraftInput = z.infer<typeof employmentContractDraftSchema>;
export type EmploymentContractGenerateInput = z.infer<typeof employmentContractGenerateSchema>;

export function isJoiningDateBackdated(dateOfJoining: string): boolean {
  if (!dateOfJoining) return false;
  const join = new Date(dateOfJoining);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return join < today;
}
