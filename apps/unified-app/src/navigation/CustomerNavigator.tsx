import { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';

import { useCustomerRequestBadge } from '@/hooks/useCustomerRequestBadge';
import { DashboardScreen } from '@/screens/customer/dashboard/DashboardScreen';
import { ChatbotScreen } from '@/screens/customer/ChatbotScreen';
import { CustomerSupportHubScreen } from '@/screens/customer/support/CustomerSupportHubScreen';
import { CustomerLiveChatScreen } from '@/screens/customer/support/CustomerLiveChatScreen';
import { CustomerFaqListScreen } from '@/screens/customer/support/CustomerFaqListScreen';
import { CustomerFaqDetailScreen } from '@/screens/customer/support/CustomerFaqDetailScreen';
import { CustomerBillScreen } from '@/screens/customer/payments/CustomerBillScreen';
import { PaymentMethodScreen } from '@/screens/customer/payments/PaymentMethodScreen';
import { GatewayWebViewScreen } from '@/screens/customer/payments/GatewayWebViewScreen';
import { PaymentHistoryScreenV2 } from '@/screens/customer/payments/PaymentHistoryScreenV2';
import { ReceiptScreen } from '@/screens/customer/payments/ReceiptScreen';
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
        component={CustomerBillScreen}
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

function CustomerTabsWithDeepLinks() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();

  useEffect(() => {
    const handleUrl = (url: string) => {
      const parsed = Linking.parse(url);
      if (parsed.path === 'payment/result' || parsed.hostname === 'payment') {
        const status = parsed.queryParams?.status;
        const paymentId = String(parsed.queryParams?.paymentId ?? '');
        const amount = Number(parsed.queryParams?.amount ?? 0);
        if (status === 'success' && paymentId) {
          navigation.navigate('PaymentSuccess', {
            paymentId,
            amount,
            planName: String(parsed.queryParams?.planName ?? 'Broadband'),
            activationDate: new Date().toISOString(),
          });
        }
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [navigation]);

  return <CustomerTabs />;
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
      <Stack.Screen name="CustomerTabs" component={CustomerTabsWithDeepLinks} options={{ headerShown: false }} />
      <Stack.Screen name="PlanDetails" component={PlanDetailsScreen} options={{ title: 'Plan details' }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
      <Stack.Screen name="PaymentSelection" component={PaymentSelectionScreen} options={{ title: 'Payment' }} />
      <Stack.Screen name="PaymentGateway" component={PaymentGatewayScreen} options={{ title: 'Payment gateway' }} />
      <Stack.Screen name="GatewayWebView" component={GatewayWebViewScreen} options={{ title: 'Payment' }} />
      <Stack.Screen name="PaymentMethod" component={PaymentMethodScreen} options={{ title: 'Payment method' }} />
      <Stack.Screen name="CustomerBill" component={CustomerBillScreen} options={{ title: 'My bill' }} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} options={{ title: 'Receipt' }} />
      <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} options={{ title: 'Success', headerShown: false }} />
      <Stack.Screen name="MakePayment" component={MakePaymentScreen} options={{ title: 'Make payment' }} />
      <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreenV2} options={{ title: 'Payment history' }} />
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
