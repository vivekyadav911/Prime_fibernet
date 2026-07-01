import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackHeaderBackProps } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp, RouteProp } from '@react-navigation/native';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DashboardScreen } from '@/screens/admin/DashboardScreen';
import { InventoryListScreen } from '@/screens/admin/assets/inventory/InventoryListScreen';
import { ItemDetailScreen } from '@/screens/admin/assets/inventory/ItemDetailScreen';
import { QuickActionScreen } from '@/screens/admin/assets/inventory/QuickActionScreen';
import { AddItemScreen } from '@/screens/admin/assets/inventory/AddItemScreen';
import { EditItemScreen } from '@/screens/admin/assets/inventory/EditItemScreen';
import { AssignmentRequestsScreen } from '@/screens/admin/assets/inventory/AssignmentRequestsScreen';
import { BulkOperationsScreen } from '@/screens/admin/assets/inventory/BulkOperationsScreen';
import { CategoriesScreen } from '@/screens/admin/assets/inventory/CategoriesScreen';
import { InventoryHistoryScreen } from '@/screens/admin/assets/inventory/InventoryHistoryScreen';
import { InvoiceHistoryScreen } from '@/screens/admin/finance/invoices/InvoiceHistoryScreen';
import { InvoiceListScreen } from '@/screens/admin/finance/invoices/InvoiceListScreen';
import { CreateInvoiceScreen } from '@/screens/admin/finance/invoices/CreateInvoiceScreen';
import { InvoiceSettingsScreen } from '@/screens/admin/finance/invoices/InvoiceSettingsScreen';
import { ManualGSTInvoiceScreen } from '@/screens/admin/finance/invoices/ManualGSTInvoiceScreen';
import { InvoicePdfViewerScreen } from '@/screens/common/InvoicePdfViewerScreen';
import { AttendanceScreen } from '@/screens/admin/hr/AttendanceScreen';
import { AttendanceRecordsScreenEnhanced as AttendanceRecordsScreen } from '@/screens/admin/hr/AttendanceRecordsScreenEnhanced';
import { ApprovalRequestsScreen } from '@/screens/admin/hr/ApprovalRequestsScreen';
import { AssignGeofenceScreen } from '@/screens/admin/hr/AssignGeofenceScreen';
import { AttendanceReportsScreen } from '@/screens/admin/hr/AttendanceReportsScreen';
import { CheckInExceptionsScreen } from '@/screens/admin/hr/CheckInExceptionsScreen';
import { CompletedShiftsScreen } from '@/screens/admin/hr/CompletedShiftsScreen';
import { CreateGeofenceScreen } from '@/screens/admin/hr/CreateGeofenceScreen';
import { GeofenceManagementScreen } from '@/screens/admin/hr/GeofenceManagementScreen';
import { LeaveManagementScreen } from '@/screens/admin/hr/LeaveManagementScreen';
import { LiveAttendanceScreen } from '@/screens/admin/hr/LiveAttendanceScreen';
import { ManualAttendanceEntryScreen } from '@/screens/admin/hr/ManualAttendanceEntryScreen';
import { ShiftManagementScreen } from '@/screens/admin/hr/ShiftManagementScreen';
import { RoleManagementScreen } from '@/screens/admin/hr/RoleManagementScreen';
import { PayrollScreen } from '@/screens/admin/hr/payroll/PayrollScreen';
import { PayslipsManagementScreen } from '@/screens/admin/hr/payroll/PayslipsManagementScreen';
import { PayslipPreGenerationScreen } from '@/screens/admin/hr/payroll/PayslipPreGenerationScreen';
import { PayslipAttendanceTriageScreen } from '@/screens/admin/hr/payroll/PayslipAttendanceTriageScreen';
import { PayslipReviewScreen } from '@/screens/admin/hr/payroll/PayslipReviewScreen';
import { PayslipSettingsScreen } from '@/screens/admin/hr/payroll/PayslipSettingsScreen';
import { PayslipPdfViewerScreen } from '@/screens/common/PayslipPdfViewerScreen';
import { NotificationCenterScreen } from '@/screens/admin/notifications/NotificationCenterScreen';
import { NotificationsScreen } from '@/screens/admin/notifications/NotificationsScreen';
import { CreateNotificationScreen } from '@/screens/admin/notifications/CreateNotificationScreen';
import { NotificationDetailScreen } from '@/screens/admin/notifications/NotificationDetailScreen';
import { AutomaticNotificationsScreen } from '@/screens/admin/notifications/AutomaticNotificationsScreen';
import { AddOfficerScreen } from '@/screens/admin/officers/AddOfficerScreen';
import { EditOfficerScreen } from '@/screens/admin/officers/EditOfficerScreen';
import { OfficerDetailScreen } from '@/screens/admin/officers/OfficerDetailScreen';
import { EmploymentContractFormScreen } from '@/screens/admin/officers/EmploymentContractFormScreen';
import { EmploymentContractSignScreen } from '@/screens/admin/officers/EmploymentContractSignScreen';
import { EmploymentContractVersionHistoryScreen } from '@/screens/admin/officers/EmploymentContractVersionHistoryScreen';
import { ContractPdfViewerScreen } from '@/screens/common/ContractPdfViewerScreen';
import { OfficerListScreen } from '@/screens/admin/officers/OfficerListScreen';
import { PlanFormScreenV2 } from '@/screens/admin/plans/PlanFormScreenV2';
import { PlansScreen } from '@/screens/admin/plans/PlansScreen';
import { RequestsScreen } from '@/screens/admin/requests/RequestsScreen';
import { TicketDetailScreen } from '@/screens/admin/ticketPortal/TicketDetailScreen';
import { TicketListScreen } from '@/screens/admin/ticketPortal/TicketListScreen';
import { TicketPortalScreen } from '@/screens/admin/ticketPortal/TicketPortalScreen';
import { ReportsScreen } from '@/screens/admin/ReportsScreen';
import { AdminMapScreen } from '@/screens/admin/system/MapScreen';
import {
  AdminAccountScreen,
  AppearanceSettingsScreen,
  AuditLogsScreen,
  BackupExportScreen,
  GeneralSettingsScreen,
  IntegrationsSettingsScreen,
  NotificationsSettingsScreen,
  OfficerSalaryScreen,
  OfficersSettingsScreen,
  SecurityScreen,
  SettingsHubScreen,
  SystemSettingsScreen,
  WhatsAppLogsScreen,
  WhatsAppSettingsScreen,
} from '@/screens/admin/settings';
import { AdminSupportScreen } from '@/screens/admin/system/SupportScreen';
import {
  CannedResponsesScreen,
  ChatConversationScreen,
  ComplaintDetailScreen,
  ComplaintsScreen,
  CreateTicketScreen,
  CustomerSupportProfileScreen,
  FaqCategoriesScreen,
  FaqEditorScreen,
  FaqListScreen,
  LiveChatScreen,
  SlaConfigScreen,
  SupportAnalyticsScreen,
  SupportDashboardScreen,
  SupportTicketDetailScreen,
  SupportTicketsScreen,
} from '@/screens/admin/support';
import { AddUserScreen } from '@/screens/admin/users/AddUserScreen';
import { UserDetailScreen } from '@/screens/admin/users/UserDetailScreen';
import { UserEditScreen } from '@/screens/admin/users/UserEditScreen';
import { UserListScreen } from '@/screens/admin/users/UserListScreen';
import { AdminAuditScreen } from '@/screens/admin/AdminAuditScreen';
import {
  CollectionAssignmentsScreen,
  CustomerCollectionDetailScreen,
  GatewayConfigScreen,
  PaymentAnalyticsScreen,
  PaymentDetailScreen,
  PaymentReviewScreen,
  PaymentsListScreen,
  RefundScreen,
} from '@/screens/admin/payments';
import type {
  AdminAttendanceStackParamList,
  AdminDashboardStackParamList,
  AdminInventoryStackParamList,
  AdminInvoicesStackParamList,
  AdminOfficersStackParamList,
  AdminPayrollStackParamList,
  AdminPaymentsStackParamList,
  AdminPlansStackParamList,
  AdminNotificationsStackParamList,
  AdminRequestsStackParamList,
  AdminSupportStackParamList,
  AdminSettingsStackParamList,
  AdminTicketsStackParamList,
  AdminUsersStackParamList,
} from '@/types/navigation';
import { adminHeaderTheme } from '@/theme/adminHeader';

import { AdminDrawerHeaderLeft } from './AdminDrawerHeaderLeft';
import { adminStackScreenOptions } from './adminScreenOptions';

const DashboardStack = createNativeStackNavigator<AdminDashboardStackParamList>();
const UsersStack = createNativeStackNavigator<AdminUsersStackParamList>();
const OfficersStack = createNativeStackNavigator<AdminOfficersStackParamList>();
const AttendanceStack = createNativeStackNavigator<AdminAttendanceStackParamList>();
const PayrollStack = createNativeStackNavigator<AdminPayrollStackParamList>();
const RequestsStack = createNativeStackNavigator<AdminRequestsStackParamList>();
const TicketsStack = createNativeStackNavigator<AdminTicketsStackParamList>();
const PlansStack = createNativeStackNavigator<AdminPlansStackParamList>();
const NotificationsStack = createNativeStackNavigator<AdminNotificationsStackParamList>();
const PaymentsStack = createNativeStackNavigator<AdminPaymentsStackParamList>();
const InvoicesStack = createNativeStackNavigator<AdminInvoicesStackParamList>();
const InventoryStack = createNativeStackNavigator<AdminInventoryStackParamList>();
const SettingsStack = createNativeStackNavigator<AdminSettingsStackParamList>();
const SupportStack = createNativeStackNavigator<AdminSupportStackParamList>();

function InventoryDrawerHeaderLeft(props: NativeStackHeaderBackProps) {
  const route = useRoute<RouteProp<AdminInventoryStackParamList, keyof AdminInventoryStackParamList>>();
  const navigation = useNavigation<NavigationProp<AdminInventoryStackParamList>>();

  if (route.name === 'InventoryList') {
    return <AdminDrawerHeaderLeft {...props} canGoBack={false} />;
  }

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('InventoryList');
  };

  return <AdminDrawerHeaderLeft {...props} canGoBack onBackPress={handleBack} />;
}

const inventoryStackScreenOptions = {
  ...adminStackScreenOptions,
  headerLeft: (props: NativeStackHeaderBackProps) => <InventoryDrawerHeaderLeft {...props} />,
};

export function AdminDashboardStackNav() {
  return (
    <DashboardStack.Navigator screenOptions={adminStackScreenOptions}>
      <DashboardStack.Screen
        name="DashboardHome"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
    </DashboardStack.Navigator>
  );
}

export function AdminUsersStackNav() {
  return (
    <UsersStack.Navigator screenOptions={adminStackScreenOptions}>
      <UsersStack.Screen
        name="UserList"
        component={UserListScreen}
        options={{
          title: 'Users',
        }}
      />
      <UsersStack.Screen name="UserDetail" component={UserDetailScreen} options={{ title: 'User profile' }} />
      <UsersStack.Screen name="UserEdit" component={UserEditScreen} options={{ title: 'Edit user' }} />
      <UsersStack.Screen
        name="AddUser"
        component={AddUserScreen}
        options={{ title: 'Add New User' }}
      />
    </UsersStack.Navigator>
  );
}

export function AdminOfficersStackNav() {
  return (
    <OfficersStack.Navigator screenOptions={adminStackScreenOptions}>
      <OfficersStack.Screen name="OfficerList" component={OfficerListScreen} options={{ title: 'Officers' }} />
      <OfficersStack.Screen name="OfficerDetail" component={OfficerDetailScreen} options={{ title: 'Officer' }} />
      <OfficersStack.Screen name="OfficerEdit" component={EditOfficerScreen} options={{ title: 'Edit officer' }} />
      <OfficersStack.Screen
        name="EmploymentContractForm"
        component={EmploymentContractFormScreen}
        options={{ title: 'Employment contract' }}
      />
      <OfficersStack.Screen
        name="EmploymentContractVersionHistory"
        component={EmploymentContractVersionHistoryScreen}
        options={{ title: 'Version history' }}
      />
      <OfficersStack.Screen
        name="ContractPdfViewer"
        component={ContractPdfViewerScreen}
        options={{ headerShown: false }}
      />
      <OfficersStack.Screen
        name="EmploymentContractSign"
        component={EmploymentContractSignScreen}
        options={{ title: 'Sign contract' }}
      />
      <OfficersStack.Screen
        name="AddOfficer"
        component={AddOfficerScreen}
        options={{ title: 'Add Officer' }}
      />
    </OfficersStack.Navigator>
  );
}

export function AdminAttendanceStackNav() {
  return (
    <AttendanceStack.Navigator
      screenOptions={adminStackScreenOptions}
      initialRouteName="LiveAttendance"
    >
      <AttendanceStack.Screen name="LiveAttendance" component={LiveAttendanceScreen} options={{ title: 'Live Attendance' }} />
      <AttendanceStack.Screen name="AttendanceHub" component={AttendanceScreen} options={{ title: 'Attendance hub' }} />
      <AttendanceStack.Screen name="GeofenceManagement" component={GeofenceManagementScreen} options={{ title: 'Geofences' }} />
      <AttendanceStack.Screen name="CreateGeofence" component={CreateGeofenceScreen} options={{ title: 'Geofence', presentation: 'modal' }} />
      <AttendanceStack.Screen name="AssignGeofence" component={AssignGeofenceScreen} options={{ title: 'Assign officers', presentation: 'modal' }} />
      <AttendanceStack.Screen name="ApprovalRequests" component={ApprovalRequestsScreen} options={{ title: 'Approval requests' }} />
      <AttendanceStack.Screen name="CheckInExceptions" component={CheckInExceptionsScreen} options={{ title: 'Check-in exceptions' }} />
      <AttendanceStack.Screen name="AttendanceRecords" component={AttendanceRecordsScreen} options={{ title: 'Attendance records' }} />
      <AttendanceStack.Screen name="ManualAttendanceEntry" component={ManualAttendanceEntryScreen} options={{ title: 'Manual entry', presentation: 'modal' }} />
      <AttendanceStack.Screen name="ShiftManagement" component={ShiftManagementScreen} options={{ title: 'Shift management' }} />
      <AttendanceStack.Screen name="LeaveManagement" component={LeaveManagementScreen} options={{ title: 'Leave management' }} />
      <AttendanceStack.Screen name="AttendanceReports" component={AttendanceReportsScreen} options={{ title: 'Attendance reports' }} />
      <AttendanceStack.Screen name="CompletedShifts" component={CompletedShiftsScreen} options={{ title: 'Completed shifts' }} />
    </AttendanceStack.Navigator>
  );
}

export function AdminPayrollStackNav() {
  return (
    <PayrollStack.Navigator screenOptions={adminStackScreenOptions}>
      <PayrollStack.Screen name="PayrollHome" component={PayrollScreen} options={{ title: 'Payroll' }} />
      <PayrollStack.Screen name="PayslipsManagement" component={PayslipsManagementScreen} options={{ title: 'Payslips' }} />
      <PayrollStack.Screen name="PayslipPreGeneration" component={PayslipPreGenerationScreen} options={{ title: 'Confirm generation' }} />
      <PayrollStack.Screen name="PayslipAttendanceTriage" component={PayslipAttendanceTriageScreen} options={{ title: 'Fix attendance issues' }} />
      <PayrollStack.Screen name="PayslipReview" component={PayslipReviewScreen} options={{ title: 'Review payslip' }} />
      <PayrollStack.Screen name="PayslipSettings" component={PayslipSettingsScreen} options={{ title: 'Payslip settings' }} />
      <PayrollStack.Screen name="PayslipPdfViewer" component={PayslipPdfViewerScreen} options={{ headerShown: false, title: 'Payslip PDF' }} />
    </PayrollStack.Navigator>
  );
}

export function AdminRequestsStackNav() {
  return (
    <RequestsStack.Navigator screenOptions={adminStackScreenOptions}>
      <RequestsStack.Screen name="RequestList" component={RequestsScreen} options={{ title: 'Requests' }} />
    </RequestsStack.Navigator>
  );
}

export function AdminTicketPortalStackNav() {
  return (
    <TicketsStack.Navigator screenOptions={adminStackScreenOptions}>
      <TicketsStack.Screen name="TicketPortalHome" component={TicketPortalScreen} options={{ title: 'Ticket Portal' }} />
      <TicketsStack.Screen name="TicketList" component={TicketListScreen} options={{ title: 'All Tickets' }} />
      <TicketsStack.Screen name="TicketDetail" component={TicketDetailScreen} options={{ title: 'Ticket Detail' }} />
    </TicketsStack.Navigator>
  );
}

export function AdminPlansStackNav() {
  return (
    <PlansStack.Navigator screenOptions={adminStackScreenOptions}>
      <PlansStack.Screen name="PlanList" component={PlansScreen} options={{ title: 'Plans' }} />
      <PlansStack.Screen name="PlanForm" component={PlanFormScreenV2} options={{ title: 'Plan form' }} />
    </PlansStack.Navigator>
  );
}

export function AdminNotificationsStackNav() {
  return (
    <NotificationsStack.Navigator screenOptions={adminStackScreenOptions}>
      <NotificationsStack.Screen
        name="NotificationList"
        component={NotificationsScreen}
        options={({ navigation }) => ({
          title: 'Notifications',
          headerRight: () => (
            <Pressable
              onPress={() => navigation.navigate('AutomaticNotifications')}
              style={{ paddingHorizontal: 12 }}
              accessibilityLabel="Automation settings"
            >
              <Ionicons name="settings-outline" size={22} color={adminHeaderTheme.foreground} />
            </Pressable>
          ),
        })}
      />
      <NotificationsStack.Screen
        name="CreateNotification"
        component={CreateNotificationScreen}
        options={({ route }) => ({
          title: route.params.mode === 'edit' ? 'Edit Draft' : 'Create Notification',
        })}
      />
      <NotificationsStack.Screen
        name="NotificationDetail"
        component={NotificationDetailScreen}
        options={{ title: 'Notification Detail' }}
      />
      <NotificationsStack.Screen
        name="AutomaticNotifications"
        component={AutomaticNotificationsScreen}
        options={{ title: 'Automation Settings' }}
      />
    </NotificationsStack.Navigator>
  );
}

export function AdminPaymentsStackNav() {
  return (
    <PaymentsStack.Navigator screenOptions={adminStackScreenOptions} initialRouteName="PaymentList">
      <PaymentsStack.Screen name="PaymentList" component={PaymentsListScreen} options={{ title: 'Payments' }} />
      <PaymentsStack.Screen
        name="CollectionAssignments"
        component={CollectionAssignmentsScreen}
        options={{ title: 'Collection assignments' }}
      />
      <PaymentsStack.Screen
        name="CustomerCollectionDetail"
        component={CustomerCollectionDetailScreen}
        options={{ title: 'Customer detail' }}
      />
      <PaymentsStack.Screen name="PaymentDetail" component={PaymentDetailScreen} options={{ title: 'Payment detail' }} />
      <PaymentsStack.Screen name="PaymentReview" component={PaymentReviewScreen} options={{ title: 'Review payment' }} />
      <PaymentsStack.Screen name="GatewayConfig" component={GatewayConfigScreen} options={{ title: 'Payment gateways' }} />
      <PaymentsStack.Screen name="PaymentAnalytics" component={PaymentAnalyticsScreen} options={{ title: 'Payment analytics' }} />
      <PaymentsStack.Screen name="Refund" component={RefundScreen} options={{ title: 'Refund' }} />
    </PaymentsStack.Navigator>
  );
}

export function AdminInvoicesStackNav() {
  return (
    <InvoicesStack.Navigator screenOptions={adminStackScreenOptions}>
      <InvoicesStack.Screen name="InvoiceList" component={InvoiceListScreen} options={{ title: 'Invoices' }} />
      <InvoicesStack.Screen name="InvoiceHistory" component={InvoiceHistoryScreen} options={{ title: 'Invoice history' }} />
      <InvoicesStack.Screen name="CreateInvoice" component={CreateInvoiceScreen} options={{ title: 'Create invoice' }} />
      <InvoicesStack.Screen name="ManualGstInvoice" component={ManualGSTInvoiceScreen} options={{ title: 'Manual GST invoice' }} />
      <InvoicesStack.Screen name="InvoiceSettings" component={InvoiceSettingsScreen} options={{ title: 'Invoice templates' }} />
      <InvoicesStack.Screen
        name="InvoicePdfViewer"
        component={InvoicePdfViewerScreen}
        options={{ title: 'Invoice PDF', headerShown: false }}
      />
    </InvoicesStack.Navigator>
  );
}

export function AdminSupportStackNav() {
  return (
    <SupportStack.Navigator screenOptions={adminStackScreenOptions} initialRouteName="SupportDashboard">
      <SupportStack.Screen name="SupportDashboard" component={SupportDashboardScreen} options={{ title: 'Customer Support' }} />
      <SupportStack.Screen name="Tickets" component={SupportTicketsScreen} options={{ title: 'Support Tickets' }} />
      <SupportStack.Screen name="TicketDetail" component={SupportTicketDetailScreen} options={{ title: 'Ticket Detail' }} />
      <SupportStack.Screen name="CreateTicket" component={CreateTicketScreen} options={{ title: 'New Ticket' }} />
      <SupportStack.Screen name="LiveChat" component={LiveChatScreen} options={{ title: 'Live Chat' }} />
      <SupportStack.Screen name="ChatConversation" component={ChatConversationScreen} options={{ title: 'Conversation' }} />
      <SupportStack.Screen name="FaqList" component={FaqListScreen} options={{ title: 'FAQs' }} />
      <SupportStack.Screen name="FaqEditor" component={FaqEditorScreen} options={{ title: 'Edit FAQ' }} />
      <SupportStack.Screen name="FaqCategories" component={FaqCategoriesScreen} options={{ title: 'FAQ Categories' }} />
      <SupportStack.Screen name="CustomerSupportProfile" component={CustomerSupportProfileScreen} options={{ title: 'Customer 360' }} />
      <SupportStack.Screen name="Complaints" component={ComplaintsScreen} options={{ title: 'Complaints' }} />
      <SupportStack.Screen name="ComplaintDetail" component={ComplaintDetailScreen} options={{ title: 'Complaint' }} />
      <SupportStack.Screen name="SlaConfig" component={SlaConfigScreen} options={{ title: 'SLA Config' }} />
      <SupportStack.Screen name="CannedResponses" component={CannedResponsesScreen} options={{ title: 'Canned Responses' }} />
      <SupportStack.Screen name="SupportAnalytics" component={SupportAnalyticsScreen} options={{ title: 'Support Analytics' }} />
    </SupportStack.Navigator>
  );
}

export function AdminSettingsStackNav() {
  return (
    <SettingsStack.Navigator screenOptions={adminStackScreenOptions} initialRouteName="SettingsHub">
      <SettingsStack.Screen name="SettingsHub" component={SettingsHubScreen} options={{ title: 'Settings' }} />
      <SettingsStack.Screen
        name="AdminAccount"
        component={AdminAccountScreen}
        options={{ title: 'Admin Account' }}
      />
      <SettingsStack.Screen name="General" component={GeneralSettingsScreen} options={{ title: 'General' }} />
      <SettingsStack.Screen name="Security" component={SecurityScreen} options={{ title: 'Security' }} />
      <SettingsStack.Screen name="Officers" component={OfficersSettingsScreen} options={{ title: 'Officers' }} />
      <SettingsStack.Screen name="OfficerSalary" component={OfficerSalaryScreen} options={{ title: 'Officer Salary' }} />
      <SettingsStack.Screen name="Notifications" component={NotificationsSettingsScreen} options={{ title: 'Notifications' }} />
      <SettingsStack.Screen name="Integrations" component={IntegrationsSettingsScreen} options={{ title: 'Integrations' }} />
      <SettingsStack.Screen name="WhatsAppSettings" component={WhatsAppSettingsScreen} options={{ title: 'WhatsApp Integration' }} />
      <SettingsStack.Screen name="WhatsAppLogs" component={WhatsAppLogsScreen} options={{ title: 'WhatsApp Logs' }} />
      <SettingsStack.Screen name="GatewayConfig" component={GatewayConfigScreen} options={{ title: 'Payment gateways' }} />
      <SettingsStack.Screen name="Appearance" component={AppearanceSettingsScreen} options={{ title: 'Appearance' }} />
      <SettingsStack.Screen name="System" component={SystemSettingsScreen} options={{ title: 'System' }} />
      <SettingsStack.Screen name="BackupExport" component={BackupExportScreen} options={{ title: 'Backup & Export' }} />
      <SettingsStack.Screen name="AuditLogs" component={AuditLogsScreen} options={{ title: 'Audit Logs' }} />
    </SettingsStack.Navigator>
  );
}

export function AdminInventoryStackNav() {
  return (
    <InventoryStack.Navigator
      screenOptions={inventoryStackScreenOptions}
      initialRouteName="InventoryList"
    >
      <InventoryStack.Screen name="InventoryList" component={InventoryListScreen} options={{ title: 'Inventory' }} />
      <InventoryStack.Screen name="AssignmentRequests" component={AssignmentRequestsScreen} options={{ title: 'Assignment Requests' }} />
      <InventoryStack.Screen name="InventoryHistory" component={InventoryHistoryScreen} options={{ title: 'Inventory History' }} />
      <InventoryStack.Screen name="Categories" component={CategoriesScreen} options={{ title: 'Categories' }} />
      <InventoryStack.Screen name="BulkOperations" component={BulkOperationsScreen} options={{ title: 'Bulk Operations' }} />
      <InventoryStack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: 'Item Details' }} />
      <InventoryStack.Screen name="QuickAction" component={QuickActionScreen} options={{ title: 'Quick Action' }} />
      <InventoryStack.Screen name="AddItem" component={AddItemScreen} options={{ title: 'Add Inventory Item' }} />
      <InventoryStack.Screen name="EditItem" component={EditItemScreen} options={{ title: 'Edit Inventory Item' }} />
    </InventoryStack.Navigator>
  );
}

export {
  DashboardScreen,
  NotificationCenterScreen,
  ReportsScreen,
  RoleManagementScreen,
  AdminMapScreen,
  AdminSupportScreen,
  AdminAuditScreen,
};
