import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackHeaderBackProps } from '@react-navigation/native-stack';

import { OfficerStackHeader } from '@/components/navigation/officer/OfficerStackHeader';
import {
  OfficerPayslipDetailScreen,
  OfficerPayslipScreen,
} from '@/screens/officer/OfficerPayslipScreen';
import { PayslipPdfViewerScreen } from '@/screens/common/PayslipPdfViewerScreen';
import { colors, officerColors } from '@/theme/colors';
import type { OfficerPayslipStackParamList } from '@/types/navigation';

import { OfficerHeaderActions } from './officerHeaderActions';
import { OfficerStackHeaderLeft } from '@/navigation/OfficerStackHeaderLeft';

const Stack = createNativeStackNavigator<OfficerPayslipStackParamList>();

const OFFICER_HEADER = officerColors.navBar;

export function OfficerPayslipStackNav() {
  return (
    <Stack.Navigator
      screenOptions={{
        header: OfficerStackHeader,
        headerStyle: { backgroundColor: OFFICER_HEADER },
        headerTintColor: colors.white,
        headerTitleStyle: { fontSize: 20, fontWeight: '600' },
        headerShadowVisible: false,
        headerBackVisible: false,
        headerLeft: (props: NativeStackHeaderBackProps) => <OfficerStackHeaderLeft {...props} />,
        headerRight: () => <OfficerHeaderActions />,
      }}
    >
      <Stack.Screen
        name="PayslipList"
        component={OfficerPayslipScreen}
        options={{ title: 'My Payslips', headerLeft: () => null }}
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
