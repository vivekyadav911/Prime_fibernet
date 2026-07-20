import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackHeaderBackProps } from '@react-navigation/native-stack';

import { OfficerStackHeader } from '@/components/navigation/officer/OfficerStackHeader';
import { OfficerInventoryScreen } from '@/screens/officer/OfficerInventoryScreen';
import { OfficerMapScreen } from '@/screens/officer/OfficerMapScreen';
import { OfficerSettingsScreen } from '@/screens/officer/OfficerSettingsScreen';
import { OfficerSupportChatScreen } from '@/screens/officer/support/OfficerSupportChatScreen';
import type { OfficerSettingsStackParamList } from '@/types/navigation';
import { colors, officerColors } from '@/theme/colors';

import { OfficerHeaderActions } from './officerHeaderActions';
import { OfficerLeaveStackNav, OfficerNotificationsStackNav } from './officerStackNavigators';
import { OfficerPayslipStackNav } from './OfficerPayslipStackNav';
import { OfficerStackHeaderLeft } from './OfficerStackHeaderLeft';

const Stack = createNativeStackNavigator<OfficerSettingsStackParamList>();

const OFFICER_HEADER_PURPLE = officerColors.navBar;

const stackScreenOptions = {
  header: OfficerStackHeader,
  headerStyle: { backgroundColor: OFFICER_HEADER_PURPLE },
  headerTintColor: colors.white,
  headerTitleStyle: { fontSize: 20, fontWeight: '600' as const },
  headerShadowVisible: false,
  headerBackVisible: false,
  headerLeft: (props: NativeStackHeaderBackProps) => <OfficerStackHeaderLeft {...props} />,
  headerRight: () => <OfficerHeaderActions />,
};

export function OfficerSettingsStackNav() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="SettingsHome"
        component={OfficerSettingsScreen}
        options={{
          title: 'Settings',
          headerLeft: () => null,
          headerRight: () => <OfficerHeaderActions showProfile />,
        }}
      />
      <Stack.Screen name="Map" component={OfficerMapScreen} options={{ title: 'Map' }} />
      <Stack.Screen name="Inventory" component={OfficerInventoryScreen} options={{ title: 'Inventory' }} />
      <Stack.Screen name="Support" component={OfficerSupportChatScreen} options={{ title: 'Support Chat' }} />
      <Stack.Screen
        name="NotificationsStack"
        component={OfficerNotificationsStackNav}
        options={{ title: 'Notifications', headerShown: false }}
      />
      <Stack.Screen
        name="LeaveStack"
        component={OfficerLeaveStackNav}
        options={{ title: 'Leave', headerShown: false }}
      />
      <Stack.Screen
        name="Payslip"
        component={OfficerPayslipStackNav}
        options={{ title: 'My Payslips', headerShown: false }}
      />
    </Stack.Navigator>
  );
}
