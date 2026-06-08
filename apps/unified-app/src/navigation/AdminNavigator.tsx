import { Platform, useWindowDimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AdminAnalyticsScreen } from '@/screens/admin/AdminAnalyticsScreen';
import { AdminAuditScreen } from '@/screens/admin/AdminAuditScreen';
import { AdminDashboardScreen } from '@/screens/admin/AdminDashboardScreen';
import { AdminNotificationsScreen } from '@/screens/admin/AdminNotificationsScreen';
import { AdminOfficersScreen } from '@/screens/admin/AdminOfficersScreen';
import { AdminPlansScreen } from '@/screens/admin/AdminPlansScreen';
import { AdminRequestsScreen } from '@/screens/admin/AdminRequestsScreen';
import { AdminSettingsScreen } from '@/screens/admin/AdminSettingsScreen';
import { AdminUsersScreen } from '@/screens/admin/AdminUsersScreen';
import type { AdminDrawerParamList, AdminStackParamList } from '@/types/navigation';
import { colors } from '@prime/ui';

const Drawer = createDrawerNavigator<AdminDrawerParamList>();
const Stack = createNativeStackNavigator<AdminStackParamList>();

/**
 * Flutter `AdminShell` primary destinations (indices 0,1,2,6,7,8,12,13).
 * Web uses permanent sidebar like Flutter's collapsible CRM drawer.
 */
function AdminDrawerNav() {
  const { width } = useWindowDimensions();
  const isWebSidebar = Platform.OS === 'web' && width >= 1024;

  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primaryNavy },
        headerTintColor: colors.white,
        drawerActiveTintColor: colors.accentTeal,
        drawerType: isWebSidebar ? 'permanent' : 'front',
        drawerStyle: isWebSidebar ? { width: 300 } : undefined,
        overlayColor: isWebSidebar ? 'transparent' : undefined,
      }}
    >
      <Drawer.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Drawer.Screen name="Users" component={AdminUsersScreen} />
      <Drawer.Screen name="Officers" component={AdminOfficersScreen} />
      <Drawer.Screen name="Plans" component={AdminPlansScreen} />
      <Drawer.Screen name="Requests" component={AdminRequestsScreen} />
      <Drawer.Screen
        name="Analytics"
        component={AdminAnalyticsScreen}
        options={{ title: 'Analytics', drawerLabel: 'Analytics' }}
      />
      <Drawer.Screen
        name="Audit"
        component={AdminAuditScreen}
        options={{ title: 'Audit Logs', drawerLabel: 'Audit Logs' }}
      />
      <Drawer.Screen name="Notifications" component={AdminNotificationsScreen} />
      <Drawer.Screen name="Settings" component={AdminSettingsScreen} />
    </Drawer.Navigator>
  );
}

/** Flutter go_router `/` → `AdminShell` */
export function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDrawer" component={AdminDrawerNav} />
    </Stack.Navigator>
  );
}
