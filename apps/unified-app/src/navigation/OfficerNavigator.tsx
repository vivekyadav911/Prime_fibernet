import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { OfficerProfileStackNav } from './officerStackNavigators';
import { OfficerTabNavigator } from './OfficerTabNavigator';
import { OfficerStackHeaderLeft } from './OfficerStackHeaderLeft';
import { LocationGateScreen } from '@/screens/officer/LocationGateScreen';
import type { OfficerStackParamList } from '@/types/navigation';
import { colors, officerColors } from '@/theme/colors';

import { OfficerRequestDetailScreen } from './officerStackScreens';

const Stack = createNativeStackNavigator<OfficerStackParamList>();

const OFFICER_HEADER_PURPLE = officerColors.navBar;

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
      <Stack.Screen name="OfficerTabs" component={OfficerTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={OfficerProfileStackNav} options={{ headerShown: false }} />
      <Stack.Screen
        name="RequestDetail"
        component={OfficerRequestDetailScreen}
        options={{
          title: 'Ticket detail',
          headerLeft: (props) => <OfficerStackHeaderLeft {...props} />,
        }}
      />
    </Stack.Navigator>
  );
}
