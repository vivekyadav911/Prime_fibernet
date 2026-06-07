import { createDrawerNavigator } from '@react-navigation/drawer';

import { AdminAnalyticsScreen } from '@/screens/admin/AdminAnalyticsScreen';
import { AdminAuditScreen } from '@/screens/admin/AdminAuditScreen';
import { AdminDashboardScreen } from '@/screens/admin/AdminDashboardScreen';
import { AdminNotificationsScreen } from '@/screens/admin/AdminNotificationsScreen';
import { AdminOfficersScreen } from '@/screens/admin/AdminOfficersScreen';
import { AdminPlansScreen } from '@/screens/admin/AdminPlansScreen';
import { AdminRequestsScreen } from '@/screens/admin/AdminRequestsScreen';
import { AdminSettingsScreen } from '@/screens/admin/AdminSettingsScreen';
import { AdminUsersScreen } from '@/screens/admin/AdminUsersScreen';
import { colors } from '@prime/ui';

const Drawer = createDrawerNavigator();

export function AdminNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primaryNavy },
        headerTintColor: colors.white,
        drawerActiveTintColor: colors.accentTeal,
      }}
    >
      <Drawer.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Drawer.Screen name="Users" component={AdminUsersScreen} />
      <Drawer.Screen name="Officers" component={AdminOfficersScreen} />
      <Drawer.Screen name="Plans" component={AdminPlansScreen} />
      <Drawer.Screen name="Requests" component={AdminRequestsScreen} />
      <Drawer.Screen name="Analytics" component={AdminAnalyticsScreen} />
      <Drawer.Screen name="Notifications" component={AdminNotificationsScreen} />
      <Drawer.Screen name="AuditLogs" component={AdminAuditScreen} options={{ title: 'Audit logs' }} />
      <Drawer.Screen name="Settings" component={AdminSettingsScreen} />
    </Drawer.Navigator>
  );
}
