import { z } from 'zod';

import { dateSchema } from '@/types/common';

const phoneSchema = z
  .string()
  .min(10, 'Phone must be at least 10 digits')
  .regex(/^[0-9+\-\s()]+$/, 'Invalid phone number');

const salaryField = z
  .string()
  .optional()
  .refine((v) => !v || /^\d+(\.\d{1,2})?$/.test(v), 'Invalid amount');

const emergencyContactSchema = z.object({
  name: z.string().optional(),
  relationship: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

/** Step 1 — Personal Information */
export const AdminCreateOfficerStep1Schema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  dateOfBirth: dateSchema,
  gender: z.enum(['Male', 'Female', 'Other'], { required_error: 'Gender is required' }),
  bloodGroup: z.string().optional(),
  maritalStatus: z.enum(['Single', 'Married', 'Divorced']).optional(),
  profilePhotoStoragePath: z.string().optional(),
});

/** Step 2 — Contact & Bank */
export const AdminCreateOfficerStep2Schema = z.object({
  email: z.string().email('Invalid email address'),
  phone: phoneSchema,
  alternatePhone: z.string().optional(),
  currentAddress: z.string().optional(),
  permanentAddress: z.string().optional(),
  copyToPermanent: z.boolean().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().min(6, 'Pincode is required').max(10),
  bankName: z.string().optional(),
  accountHolderName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z
    .string()
    .optional()
    .refine((v) => !v || /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(v), 'Invalid IFSC code'),
  emergencyContact1: emergencyContactSchema.optional(),
  emergencyContact2: emergencyContactSchema.optional(),
});

/** Step 3 — Contract + Credentials (base fields) */
export const AdminCreateOfficerStep3BaseSchema = z.object({
  region: z.string().optional(),
  positionApplied: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  reportingTo: z.string().optional(),
  workLocation: z.string().optional(),
  workingHoursPerDay: z.string().optional(),
  weeklyOffDays: z.string().optional(),
  leaveEntitlementPerYear: z.string().optional(),
  contractType: z.enum(['Permanent', 'Temporary', 'Probation']).optional(),
  contractStartDate: z.union([z.literal(''), dateSchema]).optional(),
  basicSalary: salaryField.refine((v) => !!v && /^\d+/.test(v), 'Basic salary is required'),
  hra: salaryField,
  transportAllowance: salaryField,
  otherAllowances: salaryField,
  healthInsurance: z.boolean().optional(),
  pfApplicable: z.boolean().optional(),
  esicApplicable: z.boolean().optional(),
  highestQualification: z.string().optional(),
  university: z.string().optional(),
  graduationYear: z.string().optional(),
  criminalRecord: z.boolean().optional(),
  healthIssues: z.boolean().optional(),
  backgroundDetails: z.string().optional(),
  passwordMode: z.enum(['auto', 'manual']),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  credentialsEmail: z.union([z.literal(''), z.string().email()]).optional(),
  allowAdminViewPassword: z.boolean().optional(),
});

export const AdminCreateOfficerStep3Schema = AdminCreateOfficerStep3BaseSchema.superRefine((data, ctx) => {
  if (data.passwordMode === 'manual') {
    if (!data.password || data.password.length < 8) {
      ctx.addIssue({ code: 'custom', message: 'Password must be at least 8 characters', path: ['password'] });
    }
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({ code: 'custom', message: 'Passwords do not match', path: ['confirmPassword'] });
    }
  }
});

/** Step 4 — Documents */
export const AdminCreateOfficerStep4Schema = z.object({
  photoIdFrontStoragePath: z.string().min(1, 'Photo ID front is required'),
  photoIdBackStoragePath: z.string().min(1, 'Photo ID back is required'),
  profilePhotoStoragePath: z.string().min(1, 'Profile photo is required'),
  resumeStoragePath: z.string().optional(),
});

const AdminCreateOfficerBaseSchema = AdminCreateOfficerStep1Schema.merge(
  AdminCreateOfficerStep2Schema,
)
  .merge(AdminCreateOfficerStep3BaseSchema)
  .merge(AdminCreateOfficerStep4Schema);

export const AdminCreateOfficerSchema = AdminCreateOfficerBaseSchema.superRefine((data, ctx) => {
  if (data.passwordMode === 'manual') {
    if (!data.password || data.password.length < 8) {
      ctx.addIssue({ code: 'custom', message: 'Password must be at least 8 characters', path: ['password'] });
    }
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({ code: 'custom', message: 'Passwords do not match', path: ['confirmPassword'] });
    }
  }
});

export type AdminCreateOfficerFormData = z.infer<typeof AdminCreateOfficerBaseSchema>;

export const OFFICER_WIZARD_STEPS = [
  { key: 1, title: 'Personal Info', subtitle: 'Name, DOB, gender, photo' },
  { key: 2, title: 'Contact & Bank', subtitle: 'Address, bank, emergency contacts' },
  { key: 3, title: 'Contract & Role', subtitle: 'Contract, salary, credentials' },
  { key: 4, title: 'Documents', subtitle: 'ID, photo, resume' },
] as const;

export const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

export const MARITAL_STATUS_OPTIONS = [
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
  { value: 'Divorced', label: 'Divorced' },
];

export const BLOOD_GROUP_OPTIONS = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

export const CONTRACT_TYPE_OPTIONS = [
  { value: 'Permanent', label: 'Permanent' },
  { value: 'Temporary', label: 'Temporary' },
  { value: 'Probation', label: 'Probation' },
];

export function parseSalary(value: string | undefined): number {
  if (!value?.trim()) return 0;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function computeSalaryTotal(data: {
  basicSalary?: string;
  hra?: string;
  transportAllowance?: string;
  otherAllowances?: string;
}): number {
  return (
    parseSalary(data.basicSalary) +
    parseSalary(data.hra) +
    parseSalary(data.transportAllowance) +
    parseSalary(data.otherAllowances)
  );
}

export const STEP_SCHEMAS = [
  AdminCreateOfficerStep1Schema,
  AdminCreateOfficerStep2Schema,
  AdminCreateOfficerStep3Schema,
  AdminCreateOfficerStep4Schema,
] as const;
