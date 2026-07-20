import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackHeaderBackProps } from '@react-navigation/native-stack';

import { OfficerStackHeader } from '@/components/navigation/officer/OfficerStackHeader';
import { CollectPaymentScreen } from '@/screens/officer/CollectPaymentScreen';
import { InvoiceScreen } from '@/screens/officer/InvoiceScreen';
import type { OfficerPaymentsStackParamList } from '@/types/navigation';
import { colors, officerColors } from '@/theme/colors';

import { OfficerHeaderActions } from './officerHeaderActions';
import { OfficerCollectionsStackNav } from './officerStackNavigators';
import { OfficerStackHeaderLeft } from './OfficerStackHeaderLeft';

const Stack = createNativeStackNavigator<OfficerPaymentsStackParamList>();

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

export function OfficerPaymentsStackNav() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="CollectionsStack"
        component={OfficerCollectionsStackNav}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Invoice" component={InvoiceScreen} options={{ title: 'Invoice' }} />
      <Stack.Screen
        name="CollectPayment"
        component={CollectPaymentScreen}
        options={{ title: 'Collect payment', headerShown: false }}
      />
    </Stack.Navigator>
  );
}
