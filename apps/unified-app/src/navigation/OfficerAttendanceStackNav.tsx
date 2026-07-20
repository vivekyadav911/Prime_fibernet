import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackHeaderBackProps } from '@react-navigation/native-stack';

import { OfficerStackHeader } from '@/components/navigation/officer/OfficerStackHeader';
import { AttendanceHistoryScreen } from '@/screens/officer/AttendanceHistoryScreen';
import { OfficerAttendanceDashboard } from '@/screens/officer/OfficerAttendanceDashboard';
import type { OfficerAttendanceStackParamList } from '@/types/navigation';
import { colors, officerColors } from '@/theme/colors';

import { OfficerHeaderActions } from './officerHeaderActions';
import { OfficerStackHeaderLeft } from './OfficerStackHeaderLeft';

const Stack = createNativeStackNavigator<OfficerAttendanceStackParamList>();

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

export function OfficerAttendanceStackNav() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="AttendanceHome"
        component={OfficerAttendanceDashboard}
        options={{ title: 'Attendance', headerLeft: () => null }}
      />
      <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} options={{ title: 'History' }} />
      <Stack.Screen
        name="Shifts"
        component={OfficerAttendanceDashboard}
        options={{ title: 'Attendance', headerLeft: () => null }}
      />
    </Stack.Navigator>
  );
}
