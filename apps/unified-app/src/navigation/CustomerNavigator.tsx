import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { CustomerDashboardScreen } from '@/screens/customer/CustomerDashboardScreen';
import { PaymentsScreen } from '@/screens/customer/PaymentsScreen';
import { PlansScreen } from '@/screens/customer/PlansScreen';
import { ProfileScreen } from '@/screens/customer/ProfileScreen';
import { RequestsScreen } from '@/screens/customer/RequestsScreen';
import { ChatbotScreen } from '@/screens/customer/ChatbotScreen';
import { colors } from '@prime/ui';

export type CustomerTabParamList = {
  Home: undefined;
  Plans: undefined;
  Payments: undefined;
  Requests: undefined;
  Support: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<CustomerTabParamList>();

export function CustomerNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primaryNavy },
        headerTintColor: colors.white,
        tabBarActiveTintColor: colors.accentTeal,
      }}
    >
      <Tab.Screen name="Home" component={CustomerDashboardScreen} />
      <Tab.Screen name="Plans" component={PlansScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
      <Tab.Screen name="Requests" component={RequestsScreen} />
      <Tab.Screen name="Support" component={ChatbotScreen} options={{ title: 'Support' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
