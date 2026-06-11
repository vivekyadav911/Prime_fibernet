export type PaginatedParams = {
  page?: number;
  limit?: number;
  search?: string;
};

export type UpcomingRecharge = {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  city: string;
  planName: string;
  price: number;
  expiryDate: string;
  daysRemaining: number;
};

export type RecentActivity = {
  id: string;
  title: string;
  description: string;
  status: string;
  timestamp: string;
  icon: string;
};

export type AdminUserDetail = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  joinDate: string;
  isBlocked: boolean;
  planName: string | null;
  planSpeed: number | null;
  expiryDate: string | null;
  autoRenew: boolean;
};

export type AdminUserListItem = {
  id: string;
  legacyUserId: number | null;
  name: string;
  username: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  planName: string;
  status: 'active' | 'blocked' | 'expired';
  isBlocked: boolean;
};

export type AdminUsersListParams = {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  status?: 'all' | 'active' | 'blocked' | 'expired';
  blockFilter?: 'all' | 'blocked' | 'unblocked';
};

export type AdminUsersListResponse = {
  items: AdminUserListItem[];
  total: number;
  page: number;
  limit: number;
  cities: string[];
};

export type CreateAdminUserInput = {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  planId: string;
  status: 'active' | 'blocked';
  address: string;
  city: string;
  district: string;
  pincode: string;
  state: string;
  expiryDate: string;
};

export type OfficerAccountStatus = 'active' | 'inactive' | 'blocked';

export type AdminOfficerStats = {
  total: number;
  active: number;
  available: number;
  restricted: number;
};

export type OfficerRoleOption = {
  id: string;
  name: string;
  description: string | null;
};

export type AdminOfficersListParams = {
  page?: number;
  search?: string;
  accountStatus?: 'all' | OfficerAccountStatus;
};

export type AdminOfficerDetail = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  employeeId: string | null;
  region: string | null;
  designation: string | null;
  accountStatus: OfficerAccountStatus;
  availabilityStatus: string;
  fieldStatus: string;
  isActive: boolean;
  isBlocked: boolean;
  status: string;
  shiftStatus: string;
  requestsCompleted: number;
  avgResponseHours: number;
  rating: number;
};

export type CreateAdminOfficerInput = {
  fullName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  region?: string;
  city?: string;
  state?: string;
  pincode?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  currentAddress?: string;
  permanentAddress?: string;
  emergencyContacts?: Array<{
    name?: string;
    relationship?: string;
    phone?: string;
    address?: string;
  }>;
  roleId?: string;
  joiningDate?: string;
  baseSalary?: number;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  profilePhotoUrl: string;
  photoIdFrontUrl?: string;
  photoIdBackUrl?: string;
  resumeUrl?: string;
  password?: string;
  passwordMode?: 'auto' | 'manual';
  credentialsEmail?: string;
  allowAdminViewPassword?: boolean;
  contractType?: string;
  contractStartDate?: string;
  contractTerms?: Record<string, unknown>;
  education?: Record<string, unknown>;
  backgroundInfo?: Record<string, unknown>;
  positionApplied?: string;
  expectedSalary?: number;
  joiningDatePreference?: string;
};

export type AdminInvoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  date: string;
  status: 'paid' | 'unpaid' | 'overdue';
};

export type AttendanceRecord = {
  id: string;
  officerId: string;
  officerName: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  hoursWorked: number;
  location: string | null;
  status: 'present' | 'absent' | 'late' | 'half_day';
};

export type PayrollEntry = {
  officerId: string;
  officerName: string;
  baseSalary: number;
  allowances: number;
  overtime: number;
  bonus: number;
  deductions: number;
  netPay: number;
};

export type InventoryAdminItem = {
  id: string;
  name: string;
  category: string;
  totalQty: number;
  assignedQty: number;
  availableQty: number;
  condition: string;
};

export type AdminRoleEntry = {
  id: string;
  name: string;
  permissions: Record<string, Record<string, boolean>>;
};

export type MapOfficerPin = {
  officerId: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
};

export type MapRequestPin = {
  requestId: string;
  type: string;
  lat: number;
  lng: number;
  status: string;
};
