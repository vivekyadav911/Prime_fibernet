import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackHeaderBackProps } from '@react-navigation/native-stack';

import { OfficerStackHeader } from '@/components/navigation/officer/OfficerStackHeader';
import { OfficerDashboardScreen } from '@/screens/officer/OfficerDashboardScreen';
import type { OfficerDashboardStackParamList } from '@/types/navigation';
import { colors, officerColors } from '@/theme/colors';

import { OfficerHeaderActions } from './officerHeaderActions';
import { OfficerStackHeaderLeft } from './OfficerStackHeaderLeft';

const Stack = createNativeStackNavigator<OfficerDashboardStackParamList>();

const OFFICER_HEADER_PURPLE = officerColors.navBar;

const stackScreenOptions = {
  header: OfficerStackHeader,
  headerStyle: { backgroundColor: OFFICER_HEADER_PURPLE },
  headerTintColor: colors.white,
  headerTitleStyle: { fontSize: 20, fontWeight: '600' as const },
  headerShadowVisible: false,
  headerBackVisible: false,
  headerLeft: (props: NativeStackHeaderBackProps) => <OfficerStackHeaderLeft {...props} />,
};

export function OfficerDashboardStackNav() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="DashboardHome"
        component={OfficerDashboardScreen}
        options={{
          title: 'Dashboard',
          headerLeft: () => null,
          headerRight: () => <OfficerHeaderActions showProfile />,
        }}
      />
    </Stack.Navigator>
  );
}
