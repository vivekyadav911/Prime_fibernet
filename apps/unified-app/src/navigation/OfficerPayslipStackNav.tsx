import { createNativeStackNavigator } from '@react-navigation/native-stack';

import {
  OfficerPayslipDetailScreen,
  OfficerPayslipScreen,
} from '@/screens/officer/OfficerPayslipScreen';
import { PayslipPdfViewerScreen } from '@/screens/common/PayslipPdfViewerScreen';
import { colors, officerColors } from '@/theme/colors';
import type { OfficerPayslipStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<OfficerPayslipStackParamList>();

const OFFICER_HEADER = officerColors.navBar;

export function OfficerPayslipStackNav() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: OFFICER_HEADER },
        headerTintColor: colors.white,
      }}
    >
      <Stack.Screen
        name="PayslipList"
        component={OfficerPayslipScreen}
        options={{ title: 'My Payslips' }}
      />
      <Stack.Screen
        name="PayslipDetail"
        component={OfficerPayslipDetailScreen}
        options={{ title: 'Payslip' }}
      />
      <Stack.Screen
        name="PayslipPdfViewer"
        component={PayslipPdfViewerScreen}
        options={{ title: 'Payslip PDF', headerShown: false }}
      />
    </Stack.Navigator>
  );
}
