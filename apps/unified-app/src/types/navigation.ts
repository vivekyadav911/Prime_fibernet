import type { NavigatorScreenParams } from '@react-navigation/native';

import type { EmploymentContract } from '@/types/contract';
import type { TimeRange } from '@/types/map';
import type { PaymentMethod } from '@/types/payments';

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
  /** Support hub (tickets, chat, FAQs) */
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
  CustomerBill: undefined;
  PaymentMethod: { amount: number; planName: string; customerId: string; paymentMethod?: PaymentMethod };
  GatewayWebView: {
    amount: number;
    planName: string;
    customerId: string;
    paymentMethod: PaymentMethod;
  };
  Receipt: { paymentId: string };
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
  CustomerLiveChat: { sessionId?: string } | undefined;
  CustomerFaqList: undefined;
  CustomerFaqDetail: { faqId: string };
  CustomerSupportHub: undefined;
  CustomerTicketList: undefined;
  CustomerTicketDetail: { ticketId: string };
  CreateCustomerTicket: undefined;
  PlanChangeRequest: { planId: string };
};

export type OfficerLeaveStackParamList = {
  LeaveList: undefined;
  ApplyLeave: undefined;
};

export type OfficerNotificationsStackParamList = {
  NotificationsList: undefined;
};

export type OfficerPayslipStackParamList = {
  PayslipList: undefined;
  PayslipDetail: { payslipId: string };
  PayslipPdfViewer: {
    storagePath: string;
    title?: string;
    fileName?: string;
  };
};

export type OfficerProfileStackParamList = {
  ProfileHome: undefined;
  ChangePassword: undefined;
  EmploymentContract: { highlightSign?: boolean } | undefined;
  ContractPdfViewer: {
    storagePath: string;
    title?: string;
    bucket?: string;
    contractSnapshot?: EmploymentContract;
  };
};

export type OfficerRequestsStackParamList = {
  RequestsList: undefined;
};

export type OfficerCollectionsStackParamList = {
  CollectionsList: undefined;
  AssignedCustomers: undefined;
  CustomerPaymentHistory: { customerId: string; customerName: string };
  CashCollection: {
    customerId: string;
    customerName: string;
    accountNumber: string;
    amount: number;
    dueDate?: string;
    planName?: string;
  };
  CollectionHistory: undefined;
};

/**
 * Officer drawer + tabs — Flutter `OfficerRootShell` + drawer pushes.
 */
export type OfficerDrawerParamList = {
  Dashboard: undefined;
  RequestsStack: undefined;
  /** @deprecated use RequestsStack */
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
  CollectionsStack: NavigatorScreenParams<OfficerCollectionsStackParamList> | undefined;
  /** @deprecated use CollectionsStack */
  OfficerCollections: undefined;
  CashCollection: {
    customerId: string;
    customerName: string;
    accountNumber: string;
    amount: number;
    dueDate?: string;
    planName?: string;
  };
  CollectionHistory: undefined;
  Invoice: { invoiceId?: string } | undefined;
  Inventory: undefined;
  Earnings: undefined;
  PerformanceWallet: undefined;
  Leave: undefined;
  LeaveStack: undefined;
  ApplyLeave: undefined;
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
  ProfileStack: NavigatorScreenParams<OfficerProfileStackParamList> | undefined;
  NotificationsStack: NavigatorScreenParams<OfficerNotificationsStackParamList> | undefined;
  ChangePassword: undefined;
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
export type AdminDashboardStackParamList = {
  DashboardHome: undefined;
};

export type AdminUsersStackParamList = {
  UserList: { planId?: string } | undefined;
  UserDetail: { userId: string };
  UserEdit: { userId: string };
  AddUser: undefined;
};

export type AdminOfficersStackParamList = {
  OfficerList: undefined;
  OfficerDetail: { officerId: string };
  OfficerEdit: { officerId: string; section?: 'personal' | 'contact' | 'role' };
  AddOfficer: undefined;
  EmploymentContractForm: { officerId: string; contractId?: string };
  EmploymentContractVersionHistory: { contractId: string; officerId: string };
  ContractPdfViewer: {
    storagePath: string;
    title?: string;
    bucket?: string;
    contractSnapshot?: EmploymentContract;
  };
  EmploymentContractSign: { contractId: string; officerId: string; role: 'employer' };
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
  PayslipReview: {
    officerId: string;
    periodStart: string;
    periodEnd: string;
    payslipId?: string;
  };
  PayslipSettings: undefined;
  PayslipPdfViewer: {
    storagePath: string;
    title?: string;
    fileName?: string;
  };
};

export type AdminRequestsStackParamList = {
  RequestList: undefined;
  RequestDetail: { requestId: string };
};

export type AdminTicketsStackParamList = {
  TicketPortalHome: { linkedRequestId?: string; linkedRequestNumber?: string } | undefined;
  TicketList: undefined;
  TicketDetail: { ticketId: string };
};

export type AdminSupportStackParamList = {
  SupportDashboard: undefined;
  Tickets: undefined;
  TicketDetail: { ticketId: string };
  CreateTicket: { linkedRequestId?: string; linkedRequestNumber?: string; customerId?: string } | undefined;
  LiveChat: undefined;
  ChatConversation: { sessionId: string };
  FaqList: undefined;
  FaqEditor: { faqId?: string };
  FaqCategories: undefined;
  CustomerSupportProfile: { customerId: string };
  Complaints: undefined;
  ComplaintDetail: { complaintId: string };
  SlaConfig: undefined;
  CannedResponses: undefined;
  SupportAnalytics: undefined;
};

export type AdminPlansStackParamList = {
  PlanList: undefined;
  PlanForm: { mode: 'create' | 'edit'; planId?: string } | undefined;
};

export type AdminNotificationsStackParamList = {
  NotificationList: { initialTab?: 'drafts' | 'sent' } | undefined;
  CreateNotification: {
    mode: 'create' | 'edit';
    notificationId?: string;
    prefill?: import('@/types/notifications').CreateNotificationFormData;
  };
  NotificationDetail: { notificationId: string };
  AutomaticNotifications: undefined;
};

export type AdminPaymentsStackParamList = {
  PaymentList: undefined;
  CollectionAssignments: undefined;
  CustomerCollectionDetail: { customerId: string };
  PaymentDetail: { paymentId: string };
  PaymentReview: { paymentId: string };
  GatewayConfig: undefined;
  PaymentAnalytics: undefined;
  Refund: { paymentId: string };
};

export type AdminInvoicesStackParamList = {
  InvoiceList: undefined;
  InvoiceHistory: undefined;
  ManualGstInvoice: undefined;
  CreateInvoice: { invoiceType?: 'non_gst' | 'gst' | 'custom_gst' } | undefined;
  InvoiceSettings: undefined;
  InvoicePdfViewer: { storagePath: string; title?: string; fileName?: string };
};

export type AdminInventoryStackParamList = {
  InventoryList: undefined;
  AssignmentRequests: undefined;
  InventoryHistory: undefined;
  Categories: undefined;
  BulkOperations: undefined;
  ItemDetail: { itemId: string };
  QuickAction: { itemId: string; defaultAction?: 'sold' | 'damaged' | 'returned' | 'add_stock' };
  AddItem: undefined;
  EditItem: { itemId: string };
};

export type AdminSettingsStackParamList = {
  SettingsHub: undefined;
  AdminAccount: undefined;
  General: undefined;
  Security: undefined;
  Officers: undefined;
  OfficerSalary: undefined;
  Notifications: undefined;
  Integrations: undefined;
  GatewayConfig: undefined;
  Appearance: undefined;
  System: undefined;
  BackupExport: undefined;
  AuditLogs: undefined;
};

export type AdminMapStackParamList = {
  MapMain: undefined;
  TrailReplay: {
    officerId: string;
    officerName: string;
    date: string;
    timeRange: TimeRange;
  };
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
  Plans: NavigatorScreenParams<AdminPlansStackParamList> | undefined;
  EnhancedPlans: undefined;
  Notifications: NavigatorScreenParams<AdminNotificationsStackParamList> | undefined;
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
  Map: NavigatorScreenParams<AdminMapStackParamList> | undefined;
  /** @deprecated Use Map */
  OfficerMap: undefined;
  BillingInvoices: undefined;
  Support: NavigatorScreenParams<AdminSupportStackParamList> | undefined;
  /** @deprecated Use Support stack Tickets */
  TicketPortal: NavigatorScreenParams<AdminTicketsStackParamList> | undefined;
  /** @deprecated Use Support */
  FaqSupport: undefined;
  Settings: NavigatorScreenParams<AdminSettingsStackParamList> | undefined;
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
  // eslint-disable-next-line @typescript-eslint/no-namespace -- required by React Navigation type augmentation
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- augmentation merges RootStackParamList
    interface RootParamList extends RootStackParamList {}
  }
}
