import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { OfficerTabBar } from '@/components/navigation/officer/OfficerTabBar';
import { useOfficerTicketsSync } from '@/hooks/officer';
import { usePortalNotificationsSync } from '@/hooks/usePortalNotificationsSync';
import type { OfficerTabParamList } from '@/types/navigation';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { OfficerAttendanceStackNav } from './OfficerAttendanceStackNav';
import { OfficerDashboardStackNav } from './OfficerDashboardStackNav';
import { OfficerPaymentsStackNav } from './OfficerPaymentsStackNav';
import { OfficerSettingsStackNav } from './OfficerSettingsStackNav';
import { OfficerRequestsStackNav } from './officerStackNavigators';
import { useOfficerTabBackHandler } from '@/hooks/useOfficerTabBackHandler';

const Tab = createBottomTabNavigator<OfficerTabParamList>();

function OfficerTabsContent() {
  usePortalNotificationsSync();
  useOfficerTicketsSync();
  useOfficerTabBackHandler();

  return (
    <Tab.Navigator
      tabBar={(props) => <OfficerTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tab.Screen name="Dashboard" component={OfficerDashboardStackNav} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Tickets" component={OfficerRequestsStackNav} options={{ title: 'Tickets' }} />
      <Tab.Screen name="Attendance" component={OfficerAttendanceStackNav} options={{ title: 'Attendance' }} />
      <Tab.Screen name="Payments" component={OfficerPaymentsStackNav} options={{ title: 'Payments' }} />
      <Tab.Screen name="Settings" component={OfficerSettingsStackNav} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

export function OfficerTabNavigator() {
  return (
    <ThemeProvider>
      <OfficerTabsContent />
    </ThemeProvider>
  );
}
