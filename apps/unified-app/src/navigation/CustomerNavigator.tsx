import { useEffect } from 'react';
import { Linking } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { CustomerFontProvider } from '@/components/customer/CustomerFontProvider';
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
import { signalGlass } from '@/theme/customer/signalGlass';

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
import { TabIcon } from './TabIcon';
import { AnimatedTabBar } from './AnimatedTabBar';

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
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: signalGlass.colors.bgSurface },
        headerTintColor: signalGlass.colors.textPrimary,
        tabBarStyle: {
          backgroundColor: signalGlass.colors.bgSurface,
          borderTopColor: signalGlass.colors.borderSubtle,
        },
        tabBarActiveTintColor: signalGlass.colors.accentPrimary,
        tabBarInactiveTintColor: signalGlass.colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          headerShown: false,
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

export function CustomerNavigator() {
  return (
    <CustomerFontProvider>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: signalGlass.colors.bgSurface },
          headerTintColor: signalGlass.colors.textPrimary,
          contentStyle: { backgroundColor: signalGlass.colors.bgDeep },
        }}
      >
        <Stack.Screen name="CustomerTabs" component={CustomerTabsWithDeepLinks} options={{ headerShown: false }} />
        <Stack.Screen name="PlanDetails" component={PlanDetailsScreen} options={{ title: 'Plan details' }} />
        <Stack.Screen name="PlanChangeRequest" component={PlanChangeRequestScreen} options={{ title: 'Plan change' }} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
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
        <Stack.Screen name="Notifications" component={CustomerNotificationsScreen} options={{ title: 'Notifications' }} />
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
    </CustomerFontProvider>
  );
}
