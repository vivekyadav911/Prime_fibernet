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
  prefixes: ['primefiber://', 'primefibernet://', 'https://admin.primefibernet.com', 'https://app.primefibernet.com'],
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
              Support: 'support',
              Profile: 'profile',
            },
          },
          PlanDetails: 'plan-details/:planId',
          PlanChangeRequest: 'plans/:planId/change',
          Checkout: 'checkout/:planId',
          PaymentSelection: 'payment-selection/:planId',
          PaymentGateway: 'payment-gateway/:paymentId',
          MakePayment: 'make-payment',
          PaymentHistory: 'payment-history',
          PaymentSuccess: 'payment/result',
          PaymentResult: 'payment/verify',
          GatewayWebView: 'payment/checkout',
          Notifications: 'notifications',
          CustomerTicketList: 'tickets',
          CustomerTicketDetail: 'tickets/:ticketId',
          CreateCustomerTicket: 'tickets/new',
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
              RequestsStack: { screens: { RequestsList: 'requests' } },
              Map: 'map',
              Attendance: 'attendance',
              CollectionsStack: {
                screens: {
                  CollectionsList: 'collect-payment',
                  CollectionHistory: 'collection-history',
                  AssignedCustomers: 'collections/search',
                  CustomerPaymentHistory: 'collections/customer/:customerId',
                },
              },
              LeaveStack: { screens: { LeaveList: 'leave' } },
              NotificationsStack: { screens: { NotificationsList: 'notifications' } },
              ProfileStack: { screens: { ProfileHome: 'profile' } },
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
              Support: {
                screens: {
                  SupportDashboard: 'support',
                  Tickets: 'support/tickets',
                  FaqList: 'support/faqs',
                  LiveChat: 'support/chat',
                  SupportAnalytics: 'support/analytics',
                },
              },
              Settings: {
                screens: {
                  SettingsHub: 'settings',
                  AdminAccount: 'settings/account',
                  General: 'settings/general',
                  Security: 'settings/security',
                  Officers: 'settings/officers',
                  OfficerSalary: 'settings/officer-salary',
                  Notifications: 'settings/notifications',
                  Integrations: 'settings/integrations',
                  Appearance: 'settings/appearance',
                  System: 'settings/system',
                  BackupExport: 'settings/backup',
                  AuditLogs: 'settings/audit',
                },
              },
              Map: {
                screens: {
                  MapMain: 'map',
                  TrailReplay: 'map/trail/:officerId',
                },
              },
            },
          },
          AdminAuth: 'login',
        },
      },
      Totp: 'totp-verify',
    },
  },
};
