import { createDrawerNavigator } from '@react-navigation/drawer';

import { OfficerDashboardScreen } from '@/screens/officer/OfficerDashboardScreen';
import { OfficerMapScreen } from '@/screens/officer/OfficerMapScreen';
import { OfficerRequestsScreen } from '@/screens/officer/OfficerRequestsScreen';
import { OfficerShiftsScreen } from '@/screens/officer/OfficerShiftsScreen';
import { OfficerInventoryScreen } from '@/screens/officer/OfficerInventoryScreen';
import { OfficerLeaveScreen } from '@/screens/officer/OfficerLeaveScreen';
import { OfficerPayslipScreen } from '@/screens/officer/OfficerPayslipScreen';
import { ProfileScreen } from '@/screens/customer/ProfileScreen';
import { colors } from '@prime/ui';

const Drawer = createDrawerNavigator();

export function OfficerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primaryNavy },
        headerTintColor: colors.white,
        drawerActiveTintColor: colors.accentTeal,
      }}
    >
      <Drawer.Screen name="Dashboard" component={OfficerDashboardScreen} />
      <Drawer.Screen name="Requests" component={OfficerRequestsScreen} />
      <Drawer.Screen name="Map" component={OfficerMapScreen} />
      <Drawer.Screen name="Shifts" component={OfficerShiftsScreen} />
      <Drawer.Screen name="Inventory" component={OfficerInventoryScreen} />
      <Drawer.Screen name="Payslip" component={OfficerPayslipScreen} />
      <Drawer.Screen name="Leave" component={OfficerLeaveScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
    </Drawer.Navigator>
  );
}
