import { Platform, useWindowDimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { OfficerDrawerContent, ShiftPulseChip } from '@/components/navigation/officer';
import { OfficerSupportChatScreen } from '@/screens/officer/support/OfficerSupportChatScreen';
import { CollectPaymentScreen } from '@/screens/officer/CollectPaymentScreen';
import { InvoiceScreen } from '@/screens/officer/InvoiceScreen';
import { LocationGateScreen } from '@/screens/officer/LocationGateScreen';
import { OfficerDashboardScreen } from '@/screens/officer/OfficerDashboardScreen';
import { OfficerInventoryScreen } from '@/screens/officer/OfficerInventoryScreen';
import { OfficerLeaveScreen } from '@/screens/officer/OfficerLeaveScreen';
import { OfficerMapScreen } from '@/screens/officer/OfficerMapScreen';
import { OfficerPayslipScreen } from '@/screens/officer/OfficerPayslipScreen';
import { OfficerAttendanceDashboard } from '@/screens/officer/OfficerAttendanceDashboard';
import { AttendanceHistoryScreen } from '@/screens/officer/AttendanceHistoryScreen';
import type { OfficerDrawerParamList, OfficerStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';

import { OfficerCollectionsStackNav, OfficerLeaveStackNav, OfficerProfileStackNav, OfficerRequestsStackNav } from './officerStackNavigators';
import { OfficerRequestDetailScreen } from './officerStackScreens';

const Drawer = createDrawerNavigator<OfficerDrawerParamList>();
const Stack = createNativeStackNavigator<OfficerStackParamList>();

function OfficerDrawerNav() {
  const { width } = useWindowDimensions();
  const isWebSidebar = Platform.OS === 'web' && width >= 900;

  return (
    <Drawer.Navigator
      drawerContent={(props) => <OfficerDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.primaryNavy },
        headerTintColor: colors.white,
        drawerType: isWebSidebar ? 'permanent' : 'front',
        drawerStyle: isWebSidebar ? { width: 280 } : { width: 280 },
        headerRight: () => <ShiftPulseChip />,
        drawerItemStyle: { display: 'none' },
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={OfficerDashboardScreen}
        options={{ title: 'Home' }}
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
        name="Invoice"
        component={InvoiceScreen}
        options={{ title: 'Invoice' }}
      />
      <Drawer.Screen name="Inventory" component={OfficerInventoryScreen} options={{ title: 'Inventory' }} />
      <Drawer.Screen
        name="Payslip"
        component={OfficerPayslipScreen}
        options={{ title: 'My Payslip' }}
      />
      <Drawer.Screen
        name="LeaveStack"
        component={OfficerLeaveStackNav}
        options={{ title: 'Leave', headerShown: false }}
      />
      <Drawer.Screen
        name="Support"
        component={OfficerSupportChatScreen}
        options={{ title: 'Support Chat' }}
      />
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
        headerStyle: { backgroundColor: colors.primaryNavy },
        headerTintColor: colors.white,
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
