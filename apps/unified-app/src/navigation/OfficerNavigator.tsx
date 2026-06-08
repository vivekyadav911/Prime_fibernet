import { Platform, View, useWindowDimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { StatusChip } from '@/components/common';
import { ProfileScreen } from '@/screens/customer/profile/ProfileScreen';
import { ChatbotScreen } from '@/screens/customer/ChatbotScreen';
import { OfficerDashboardScreen } from '@/screens/officer/OfficerDashboardScreen';
import { OfficerInventoryScreen } from '@/screens/officer/OfficerInventoryScreen';
import { OfficerLeaveScreen } from '@/screens/officer/OfficerLeaveScreen';
import { OfficerMapScreen } from '@/screens/officer/OfficerMapScreen';
import { OfficerPayslipScreen } from '@/screens/officer/OfficerPayslipScreen';
import { OfficerRequestsScreen } from '@/screens/officer/OfficerRequestsScreen';
import { OfficerShiftsScreen } from '@/screens/officer/OfficerShiftsScreen';
import { useAppSelector } from '@/store/hooks';
import type { OfficerDrawerParamList, OfficerStackParamList } from '@/types/navigation';
import { colors } from '@prime/ui';

import { OfficerRequestDetailScreen } from './officerStackScreens';

const Drawer = createDrawerNavigator<OfficerDrawerParamList>();
const Stack = createNativeStackNavigator<OfficerStackParamList>();

function ShiftStatusHeader() {
  const shift = useAppSelector((s) => s.office.currentShift);
  if (!shift) return null;
  return (
    <View style={{ marginRight: 12 }}>
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
        component={OfficerShiftsScreen}
        options={{ title: 'Shifts', drawerLabel: 'Shifts' }}
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
 * Flutter `OfficerRootShell` (drawer + bottom tabs) + named `RequestDetailScreen.route`.
 * Location gate handled at app bootstrap; drawer maps Flutter attendance to Shifts.
 */
export function OfficerNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primaryNavy },
        headerTintColor: colors.white,
      }}
    >
      <Stack.Screen name="OfficerDrawer" component={OfficerDrawerNav} options={{ headerShown: false }} />
      <Stack.Screen
        name="RequestDetail"
        component={OfficerRequestDetailScreen}
        options={{ title: 'Request detail' }}
      />
    </Stack.Navigator>
  );
}
