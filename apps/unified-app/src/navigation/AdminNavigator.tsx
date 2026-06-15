import { Platform, useWindowDimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { AdminDrawerParamList, AdminStackParamList } from '@/types/navigation';
import { adminColors, getAdminDrawerWidth } from '@/theme/admin';
import { colors } from '@/theme/colors';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { AdminDrawerContent } from './AdminDrawerContent';
import { AdminDrawerToggleButton } from './AdminDrawerToggleButton';
import { AdminDrawerProfileButton } from './AdminDrawerProfileButton';
import {
  adminHeaderLeftContainerStyle,
  adminHeaderRightContainerStyle,
} from './AdminHeaderButton';
import {
  AdminAttendanceStackNav,
  AdminInventoryStackNav,
  AdminInvoicesStackNav,
  AdminOfficersStackNav,
  AdminPayrollStackNav,
  AdminPaymentsStackNav,
  AdminPlansStackNav,
  AdminNotificationsStackNav,
  AdminRequestsStackNav,
  AdminSettingsStackNav,
  AdminSupportStackNav,
  AdminTicketPortalStackNav,
  AdminUsersStackNav,
  DashboardScreen,
  ReportsScreen,
  RoleManagementScreen,
} from './adminStackNavigators';
import { MapNavigator } from './MapNavigator';

const Drawer = createDrawerNavigator<AdminDrawerParamList>();
const Stack = createNativeStackNavigator<AdminStackParamList>();

function AdminDrawerNav() {
  const { width } = useWindowDimensions();
  const isWebSidebar = Platform.OS === 'web' && width >= 1024;

  return (
    <ThemeProvider>
      <Drawer.Navigator
      drawerContent={(props) => <AdminDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.primaryNavy },
        headerTintColor: colors.white,
        drawerActiveTintColor: adminColors.primary,
        drawerType: isWebSidebar ? 'permanent' : 'front',
        drawerStyle: {
          width: getAdminDrawerWidth(width, isWebSidebar),
          backgroundColor: adminColors.sidebarBg,
        },
        overlayColor: isWebSidebar ? 'transparent' : undefined,
        headerLeft: isWebSidebar ? () => null : () => <AdminDrawerToggleButton />,
        headerRight: () => <AdminDrawerProfileButton />,
        headerLeftContainerStyle: adminHeaderLeftContainerStyle,
        headerRightContainerStyle: adminHeaderRightContainerStyle,
        swipeEnabled: !isWebSidebar,
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          headerStyle: { backgroundColor: '#5B4FE9' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontSize: 20, fontWeight: '600' },
          headerShadowVisible: false,
        }}
      />
      <Drawer.Screen name="Users" component={AdminUsersStackNav} options={{ headerShown: false, title: 'Users' }} />
      <Drawer.Screen name="Officers" component={AdminOfficersStackNav} options={{ headerShown: false, title: 'Officers' }} />
      <Drawer.Screen name="Attendance" component={AdminAttendanceStackNav} options={{ headerShown: false, title: 'Attendance' }} />
      <Drawer.Screen name="Payroll" component={AdminPayrollStackNav} options={{ headerShown: false, title: 'Payroll' }} />
      <Drawer.Screen name="RoleManagement" component={RoleManagementScreen} options={{ title: 'Role Management' }} />
      <Drawer.Screen name="Requests" component={AdminRequestsStackNav} options={{ headerShown: false, title: 'Requests' }} />
      <Drawer.Screen name="TicketPortal" component={AdminTicketPortalStackNav} options={{ headerShown: false, title: 'Ticket Portal' }} />
      <Drawer.Screen name="Plans" component={AdminPlansStackNav} options={{ headerShown: false, title: 'Plans' }} />
      <Drawer.Screen name="Notifications" component={AdminNotificationsStackNav} options={{ headerShown: false, title: 'Notifications' }} />
      <Drawer.Screen name="Payments" component={AdminPaymentsStackNav} options={{ headerShown: false, title: 'Payments' }} />
      <Drawer.Screen name="Invoices" component={AdminInvoicesStackNav} options={{ headerShown: false, title: 'Invoices' }} />
      <Drawer.Screen name="Inventory" component={AdminInventoryStackNav} options={{ headerShown: false, title: 'Inventory' }} />
      <Drawer.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
      <Drawer.Screen name="Support" component={AdminSupportStackNav} options={{ headerShown: false, title: 'Customer Support' }} />
      <Drawer.Screen name="Settings" component={AdminSettingsStackNav} options={{ headerShown: false, title: 'Settings' }} />
      <Drawer.Screen name="Map" component={MapNavigator} options={{ headerShown: false, title: 'Map' }} />
    </Drawer.Navigator>
    </ThemeProvider>
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
    </Stack.Navigator>
  );
}
