export type OfficerFieldStatus = 'ON_FIELD' | 'BUSY' | 'AVAILABLE' | 'OFFLINE';

export type OfficerAccountStatus = 'active' | 'inactive' | 'blocked';

export type BankDetails = {
  bankName: string | null;
  accountHolderName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
};

export type EmergencyContact = {
  name: string;
  relationship: string;
  phone: string;
  address: string;
};

export type Education = {
  highestQualification: string | null;
  university: string | null;
  graduationYear: string | null;
};

export type BackgroundInfo = {
  criminalRecord: boolean;
  healthIssues: boolean;
  details: string | null;
};

export type SalaryBreakdown = {
  basic: number;
  hra: number;
  transportAllowance: number;
  otherAllowances: number;
  total: number;
};

export type Benefits = {
  healthInsurance: boolean;
  pfApplicable: boolean;
  esicApplicable: boolean;
};

export type OfficerDocumentType =
  | 'PHOTO_ID_FRONT'
  | 'PHOTO_ID_BACK'
  | 'PROFILE_PHOTO'
  | 'RESUME';

export type OfficerDocument = {
  id: string;
  type: OfficerDocumentType;
  label: string;
  required: boolean;
  status: 'uploaded' | 'not_uploaded';
  url?: string;
  mimeType?: string | null;
  uploadedAt?: string;
};

export type OfficerCredentialsInfo = {
  loginEmail: string;
  passwordSetMethod: 'auto' | 'manual';
  visibleToAdmin: boolean;
  lastPasswordRotatedAt: string | null;
};

export type Officer = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  alternatePhone: string | null;
  roleId: string | null;
  role: string | null;
  designation: string | null;
  department: string | null;
  city: string | null;
  status: OfficerAccountStatus;
  fieldStatus: OfficerFieldStatus;
  joiningDate: string | null;
  currentAddress: string | null;
  permanentAddress: string | null;
  state: string | null;
  pincode: string | null;
  region: string | null;
  dateOfBirth: string | null;
  gender: 'Male' | 'Female' | 'Other' | null;
  bloodGroup: string | null;
  maritalStatus: string | null;
  bankDetails: BankDetails;
  emergencyContacts: EmergencyContact[];
  education: Education;
  backgroundInfo: BackgroundInfo;
  positionApplied: string | null;
  expectedSalary: number | null;
  joiningDatePreference: string | null;
  permissions: string[];
  credentials: OfficerCredentialsInfo | null;
};

export type Contract = {
  id: string;
  contractNumber: string | null;
  contractType: 'Permanent' | 'Temporary' | 'Probation' | string;
  status: 'Active' | 'Expired' | 'Terminated' | string;
  startDate: string | null;
  endDate: string | null;
  position: string | null;
  designation: string | null;
  department: string | null;
  reportingTo: string | null;
  workLocation: string | null;
  workingHoursPerDay: number | null;
  weeklyOffDays: number | null;
  leaveEntitlementPerYear: number | null;
  salary: SalaryBreakdown;
  bankDetails: BankDetails;
  benefits: Benefits;
};

export type UpdateOfficerPersonalInput = {
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  education?: Education;
  backgroundInfo?: BackgroundInfo;
  positionApplied?: string;
  expectedSalary?: number;
  joiningDatePreference?: string;
};

export type UpdateOfficerContactInput = {
  email?: string;
  phone?: string;
  alternatePhone?: string;
  currentAddress?: string;
  permanentAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  region?: string;
  bankDetails?: BankDetails;
  emergencyContacts?: EmergencyContact[];
};

export type UpdateOfficerContractInput = {
  contractType?: string;
  startDate?: string;
  endDate?: string;
  terms?: Partial<{
    contractNumber: string;
    status: string;
    position: string;
    designation: string;
    department: string;
    reportingTo: string;
    workLocation: string;
    workingHoursPerDay: number;
    weeklyOffDays: number;
    leaveEntitlementPerYear: number;
    salary: Partial<SalaryBreakdown>;
    benefits: Partial<Benefits>;
  }>;
};

export type UpdateOfficerRoleInput = {
  roleId: string;
  joiningDate?: string;
};

export const OFFICER_DOCUMENT_DEFINITIONS: readonly {
  type: OfficerDocumentType;
  dbType: string;
  label: string;
  required: boolean;
}[] = [
  { type: 'PHOTO_ID_FRONT', dbType: 'photo_id_front', label: 'Photo ID - Front Side', required: true },
  { type: 'PHOTO_ID_BACK', dbType: 'photo_id_back', label: 'Photo ID - Back Side', required: true },
  { type: 'PROFILE_PHOTO', dbType: 'profile_photo', label: 'Profile Photo', required: true },
  { type: 'RESUME', dbType: 'resume', label: 'Resume/CV', required: false },
] as const;

export function mapDbDocumentType(dbType: string): OfficerDocumentType {
  const found = OFFICER_DOCUMENT_DEFINITIONS.find((d) => d.dbType === dbType);
  if (found) return found.type;
  if (dbType === 'id_proof') return 'PHOTO_ID_FRONT';
  if (dbType === 'address_proof') return 'PHOTO_ID_BACK';
  return 'PROFILE_PHOTO';
}

export function mapFieldStatus(raw: string | null | undefined): OfficerFieldStatus {
  const s = String(raw ?? 'offline').toLowerCase();
  if (s === 'on_field' || s === 'on field') return 'ON_FIELD';
  if (s === 'busy') return 'BUSY';
  if (s === 'available') return 'AVAILABLE';
  return 'OFFLINE';
}

export function maskAccountNumber(num: string | null | undefined): string {
  if (!num) return '—';
  if (num.length <= 4) return num;
  return `${'•'.repeat(Math.min(num.length - 4, 8))}${num.slice(-4)}`;
}
