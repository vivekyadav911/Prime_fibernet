import { Platform, useWindowDimensions, View } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { OfficerDrawerContent, ShiftPulseChip } from '@/components/navigation/officer';
import { usePortalNotificationsSync } from '@/hooks/usePortalNotificationsSync';
import { OfficerSupportChatScreen } from '@/screens/officer/support/OfficerSupportChatScreen';
import { CollectPaymentScreen } from '@/screens/officer/CollectPaymentScreen';
import { InvoiceScreen } from '@/screens/officer/InvoiceScreen';
import { LocationGateScreen } from '@/screens/officer/LocationGateScreen';
import { OfficerDashboardScreen } from '@/screens/officer/OfficerDashboardScreen';
import { OfficerInventoryScreen } from '@/screens/officer/OfficerInventoryScreen';
import { OfficerMapScreen } from '@/screens/officer/OfficerMapScreen';
import { OfficerPayslipStackNav } from './OfficerPayslipStackNav';
import { OfficerAttendanceDashboard } from '@/screens/officer/OfficerAttendanceDashboard';
import { AttendanceHistoryScreen } from '@/screens/officer/AttendanceHistoryScreen';
import type { OfficerDrawerParamList, OfficerStackParamList } from '@/types/navigation';
import { adminColors, getAdminDrawerWidth } from '@/theme/admin';
import { colors, officerColors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { AdminDrawerToggleButton } from './AdminDrawerToggleButton';
import {
  DrawerHeaderRight,
  OfficerCollectionsStackNav,
  OfficerLeaveStackNav,
  OfficerNotificationsStackNav,
  OfficerProfileStackNav,
  OfficerRequestsStackNav,
} from './officerStackNavigators';
import { OfficerRequestDetailScreen } from './officerStackScreens';

const Drawer = createDrawerNavigator<OfficerDrawerParamList>();
const Stack = createNativeStackNavigator<OfficerStackParamList>();

const OFFICER_HEADER_PURPLE = officerColors.navBar;

function DrawerHeaderActions() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <DrawerHeaderRight />
      <ShiftPulseChip />
    </View>
  );
}

function OfficerDrawerNav() {
  usePortalNotificationsSync();

  const { width } = useWindowDimensions();
  const isWebSidebar = Platform.OS === 'web' && width >= 1024;

  return (
    <ThemeProvider>
      <Drawer.Navigator
        drawerContent={(props) => <OfficerDrawerContent {...props} />}
        screenOptions={{
          headerStyle: { backgroundColor: OFFICER_HEADER_PURPLE },
          headerTintColor: colors.white,
          headerTitleStyle: { fontSize: 20, fontWeight: '600' },
          headerShadowVisible: false,
          drawerActiveTintColor: adminColors.primary,
          drawerType: isWebSidebar ? 'permanent' : 'front',
          drawerStyle: {
            width: getAdminDrawerWidth(width, isWebSidebar),
            backgroundColor: adminColors.sidebarBg,
          },
          overlayColor: isWebSidebar ? 'transparent' : undefined,
          headerLeft: isWebSidebar ? () => null : () => <AdminDrawerToggleButton />,
          headerRight: () => <DrawerHeaderActions />,
          swipeEnabled: !isWebSidebar,
          drawerItemStyle: { display: 'none' },
        }}
      >
        <Drawer.Screen
          name="Dashboard"
          component={OfficerDashboardScreen}
          options={{ title: 'Dashboard' }}
        />
        <Drawer.Screen
          name="RequestsStack"
          component={OfficerRequestsStackNav}
          options={{ title: 'My Requests', headerShown: false }}
        />
        <Drawer.Screen name="Map" component={OfficerMapScreen} options={{ title: 'Map' }} />
        <Drawer.Screen
          name="Attendance"
          component={OfficerAttendanceDashboard}
          options={{ title: 'Attendance' }}
        />
        <Drawer.Screen
          name="CollectionsStack"
          component={OfficerCollectionsStackNav}
          options={{ title: 'Collections', headerShown: false }}
        />
        <Drawer.Screen
          name="NotificationsStack"
          component={OfficerNotificationsStackNav}
          options={{ title: 'Notifications', headerShown: false }}
        />
        <Drawer.Screen name="Invoice" component={InvoiceScreen} options={{ title: 'Invoice' }} />
        <Drawer.Screen name="Inventory" component={OfficerInventoryScreen} options={{ title: 'Inventory' }} />
        <Drawer.Screen
          name="Payslip"
          component={OfficerPayslipStackNav}
          options={{ title: 'My Payslips', headerShown: false }}
        />
        <Drawer.Screen
          name="LeaveStack"
          component={OfficerLeaveStackNav}
          options={{ title: 'Leave', headerShown: false }}
        />
        <Drawer.Screen name="Support" component={OfficerSupportChatScreen} options={{ title: 'Support Chat' }} />
        <Drawer.Screen
          name="ProfileStack"
          component={OfficerProfileStackNav}
          options={{ title: 'Profile', headerShown: false }}
        />
        {/* Hidden legacy routes */}
        <Drawer.Screen name="Shifts" component={OfficerAttendanceDashboard} options={{ drawerItemStyle: { display: 'none' }, title: 'Attendance' }} />
        <Drawer.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} options={{ drawerItemStyle: { display: 'none' }, title: 'History' }} />
        <Drawer.Screen name="CollectPayment" component={CollectPaymentScreen} options={{ drawerItemStyle: { display: 'none' }, title: 'Collect payment' }} />
      </Drawer.Navigator>
    </ThemeProvider>
  );
}

/**
 * Flutter `OfficerRootShell` — LocationGate gates access until GPS is enabled.
 */
export function OfficerNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="LocationGate"
      screenOptions={{
        headerStyle: { backgroundColor: OFFICER_HEADER_PURPLE },
        headerTintColor: colors.white,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="LocationGate" component={LocationGateScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OfficerDrawer" component={OfficerDrawerNav} options={{ headerShown: false }} />
      <Stack.Screen
        name="RequestDetail"
        component={OfficerRequestDetailScreen}
        options={{ title: 'Request detail' }}
      />
    </Stack.Navigator>
  );
}
