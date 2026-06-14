import { getStateFromPath as defaultGetStateFromPath } from '@react-navigation/native';
import type { LinkingOptions } from '@react-navigation/native';
import { Platform } from 'react-native';

import type { RootStackParamList } from '@/types/navigation';

const MOBILE_ONLY_PATH = /^(\/)?(customer|officer)(\/|$)/i;

function getStateFromPath(path: string, options: Parameters<typeof defaultGetStateFromPath>[1]) {
  if (Platform.OS === 'web' && MOBILE_ONLY_PATH.test(path)) {
    return {
      routes: [{ name: 'WebUnsupported' as const }],
    };
  }
  return defaultGetStateFromPath(path, options);
}

/**
 * Deep link map derived from Flutter:
 * - Customer `MaterialApp.routes` (`prime_fibernet_app/lib/main.dart`)
 * - Officer named routes (`prime_fibernet_officer_app/lib/main.dart`)
 * - Admin go_router `/login` + `/` (`prime_fibernet_admin_panel/lib/config/router.dart`)
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['primefibernet://', 'https://admin.primefibernet.com', 'https://app.primefibernet.com'],
  getStateFromPath,
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
      WebUnsupported: 'unsupported',
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
              Shifts: 'attendance',
              AttendanceHistory: 'attendance/history',
              Leave: 'leave',
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
              Attendance: {
                screens: {
                  LiveAttendance: 'attendance',
                  ApprovalRequests: 'attendance/approvals',
                  GeofenceManagement: 'attendance/geofences',
                },
              },
              Plans: 'plans',
              Requests: 'requests',
              Analytics: 'analytics',
              Notifications: {
                screens: {
                  NotificationList: 'notifications',
                  CreateNotification: 'notifications/create',
                  NotificationDetail: 'notifications/:notificationId',
                },
              },
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
