import { Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackHeaderBackProps } from '@react-navigation/native-stack';

import { DashboardScreen } from '@/screens/admin/DashboardScreen';
import { InventoryScreen } from '@/screens/admin/assets/inventory/InventoryScreen';
import { AssignmentRequestsScreen } from '@/screens/admin/assets/inventory/AssignmentRequestsScreen';
import { BulkOperationsScreen } from '@/screens/admin/assets/inventory/BulkOperationsScreen';
import { CategoriesScreen } from '@/screens/admin/assets/inventory/CategoriesScreen';
import { InventoryHistoryScreen } from '@/screens/admin/assets/inventory/InventoryHistoryScreen';
import { InvoiceHistoryScreen } from '@/screens/admin/finance/invoices/InvoiceHistoryScreen';
import { InvoiceListScreen } from '@/screens/admin/finance/invoices/InvoiceListScreen';
import { ManualGSTInvoiceScreen } from '@/screens/admin/finance/invoices/ManualGSTInvoiceScreen';
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
import { ShiftManagementScreen } from '@/screens/admin/hr/ShiftManagementScreen';
import { RoleManagementScreen } from '@/screens/admin/hr/RoleManagementScreen';
import { PayrollScreen } from '@/screens/admin/hr/payroll/PayrollScreen';
import { PayslipsManagementScreen } from '@/screens/admin/hr/payroll/PayslipsManagementScreen';
import { NotificationCenterScreen } from '@/screens/admin/notifications/NotificationCenterScreen';
import { AddOfficerScreen } from '@/screens/admin/officers/AddOfficerScreen';
import { EditOfficerScreen } from '@/screens/admin/officers/EditOfficerScreen';
import { OfficerDetailScreen } from '@/screens/admin/officers/OfficerDetailScreen';
import { OfficerListScreen } from '@/screens/admin/officers/OfficerListScreen';
import { PlanFormScreen } from '@/screens/admin/plans/PlanFormScreen';
import { PlanListScreen } from '@/screens/admin/plans/PlanListScreen';
import { RequestDetailScreen } from '@/screens/admin/requests/RequestDetailScreen';
import { RequestsScreen } from '@/screens/admin/requests/RequestsScreen';
import { RequestListScreen } from '@/screens/admin/requests/RequestListScreen';
import { ReportsScreen } from '@/screens/admin/ReportsScreen';
import { AdminMapScreen } from '@/screens/admin/system/MapScreen';
import { AdminSettingsScreenFull } from '@/screens/admin/system/SettingsScreen';
import { AdminSupportScreen } from '@/screens/admin/system/SupportScreen';
import { AddUserScreen } from '@/screens/admin/users/AddUserScreen';
import { UserDetailScreen } from '@/screens/admin/users/UserDetailScreen';
import { UserEditScreen } from '@/screens/admin/users/UserEditScreen';
import { UserListScreen } from '@/screens/admin/users/UserListScreen';
import { AdminAuditScreen } from '@/screens/admin/AdminAuditScreen';
import { AdminPaymentsScreen } from '@/screens/admin/AdminPaymentsScreen';
import type {
  AdminAttendanceStackParamList,
  AdminInventoryStackParamList,
  AdminInvoicesStackParamList,
  AdminOfficersStackParamList,
  AdminPayrollStackParamList,
  AdminPaymentsStackParamList,
  AdminPlansStackParamList,
  AdminRequestsStackParamList,
  AdminUsersStackParamList,
} from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';

import { AdminDrawerHeaderLeft } from './AdminDrawerHeaderLeft';

const UsersStack = createNativeStackNavigator<AdminUsersStackParamList>();
const OfficersStack = createNativeStackNavigator<AdminOfficersStackParamList>();
const AttendanceStack = createNativeStackNavigator<AdminAttendanceStackParamList>();
const PayrollStack = createNativeStackNavigator<AdminPayrollStackParamList>();
const RequestsStack = createNativeStackNavigator<AdminRequestsStackParamList>();
const PlansStack = createNativeStackNavigator<AdminPlansStackParamList>();
const PaymentsStack = createNativeStackNavigator<AdminPaymentsStackParamList>();
const InvoicesStack = createNativeStackNavigator<AdminInvoicesStackParamList>();
const InventoryStack = createNativeStackNavigator<AdminInventoryStackParamList>();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.primaryNavy },
  headerTintColor: colors.white,
  headerLeft: (props: NativeStackHeaderBackProps) => <AdminDrawerHeaderLeft {...props} />,
};

const usersStackScreenOptions = {
  headerStyle: { backgroundColor: adminColors.cardBg },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontWeight: '700' as const },
  headerShadowVisible: true,
  headerLeft: (props: NativeStackHeaderBackProps) => <AdminDrawerHeaderLeft {...props} />,
};

export function AdminUsersStackNav() {
  return (
    <UsersStack.Navigator screenOptions={usersStackScreenOptions}>
      <UsersStack.Screen
        name="UserList"
        component={UserListScreen}
        options={{ title: 'Users', headerRight: () => <Text style={{ fontSize: 18 }}>👤</Text> }}
      />
      <UsersStack.Screen name="UserDetail" component={UserDetailScreen} options={{ title: 'User profile' }} />
      <UsersStack.Screen name="UserEdit" component={UserEditScreen} options={{ title: 'Edit user' }} />
      <UsersStack.Screen
        name="AddUser"
        component={AddUserScreen}
        options={{
          title: 'Add New User',
          headerStyle: { backgroundColor: adminColors.primary },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: '700', color: colors.white },
        }}
      />
    </UsersStack.Navigator>
  );
}

export function AdminOfficersStackNav() {
  return (
    <OfficersStack.Navigator screenOptions={stackScreenOptions}>
      <OfficersStack.Screen name="OfficerList" component={OfficerListScreen} options={{ title: 'Officers' }} />
      <OfficersStack.Screen name="OfficerDetail" component={OfficerDetailScreen} options={{ headerShown: false }} />
      <OfficersStack.Screen name="OfficerEdit" component={EditOfficerScreen} options={{ title: 'Edit officer' }} />
      <OfficersStack.Screen name="AddOfficer" component={AddOfficerScreen} options={{ title: 'Add officer' }} />
    </OfficersStack.Navigator>
  );
}

export function AdminAttendanceStackNav() {
  return (
    <AttendanceStack.Navigator
      screenOptions={stackScreenOptions}
      initialRouteName="LiveAttendance"
    >
      <AttendanceStack.Screen name="LiveAttendance" component={LiveAttendanceScreen} options={{ title: 'Live attendance' }} />
      <AttendanceStack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Attendance hub' }} />
      <AttendanceStack.Screen name="GeofenceManagement" component={GeofenceManagementScreen} options={{ title: 'Geofences' }} />
      <AttendanceStack.Screen name="CreateGeofence" component={CreateGeofenceScreen} options={{ title: 'Geofence', presentation: 'modal' }} />
      <AttendanceStack.Screen name="AssignGeofence" component={AssignGeofenceScreen} options={{ title: 'Assign officers', presentation: 'modal' }} />
      <AttendanceStack.Screen name="ApprovalRequests" component={ApprovalRequestsScreen} options={{ title: 'Approval requests' }} />
      <AttendanceStack.Screen name="CheckInExceptions" component={CheckInExceptionsScreen} options={{ title: 'Check-in exceptions' }} />
      <AttendanceStack.Screen name="AttendanceRecords" component={AttendanceRecordsScreen} options={{ title: 'Attendance records' }} />
      <AttendanceStack.Screen name="ShiftManagement" component={ShiftManagementScreen} options={{ title: 'Shift management' }} />
      <AttendanceStack.Screen name="LeaveManagement" component={LeaveManagementScreen} options={{ title: 'Leave management' }} />
      <AttendanceStack.Screen name="AttendanceReports" component={AttendanceReportsScreen} options={{ title: 'Attendance reports' }} />
      <AttendanceStack.Screen name="CompletedShifts" component={CompletedShiftsScreen} options={{ title: 'Completed shifts' }} />
    </AttendanceStack.Navigator>
  );
}

export function AdminPayrollStackNav() {
  return (
    <PayrollStack.Navigator screenOptions={stackScreenOptions}>
      <PayrollStack.Screen name="Payroll" component={PayrollScreen} options={{ title: 'Payroll' }} />
      <PayrollStack.Screen name="PayslipsManagement" component={PayslipsManagementScreen} options={{ title: 'Payslips' }} />
    </PayrollStack.Navigator>
  );
}

export function AdminRequestsStackNav() {
  return (
    <RequestsStack.Navigator screenOptions={stackScreenOptions}>
      <RequestsStack.Screen name="RequestList" component={RequestsScreen} options={{ title: 'Requests' }} />
    </RequestsStack.Navigator>
  );
}

export function AdminTicketPortalStackNav() {
  return (
    <RequestsStack.Navigator screenOptions={stackScreenOptions}>
      <RequestsStack.Screen name="RequestList" component={RequestListScreen} options={{ title: 'Ticket portal' }} />
      <RequestsStack.Screen name="RequestDetail" component={RequestDetailScreen} options={{ title: 'Ticket detail' }} />
    </RequestsStack.Navigator>
  );
}

export function AdminPlansStackNav() {
  return (
    <PlansStack.Navigator screenOptions={stackScreenOptions}>
      <PlansStack.Screen name="PlanList" component={PlanListScreen} options={{ title: 'Plans' }} />
      <PlansStack.Screen name="PlanForm" component={PlanFormScreen} options={{ title: 'Plan form' }} />
    </PlansStack.Navigator>
  );
}

export function AdminPaymentsStackNav() {
  return (
    <PaymentsStack.Navigator screenOptions={stackScreenOptions}>
      <PaymentsStack.Screen name="PaymentList" component={AdminPaymentsScreen} options={{ title: 'Payments' }} />
    </PaymentsStack.Navigator>
  );
}

export function AdminInvoicesStackNav() {
  return (
    <InvoicesStack.Navigator screenOptions={stackScreenOptions}>
      <InvoicesStack.Screen name="InvoiceList" component={InvoiceListScreen} options={{ title: 'Invoices' }} />
      <InvoicesStack.Screen name="InvoiceHistory" component={InvoiceHistoryScreen} options={{ title: 'Invoice history' }} />
      <InvoicesStack.Screen name="ManualGstInvoice" component={ManualGSTInvoiceScreen} options={{ title: 'Manual GST invoice' }} />
    </InvoicesStack.Navigator>
  );
}

export function AdminInventoryStackNav() {
  return (
    <InventoryStack.Navigator screenOptions={stackScreenOptions}>
      <InventoryStack.Screen name="InventoryList" component={InventoryScreen} options={{ title: 'Inventory' }} />
      <InventoryStack.Screen name="AssignmentRequests" component={AssignmentRequestsScreen} options={{ title: 'Assignment requests' }} />
      <InventoryStack.Screen name="InventoryHistory" component={InventoryHistoryScreen} options={{ title: 'Inventory history' }} />
      <InventoryStack.Screen name="Categories" component={CategoriesScreen} options={{ title: 'Categories' }} />
      <InventoryStack.Screen name="BulkOperations" component={BulkOperationsScreen} options={{ title: 'Bulk operations' }} />
    </InventoryStack.Navigator>
  );
}

export { DashboardScreen, NotificationCenterScreen, ReportsScreen, RoleManagementScreen, AdminSettingsScreenFull as AdminSettingsScreen, AdminMapScreen, AdminSupportScreen, AdminAuditScreen };
