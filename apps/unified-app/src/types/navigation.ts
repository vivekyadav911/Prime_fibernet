import type { NavigatorScreenParams } from '@react-navigation/native';

/**
 * Auth stack — Flutter `AdminAuthScreen`, customer/officer login, shared auth package.
 */
export type AuthStackParamList = {
  Login: undefined;
  /** Flutter: customer/officer registration flows */
  Register: undefined;
  /** @deprecated Use Register — kept for existing navigate() calls */
  SignUp: undefined;
  ForgotPassword: undefined;
  /** Flutter: `AppState.loginWithOtp` / officer OTP auth */
  OTPVerification: { identifier: string };
  Totp: undefined;
  /** Flutter: `prime_fibernet_auth` UnifiedLoginScreen / UnifiedAuthScreen */
  UnifiedLogin: undefined;
  UnifiedAuth: { role?: 'customer' | 'officer' | 'admin' } | undefined;
  /** Flutter: `prime_fibernet_app` AuthScreen */
  CustomerAuth: undefined;
  /** Flutter: `prime_fibernet_officer_app` OfficerLoginScreen */
  OfficerLogin: undefined;
  /** Flutter: `prime_fibernet_admin_panel` AdminAuthScreen (also go_router `/login`) */
  AdminAuth: undefined;
};

/**
 * Customer bottom tabs — Flutter `RootShell`.
 */
export type CustomerTabParamList = {
  /** Flutter tab 0: `DashboardScreen` */
  Home: undefined;
  /** Flutter tab 1: `PlansScreen` */
  Plans: undefined;
  /** Flutter tab 2: `PaymentsScreen` (label "Pay") */
  Payments: undefined;
  /** Flutter tab 3: `RequestsScreen` */
  Requests: undefined;
  /** Flutter tab 4: support chatbot */
  Support: undefined;
  /** Flutter tab 5 / `MoreScreen` — unified app uses Profile */
  Profile: undefined;
};

/**
 * Customer stack screens pushed from tabs / named routes (`MaterialApp.routes`).
 */
export type CustomerStackParamList = {
  CustomerTabs: NavigatorScreenParams<CustomerTabParamList> | undefined;
  /** Flutter: `DashboardScreen` / `HomeScreen` */
  Dashboard: undefined;
  Home: undefined;
  PlanDetails: { planId: string };
  Checkout: { planId: string; amount: number };
  PaymentSelection: { planId: string; amount: number };
  PaymentGateway: {
    orderId: string;
    amount: number;
    userInfo: {
      paymentId: string;
      checkoutUrl: string | null;
      gateway: 'razorpay' | 'easybuzz';
      planName?: string;
    };
  };
  PaymentSuccess: {
    paymentId: string;
    amount: number;
    planName: string;
    activationDate: string;
  };
  MakePayment: { userId?: string } | undefined;
  PaymentHistory: undefined;
  MyBills: undefined;
  Invoice: { invoiceId: string };
  CreateRequest: { planId?: string } | undefined;
  RequestDetails: { requestId: string };
  NearbyMap: undefined;
  Notifications: undefined;
  About: undefined;
  Terms: undefined;
  Privacy: undefined;
  Refund: undefined;
  SupportScreen: undefined;
};

/**
 * Officer drawer + tabs — Flutter `OfficerRootShell` + drawer pushes.
 */
export type OfficerDrawerParamList = {
  Dashboard: undefined;
  Requests: undefined;
  Map: undefined;
  Attendance: undefined;
  FieldMap: undefined;
  FieldTracking: undefined;
  Shifts: undefined;
  ShiftCalendar: undefined;
  ShiftCheckIn: { scheduleId?: string } | undefined;
  ShiftCheckOut: { scheduleId?: string } | undefined;
  ShiftManagement: undefined;
  ShiftRequest: undefined;
  CollectPayment: { userId?: string; customerName?: string } | undefined;
  Invoice: { invoiceId?: string } | undefined;
  Inventory: undefined;
  Earnings: undefined;
  PerformanceWallet: undefined;
  Leave: undefined;
  TimeOff: undefined;
  Payslip: undefined;
  Payslips: undefined;
  AttendanceHistory: undefined;
  AttendanceEnhanced: undefined;
  OnboardingCheck: undefined;
  NewOfficerOnboarding: { token?: string } | undefined;
  OnboardingForm: { token: string };
  OnboardingSuccess: undefined;
  Notifications: undefined;
  About: undefined;
  Terms: undefined;
  Privacy: undefined;
  Support: undefined;
  Profile: undefined;
  /** Flutter: gates app until GPS enabled */
  LocationGate: undefined;
};

export type OfficerStackParamList = {
  LocationGate: undefined;
  OfficerDrawer: NavigatorScreenParams<OfficerDrawerParamList> | undefined;
  /** Flutter: `RequestDetailScreen.route` */
  RequestDetail: { requestId: string };
  OfficerLogin: undefined;
  OfficerAuth: undefined;
};

/** Nested admin stack param lists */
export type AdminUsersStackParamList = {
  UserList: undefined;
  UserDetail: { userId: string };
  UserEdit: { userId: string };
  AddUser: undefined;
};

export type AdminOfficersStackParamList = {
  OfficerList: undefined;
  OfficerDetail: { officerId: string };
  OfficerEdit: { officerId: string; section?: 'personal' | 'contact' | 'role' | 'contract' };
  AddOfficer: undefined;
};

export type AdminAttendanceStackParamList = {
  LiveAttendance: undefined;
  Attendance: undefined;
  CheckInExceptions: undefined;
  AttendanceRecords: undefined;
  CompletedShifts: undefined;
  GeofenceManagement: undefined;
  CreateGeofence: { geofenceId?: string } | undefined;
  AssignGeofence: { geofenceId: string };
  ApprovalRequests: undefined;
  ShiftManagement: undefined;
  LeaveManagement: undefined;
  AttendanceReports: undefined;
};

export type AdminPayrollStackParamList = {
  Payroll: undefined;
  PayslipsManagement: undefined;
};

export type AdminRequestsStackParamList = {
  RequestList: undefined;
  RequestDetail: { requestId: string };
};

export type AdminTicketsStackParamList = {
  TicketPortal: { linkedRequestId?: string; linkedRequestNumber?: string } | undefined;
  TicketList: undefined;
  TicketDetail: { ticketId: string };
};

export type AdminPlansStackParamList = {
  PlanList: undefined;
  PlanForm: { planId?: string } | undefined;
};

export type AdminPaymentsStackParamList = {
  PaymentList: undefined;
};

export type AdminInvoicesStackParamList = {
  InvoiceList: undefined;
  InvoiceHistory: undefined;
  ManualGstInvoice: undefined;
};

export type AdminInventoryStackParamList = {
  InventoryList: undefined;
  AssignmentRequests: undefined;
  InventoryHistory: undefined;
  Categories: undefined;
  BulkOperations: undefined;
};

/**
 * Admin drawer / shell — Flutter `AdminShell` indexed destinations + go_router `/`.
 */
export type AdminDrawerParamList = {
  Dashboard: undefined;
  Users: NavigatorScreenParams<AdminUsersStackParamList> | undefined;
  Officers: NavigatorScreenParams<AdminOfficersStackParamList> | undefined;
  AddOfficer: undefined;
  OfficerDetail: { officerId: string };
  Attendance: NavigatorScreenParams<AdminAttendanceStackParamList> | undefined;
  /** @deprecated Use Attendance stack */
  AttendanceManagement: undefined;
  /** @deprecated Use Attendance stack */
  CheckInReview: undefined;
  /** @deprecated Use Attendance stack */
  AttendanceRecords: undefined;
  /** @deprecated Use Attendance stack */
  CompletedShifts: undefined;
  LocationManagement: undefined;
  OfficerOfficeHours: undefined;
  PayslipsManagement: undefined;
  PayslipDetail: { payslipId: string };
  GeneratePayslip: { officerId?: string } | undefined;
  ShiftRequests: undefined;
  ShiftApproval: undefined;
  ShiftAssignment: undefined;
  Payroll: NavigatorScreenParams<AdminPayrollStackParamList> | undefined;
  PayRunReview: { payRunId: string };
  RoleManagement: undefined;
  Requests: NavigatorScreenParams<AdminRequestsStackParamList> | undefined;
  TicketPortal: NavigatorScreenParams<AdminTicketsStackParamList> | undefined;
  Plans: NavigatorScreenParams<AdminPlansStackParamList> | undefined;
  EnhancedPlans: undefined;
  Notifications: undefined;
  NotificationEditor: { draftId?: string } | undefined;
  Payments: NavigatorScreenParams<AdminPaymentsStackParamList> | undefined;
  PaymentDetail: { paymentId: string };
  Invoices: NavigatorScreenParams<AdminInvoicesStackParamList> | undefined;
  InvoiceManagement: undefined;
  EnhancedInvoiceManagement: undefined;
  InvoiceEditor: { invoiceId?: string } | undefined;
  InvoiceHistory: undefined;
  ManualGstInvoice: undefined;
  Inventory: NavigatorScreenParams<AdminInventoryStackParamList> | undefined;
  InventoryItemDetail: { itemId: string };
  AddEditInventoryItem: { itemId?: string } | undefined;
  InventoryCategories: undefined;
  InventoryHistory: undefined;
  AssignmentRequests: undefined;
  BulkOperations: undefined;
  QuickAddStock: undefined;
  QuickStockAction: undefined;
  Reports: undefined;
  /** Unified app drawer label for Flutter `ReportsScreen` */
  Analytics: undefined;
  Audit: undefined;
  Map: undefined;
  /** @deprecated Use Map */
  OfficerMap: undefined;
  BillingInvoices: undefined;
  Support: undefined;
  /** @deprecated Use Support */
  FaqSupport: undefined;
  Settings: undefined;
  OnboardingApplications: undefined;
  ReviewApplication: { applicationId: string };
  LeaveManagement: undefined;
  AllowedOnboardingEmails: undefined;
};

export type AdminStackParamList = {
  AdminDrawer: NavigatorScreenParams<AdminDrawerParamList> | undefined;
  PaymentDetail: { paymentId: string };
  /** go_router `/login` */
  AdminAuth: undefined;
};

/** Root navigator switches by authenticated role. */
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  Customer: NavigatorScreenParams<CustomerStackParamList> | undefined;
  Officer: NavigatorScreenParams<OfficerStackParamList> | undefined;
  Admin: NavigatorScreenParams<AdminStackParamList> | undefined;
  Totp: undefined;
  /** Shown on web when a customer or officer account tries to use the browser app */
  WebUnsupported: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
