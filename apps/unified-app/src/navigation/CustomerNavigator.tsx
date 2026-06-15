import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useCustomerRequestBadge } from '@/hooks/useCustomerRequestBadge';
import { DashboardScreen } from '@/screens/customer/dashboard/DashboardScreen';
import { ChatbotScreen } from '@/screens/customer/ChatbotScreen';
import { CustomerSupportHubScreen } from '@/screens/customer/support/CustomerSupportHubScreen';
import { CustomerLiveChatScreen } from '@/screens/customer/support/CustomerLiveChatScreen';
import { CustomerFaqListScreen } from '@/screens/customer/support/CustomerFaqListScreen';
import { CustomerFaqDetailScreen } from '@/screens/customer/support/CustomerFaqDetailScreen';
import { PaymentsScreen } from '@/screens/customer/payments/PaymentsScreen';
import { PlansScreen } from '@/screens/customer/plans/PlansScreen';
import { ProfileScreen } from '@/screens/customer/profile/ProfileScreen';
import { RequestsScreen } from '@/screens/customer/requests/RequestsScreen';
import type { CustomerStackParamList, CustomerTabParamList } from '@/types/navigation';
import { MyBillsScreen } from '@/screens/customer/bills/MyBillsScreen';
import { InvoiceScreen } from '@/screens/officer/InvoiceScreen';
import { colors } from '@/theme/colors';

import {
  AboutScreen,
  CheckoutScreen,
  CreateRequestScreen,
  CustomerNotificationsScreen,
  MakePaymentScreen,
  PaymentGatewayScreen,
  PaymentHistoryScreen,
  PaymentSelectionScreen,
  PaymentSuccessScreen,
  PlanDetailsScreen,
  PrivacyScreen,
  RefundScreen,
  RequestDetailsScreen,
  TermsScreen,
} from './customerStackScreens';
import { TabIcon } from './TabIcon';

const Tab = createBottomTabNavigator<CustomerTabParamList>();
const Stack = createNativeStackNavigator<CustomerStackParamList>();

function CustomerTabs() {
  const unresolvedCount = useCustomerRequestBadge();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primaryNavy },
        headerTintColor: colors.white,
        tabBarActiveTintColor: colors.accentTeal,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon label="⌂" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Plans"
        component={PlansScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="◎" focused={focused} /> }}
      />
      <Tab.Screen
        name="Payments"
        component={PaymentsScreen}
        options={{
          title: 'Pay',
          tabBarIcon: ({ focused }) => <TabIcon label="₹" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Requests"
        component={RequestsScreen}
        options={{
          tabBarBadge: unresolvedCount > 0 ? unresolvedCount : undefined,
          tabBarIcon: ({ focused }) => <TabIcon label="☰" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Support"
        component={CustomerSupportHubScreen}
        options={{
          title: 'Support',
          tabBarIcon: ({ focused }) => <TabIcon label="💬" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="👤" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

/**
 * Flutter `RootShell` (bottom tabs) + `MaterialApp.routes` pushed screens.
 * Tab bar auto-hides when a stack detail screen is focused.
 */
export function CustomerNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primaryNavy },
        headerTintColor: colors.white,
      }}
    >
      <Stack.Screen name="CustomerTabs" component={CustomerTabs} options={{ headerShown: false }} />
      <Stack.Screen name="PlanDetails" component={PlanDetailsScreen} options={{ title: 'Plan details' }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
      <Stack.Screen name="PaymentSelection" component={PaymentSelectionScreen} options={{ title: 'Payment' }} />
      <Stack.Screen name="PaymentGateway" component={PaymentGatewayScreen} options={{ title: 'Payment gateway' }} />
      <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} options={{ title: 'Success', headerShown: false }} />
      <Stack.Screen name="MakePayment" component={MakePaymentScreen} options={{ title: 'Make payment' }} />
      <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Payment history' }} />
      <Stack.Screen name="MyBills" component={MyBillsScreen} options={{ title: 'My bills' }} />
      <Stack.Screen name="Invoice" component={InvoiceScreen} options={{ title: 'Invoice' }} />
      <Stack.Screen name="CreateRequest" component={CreateRequestScreen} options={{ title: 'New request' }} />
      <Stack.Screen name="RequestDetails" component={RequestDetailsScreen} options={{ title: 'Request' }} />
      <Stack.Screen name="Notifications" component={CustomerNotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
      <Stack.Screen name="Terms" component={TermsScreen} options={{ title: 'Terms' }} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Privacy' }} />
      <Stack.Screen name="Refund" component={RefundScreen} options={{ title: 'Refund policy' }} />
      <Stack.Screen name="CustomerLiveChat" component={CustomerLiveChatScreen} options={{ title: 'Live Chat' }} />
      <Stack.Screen name="CustomerFaqList" component={CustomerFaqListScreen} options={{ title: 'FAQs' }} />
      <Stack.Screen name="CustomerFaqDetail" component={CustomerFaqDetailScreen} options={{ title: 'FAQ' }} />
      <Stack.Screen name="CustomerSupportHub" component={CustomerSupportHubScreen as never} options={{ title: 'Support' }} />
      <Stack.Screen name="SupportScreen" component={ChatbotScreen} options={{ title: 'AI Assistant' }} />
    </Stack.Navigator>
  );
}
