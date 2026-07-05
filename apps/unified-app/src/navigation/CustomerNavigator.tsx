import { useEffect } from 'react';
import { Linking, StatusBar } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { CustomerFontProvider } from '@/components/customer/CustomerFontProvider';
import { CustomerThemeProvider, useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { useRealtimeCustomer } from '@/hooks/useRealtimeCustomer';
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
import { PaymentResultScreen } from '@/screens/customer/payments/PaymentResultScreen';
import { ReceiptScreen } from '@/screens/customer/payments/ReceiptScreen';
import { PlansScreen } from '@/screens/customer/plans/PlansScreen';
import { PlanChangeRequestScreen } from '@/screens/customer/plans/PlanChangeRequestScreen';
import { ProfileScreen } from '@/screens/customer/profile/ProfileScreen';
import { CustomerNotificationsScreen } from '@/screens/customer/notifications/CustomerNotificationsScreen';
import { CustomerTicketListScreen } from '@/screens/customer/tickets/CustomerTicketListScreen';
import { CustomerTicketDetailScreen } from '@/screens/customer/tickets/CustomerTicketDetailScreen';
import { CreateCustomerTicketScreen } from '@/screens/customer/tickets/CreateCustomerTicketScreen';
import type { CustomerStackParamList, CustomerTabParamList } from '@/types/navigation';
import { MyBillsScreen } from '@/screens/customer/bills/MyBillsScreen';
import { InvoiceScreen } from '@/screens/officer/InvoiceScreen';

import {
  AboutScreen,
  CheckoutScreen,
  MakePaymentScreen,
  PaymentGatewayScreen,
  PaymentSuccessScreen,
  PlanDetailsScreen,
  PrivacyScreen,
  RefundScreen,
  TermsScreen,
} from './customerStackScreens';
import { CustomerTabBar } from '@/components/customer/shell/CustomerTabBar';

function parsePaymentDeepLink(url: string): { status?: string; paymentId?: string; amount?: string; planName?: string } {
  const query = url.includes('?') ? url.split('?')[1] : '';
  const params = new URLSearchParams(query);
  return {
    status: params.get('status') ?? undefined,
    paymentId: params.get('paymentId') ?? undefined,
    amount: params.get('amount') ?? undefined,
    planName: params.get('planName') ?? undefined,
  };
}

const Tab = createBottomTabNavigator<CustomerTabParamList>();
const Stack = createNativeStackNavigator<CustomerStackParamList>();

function CustomerTabs() {
  useRealtimeCustomer();

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomerTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Plans" component={PlansScreen} options={{ title: 'Plans' }} />
      <Tab.Screen name="Payments" component={CustomerBillScreen} options={{ title: 'Payments' }} />
      <Tab.Screen name="Support" component={CustomerSupportHubScreen} options={{ title: 'Support' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

function CustomerTabsWithDeepLinks() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();

  useEffect(() => {
    const handleUrl = (url: string) => {
      if (!url.includes('payment')) return;
      const params = parsePaymentDeepLink(url);
      if (params.status === 'success' && params.paymentId) {
        navigation.navigate('PaymentSuccess', {
          paymentId: params.paymentId,
          amount: Number(params.amount ?? 0),
          planName: params.planName ?? 'Broadband',
          activationDate: new Date().toISOString(),
        });
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

function CustomerStackNavigator() {
  const { theme } = useCustomerTheme();

  return (
    <>
      <StatusBar
        barStyle={theme.appearance === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.bgDeep}
      />
      <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.bgSurface },
        headerTintColor: theme.colors.textPrimary,
        contentStyle: { backgroundColor: theme.colors.bgDeep },
      }}
    >
      <Stack.Screen name="CustomerTabs" component={CustomerTabsWithDeepLinks} options={{ headerShown: false }} />
      <Stack.Screen name="PlanDetails" component={PlanDetailsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PlanChangeRequest" component={PlanChangeRequestScreen} options={{ title: 'Plan change' }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
      <Stack.Screen name="PaymentGateway" component={PaymentGatewayScreen} options={{ title: 'Payment gateway' }} />
      <Stack.Screen name="GatewayWebView" component={GatewayWebViewScreen} options={{ title: 'Payment' }} />
      <Stack.Screen name="PaymentMethod" component={PaymentMethodScreen} options={{ title: 'Payment method', headerShown: false, presentation: 'transparentModal' }} />
      <Stack.Screen name="CustomerBill" component={CustomerBillScreen} options={{ title: 'My bill' }} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} options={{ title: 'Receipt' }} />
      <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} options={{ title: 'Success', headerShown: false }} />
      <Stack.Screen name="PaymentResult" component={PaymentResultScreen} options={{ title: 'Payment', headerShown: false }} />
      <Stack.Screen name="MakePayment" component={MakePaymentScreen} options={{ title: 'Make payment' }} />
      <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreenV2} options={{ title: 'Payment history' }} />
      <Stack.Screen name="MyBills" component={MyBillsScreen} options={{ title: 'My bills' }} />
      <Stack.Screen name="Invoice" component={InvoiceScreen} options={{ title: 'Invoice' }} />
      <Stack.Screen
        name="Notifications"
        component={CustomerNotificationsScreen}
        options={{ title: 'Notifications', headerBackTitle: 'Back' }}
      />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
      <Stack.Screen name="Terms" component={TermsScreen} options={{ title: 'Terms' }} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Privacy' }} />
      <Stack.Screen name="Refund" component={RefundScreen} options={{ title: 'Refund policy' }} />
      <Stack.Screen name="CustomerLiveChat" component={CustomerLiveChatScreen} options={{ title: 'Live Chat' }} />
      <Stack.Screen name="CustomerFaqList" component={CustomerFaqListScreen} options={{ title: 'FAQs' }} />
      <Stack.Screen name="CustomerFaqDetail" component={CustomerFaqDetailScreen} options={{ title: 'FAQ' }} />
      <Stack.Screen name="CustomerSupportHub" component={CustomerSupportHubScreen as never} options={{ title: 'Support' }} />
      <Stack.Screen name="SupportScreen" component={ChatbotScreen} options={{ title: 'Prima AI' }} />
      <Stack.Screen name="CustomerTicketList" component={CustomerTicketListScreen} options={{ title: 'My tickets' }} />
      <Stack.Screen name="CustomerTicketDetail" component={CustomerTicketDetailScreen} options={{ title: 'Ticket' }} />
      <Stack.Screen name="CreateCustomerTicket" component={CreateCustomerTicketScreen} options={{ title: 'New ticket' }} />
    </Stack.Navigator>
    </>
  );
}

export function CustomerNavigator() {
  return (
    <CustomerThemeProvider>
      <CustomerFontProvider>
        <CustomerStackNavigator />
      </CustomerFontProvider>
    </CustomerThemeProvider>
  );
}
