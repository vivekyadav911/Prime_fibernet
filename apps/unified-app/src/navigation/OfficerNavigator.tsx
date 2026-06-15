import { Platform, View, useWindowDimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { StatusChip } from '@/components/common';
import { ProfileScreen } from '@/screens/customer/profile/ProfileScreen';
import { ChatbotScreen } from '@/screens/customer/ChatbotScreen';
import { CollectPaymentScreen } from '@/screens/officer/CollectPaymentScreen';
import {
  CashCollectionScreen,
  OfficerCollectionHistoryScreen,
  OfficerCollectionScreen,
} from '@/screens/officer/payments';
import { InvoiceScreen } from '@/screens/officer/InvoiceScreen';
import { LocationGateScreen } from '@/screens/officer/LocationGateScreen';
import { OfficerDashboardScreen } from '@/screens/officer/OfficerDashboardScreen';
import { OfficerInventoryScreen } from '@/screens/officer/OfficerInventoryScreen';
import { OfficerLeaveScreen } from '@/screens/officer/OfficerLeaveScreen';
import { OfficerMapScreen } from '@/screens/officer/OfficerMapScreen';
import { OfficerPayslipScreen } from '@/screens/officer/OfficerPayslipScreen';
import { OfficerRequestsScreen } from '@/screens/officer/OfficerRequestsScreen';
import { OfficerAttendanceDashboard } from '@/screens/officer/OfficerAttendanceDashboard';
import { AttendanceHistoryScreen } from '@/screens/officer/AttendanceHistoryScreen';
import { useAppSelector } from '@/store/hooks';
import type { OfficerDrawerParamList, OfficerStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { OfficerRequestDetailScreen } from './officerStackScreens';

const Drawer = createDrawerNavigator<OfficerDrawerParamList>();
const Stack = createNativeStackNavigator<OfficerStackParamList>();

function ShiftStatusHeader() {
  const shift = useAppSelector((s) => s.office.currentShift);
  if (!shift) return null;
  return (
    <View style={{ marginRight: spacing.sm }}>
      <StatusChip status={shift.status} />
    </View>
  );
}

function OfficerDrawerNav() {
  const { width } = useWindowDimensions();
  const isWebSidebar = Platform.OS === 'web' && width >= 900;

  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primaryNavy },
        headerTintColor: colors.white,
        drawerActiveTintColor: colors.accentTeal,
        drawerType: isWebSidebar ? 'permanent' : 'front',
        drawerStyle: isWebSidebar ? { width: 280 } : undefined,
        headerRight: () => <ShiftStatusHeader />,
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={OfficerDashboardScreen}
        options={{ title: 'Home', drawerLabel: 'Dashboard' }}
      />
      <Drawer.Screen
        name="Requests"
        component={OfficerRequestsScreen}
        options={{ title: 'My requests', drawerLabel: 'My Requests' }}
      />
      <Drawer.Screen name="Map" component={OfficerMapScreen} />
      <Drawer.Screen
        name="Shifts"
        component={OfficerAttendanceDashboard}
        options={{ title: 'Attendance', drawerLabel: 'Attendance' }}
      />
      <Drawer.Screen
        name="AttendanceHistory"
        component={AttendanceHistoryScreen}
        options={{ title: 'Attendance history', drawerLabel: 'History' }}
      />
      <Drawer.Screen
        name="OfficerCollections"
        component={OfficerCollectionScreen}
        options={{ title: 'Collections', drawerLabel: 'Collections' }}
      />
      <Drawer.Screen
        name="CashCollection"
        component={CashCollectionScreen}
        options={{ title: 'Collect cash', drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen
        name="CollectionHistory"
        component={OfficerCollectionHistoryScreen}
        options={{ title: 'Collection history', drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen
        name="CollectPayment"
        component={CollectPaymentScreen}
        options={{ title: 'Collect payment (legacy)', drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen
        name="Invoice"
        component={InvoiceScreen}
        options={{ title: 'Invoice', drawerLabel: 'Invoice' }}
      />
      <Drawer.Screen name="Inventory" component={OfficerInventoryScreen} />
      <Drawer.Screen
        name="Payslip"
        component={OfficerPayslipScreen}
        options={{ title: 'My Payslip', drawerLabel: 'My Payslip' }}
      />
      <Drawer.Screen
        name="Leave"
        component={OfficerLeaveScreen}
        options={{ title: 'Leave Requests', drawerLabel: 'Leave Requests' }}
      />
      <Drawer.Screen
        name="Support"
        component={ChatbotScreen}
        options={{ title: 'Support', drawerLabel: 'Support' }}
      />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
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
