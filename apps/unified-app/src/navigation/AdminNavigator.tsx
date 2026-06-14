import { Platform, useWindowDimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AdminPaymentDetailScreen } from '@/screens/admin/AdminPaymentDetailScreen';
import type { AdminDrawerParamList, AdminStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';

import { AdminDrawerContent } from './AdminDrawerContent';
import { AdminDrawerToggleButton } from './AdminDrawerToggleButton';
import {
  AdminAttendanceStackNav,
  AdminAuditScreen,
  AdminInventoryStackNav,
  AdminInvoicesStackNav,
  AdminMapScreen,
  AdminOfficersStackNav,
  AdminPayrollStackNav,
  AdminPaymentsStackNav,
  AdminPlansStackNav,
  AdminRequestsStackNav,
  AdminSettingsScreen,
  AdminSupportScreen,
  AdminTicketPortalStackNav,
  AdminUsersStackNav,
  DashboardScreen,
  NotificationCenterScreen,
  ReportsScreen,
  RoleManagementScreen,
} from './adminStackNavigators';

const Drawer = createDrawerNavigator<AdminDrawerParamList>();
const Stack = createNativeStackNavigator<AdminStackParamList>();

function AdminDrawerNav() {
  const { width } = useWindowDimensions();
  const isWebSidebar = Platform.OS === 'web' && width >= 1024;

  return (
    <Drawer.Navigator
      drawerContent={(props) => <AdminDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.primaryNavy },
        headerTintColor: colors.white,
        drawerActiveTintColor: adminColors.primary,
        drawerType: isWebSidebar ? 'permanent' : 'front',
        drawerStyle: isWebSidebar ? { width: 280, backgroundColor: adminColors.sidebarBg } : { backgroundColor: adminColors.sidebarBg },
        overlayColor: isWebSidebar ? 'transparent' : undefined,
        headerLeft: isWebSidebar ? () => null : () => <AdminDrawerToggleButton />,
        swipeEnabled: !isWebSidebar,
      }}
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Drawer.Screen name="Users" component={AdminUsersStackNav} options={{ headerShown: false, title: 'Users' }} />
      <Drawer.Screen name="Officers" component={AdminOfficersStackNav} options={{ headerShown: false, title: 'Officers' }} />
      <Drawer.Screen name="Attendance" component={AdminAttendanceStackNav} options={{ headerShown: false, title: 'Attendance' }} />
      <Drawer.Screen name="Payroll" component={AdminPayrollStackNav} options={{ headerShown: false, title: 'Payroll' }} />
      <Drawer.Screen name="RoleManagement" component={RoleManagementScreen} options={{ title: 'Role Management' }} />
      <Drawer.Screen name="Requests" component={AdminRequestsStackNav} options={{ headerShown: false, title: 'Requests' }} />
      <Drawer.Screen name="TicketPortal" component={AdminTicketPortalStackNav} options={{ headerShown: false, title: 'Ticket Portal' }} />
      <Drawer.Screen name="Plans" component={AdminPlansStackNav} options={{ headerShown: false, title: 'Plans' }} />
      <Drawer.Screen name="Notifications" component={NotificationCenterScreen} options={{ title: 'Notifications' }} />
      <Drawer.Screen name="Payments" component={AdminPaymentsStackNav} options={{ headerShown: false, title: 'Payments' }} />
      <Drawer.Screen name="Invoices" component={AdminInvoicesStackNav} options={{ headerShown: false, title: 'Invoices' }} />
      <Drawer.Screen name="Inventory" component={AdminInventoryStackNav} options={{ headerShown: false, title: 'Inventory' }} />
      <Drawer.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
      <Drawer.Screen name="Audit" component={AdminAuditScreen} options={{ title: 'Audit Logs' }} />
      <Drawer.Screen name="Support" component={AdminSupportScreen} options={{ title: 'Support' }} />
      <Drawer.Screen name="Settings" component={AdminSettingsScreen} options={{ title: 'Settings' }} />
      <Drawer.Screen name="Map" component={AdminMapScreen} options={{ title: 'Map' }} />
    </Drawer.Navigator>
  );
}

export function AdminNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primaryNavy },
        headerTintColor: colors.white,
      }}
    >
      <Stack.Screen name="AdminDrawer" component={AdminDrawerNav} options={{ headerShown: false }} />
      <Stack.Screen
        name="PaymentDetail"
        component={AdminPaymentDetailScreen}
        options={{ title: 'Payment invoice' }}
      />
    </Stack.Navigator>
  );
}
