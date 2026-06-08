import type { LinkingOptions } from '@react-navigation/native';

import type { RootStackParamList } from '@/types/navigation';

/**
 * Deep link map derived from Flutter:
 * - Customer `MaterialApp.routes` (`prime_fibernet_app/lib/main.dart`)
 * - Officer named routes (`prime_fibernet_officer_app/lib/main.dart`)
 * - Admin go_router `/login` + `/` (`prime_fibernet_admin_panel/lib/config/router.dart`)
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['primefibernet://', 'https://admin.primefibernet.com', 'https://app.primefibernet.com'],
  config: {
    screens: {
      Auth: {
        path: 'auth',
        screens: {
          Login: 'login',
          Register: 'register',
          SignUp: 'sign-up',
          ForgotPassword: 'forgot-password',
          OTPVerification: 'otp-verify/:identifier',
          Totp: 'totp',
        },
      },
      Customer: {
        path: 'customer',
        screens: {
          CustomerTabs: {
            screens: {
              Home: 'home',
              Plans: 'plans',
              Payments: 'payments',
              Requests: 'requests',
              Profile: 'profile',
            },
          },
          PlanDetails: 'plan-details/:planId',
          Checkout: 'checkout/:planId',
          PaymentSelection: 'payment-selection/:planId',
          PaymentGateway: 'payment-gateway/:paymentId',
          MakePayment: 'make-payment',
          PaymentHistory: 'payment-history',
          CreateRequest: 'create-request',
          RequestDetails: 'requests/:requestId',
          Notifications: 'notifications',
          About: 'about',
          Terms: 'terms',
          Privacy: 'privacy',
          Refund: 'refund',
        },
      },
      Officer: {
        path: 'officer',
        screens: {
          OfficerDrawer: {
            screens: {
              Dashboard: 'dashboard',
              Requests: 'requests',
              Map: 'map',
              Shifts: 'shifts',
              Inventory: 'inventory',
              Profile: 'profile',
            },
          },
          RequestDetail: 'request/:requestId',
          LocationGate: 'location-gate',
        },
      },
      Admin: {
        path: 'admin',
        screens: {
          AdminDrawer: {
            screens: {
              Dashboard: '',
              Users: 'users',
              Officers: 'officers',
              Plans: 'plans',
              Requests: 'requests',
              Analytics: 'analytics',
              Notifications: 'notifications',
              Settings: 'settings',
            },
          },
          AdminAuth: 'login',
        },
      },
      Totp: 'totp-verify',
    },
  },
};
