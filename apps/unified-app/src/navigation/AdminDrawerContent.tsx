import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { signOut } from '@/hooks/useAuth';
import { useUnassignedRequestCount } from '@/hooks/useAdminRequests';
import { usePlansSidebarBadge } from '@/hooks/usePlans';
import { useNotificationsSidebarBadge } from '@/hooks/useNotificationHub';
import { useTicketPortalBadge } from '@/hooks/useTickets';
import { useChatSession } from '@/hooks/useChatSession';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type {
  AdminDrawerParamList,
  AdminInventoryStackParamList,
  AdminPaymentsStackParamList,
} from '@/types/navigation';

type DrawerNestedScreen = keyof AdminInventoryStackParamList | keyof AdminPaymentsStackParamList;

type DrawerItem = {
  route: keyof AdminDrawerParamList;
  screen?: DrawerNestedScreen;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  showBadge?: boolean;
};

type DrawerSection = {
  id: string;
  label: string;
  items: DrawerItem[];
};

type NavNotification =
  | { kind: 'count'; value: number }
  | { kind: 'pill'; label: string; tone: 'primary' | 'warning' | 'danger' | 'success' };

const SECTIONS: DrawerSection[] = [
  { id: 'top', label: '', items: [{ route: 'Dashboard', label: 'Dashboard', icon: 'home-outline' }] },
  {
    id: 'people',
    label: 'People',
    items: [
      { route: 'Users', label: 'Users', icon: 'people-outline' },
      { route: 'Officers', label: 'Officers', icon: 'shield-checkmark-outline' },
    ],
  },
  {
    id: 'hr',
    label: 'HR & Workforce',
    items: [
      { route: 'Attendance', label: 'Attendance', icon: 'calendar-outline' },
      { route: 'Payroll', label: 'Payroll', icon: 'cash-outline' },
      { route: 'RoleManagement', label: 'Role Management', icon: 'key-outline' },
    ],
  },
  {
    id: 'ops',
    label: 'Operations',
    items: [
      { route: 'Requests', label: 'Requests', icon: 'document-text-outline', showBadge: true },
      { route: 'Plans', label: 'Plans', icon: 'cellular-outline', showBadge: true },
      { route: 'Notifications', label: 'Notifications', icon: 'notifications-outline', showBadge: true },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { route: 'Payments', screen: 'PaymentList', label: 'Payments', icon: 'card-outline' },
      { route: 'Payments', screen: 'CollectionAssignments', label: 'Collection assignments', icon: 'clipboard-outline' },
      { route: 'Invoices', label: 'Invoices', icon: 'receipt-outline' },
    ],
  },
  {
    id: 'assets',
    label: 'Assets',
    items: [
      { route: 'Inventory', screen: 'InventoryList', label: 'Inventory', icon: 'cube-outline' },
      { route: 'Inventory', screen: 'AssignmentRequests', label: 'Assignment Requests', icon: 'swap-horizontal-outline' },
      { route: 'Inventory', screen: 'InventoryHistory', label: 'Inventory History', icon: 'time-outline' },
      { route: 'Inventory', screen: 'Categories', label: 'Categories', icon: 'pricetag-outline' },
      { route: 'Inventory', screen: 'BulkOperations', label: 'Bulk Operations', icon: 'flash-outline' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    items: [{ route: 'Reports', label: 'Reports', icon: 'bar-chart-outline' }],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { route: 'Support', label: 'Customer Support', icon: 'chatbubbles-outline', showBadge: true },
      { route: 'Settings', label: 'Settings', icon: 'settings-outline' },
      { route: 'Map', label: 'Map', icon: 'map-outline' },
    ],
  },
];

function formatNavCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

function NavNotificationBadge({ notification }: { notification: NavNotification }) {
  if (notification.kind === 'count') {
    return <Text style={styles.navCount}>{formatNavCount(notification.value)}</Text>;
  }

  const pillToneStyles = {
    primary: { pill: styles.navPillPrimary, text: styles.navPillTextPrimary },
    warning: { pill: styles.navPillWarning, text: styles.navPillTextWarning },
    danger: { pill: styles.navPillDanger, text: styles.navPillTextDanger },
    success: { pill: styles.navPillSuccess, text: styles.navPillTextSuccess },
  } as const;

  const tone = pillToneStyles[notification.tone];

  return (
    <View style={[styles.navPill, tone.pill]}>
      <Text style={[styles.navPillText, tone.text]}>{notification.label}</Text>
    </View>
  );
}

export function AdminDrawerContent(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const unassignedCount = useUnassignedRequestCount();
  const ticketBadge = useTicketPortalBadge();
  const { waitingCount } = useChatSession();
  const plansBadge = usePlansSidebarBadge();
  const notificationsBadge = useNotificationsSidebarBadge();
  const { state, navigation } = props;
  const activeRoute = state.routes[state.index]?.name;

  const getNotification = useCallback(
    (route: keyof AdminDrawerParamList, showBadge?: boolean): NavNotification | null => {
      if (!showBadge) return null;

      switch (route) {
        case 'Requests':
          return unassignedCount > 0 ? { kind: 'count', value: unassignedCount } : null;
        case 'Support': {
          const total = ticketBadge.breachedCount + waitingCount;
          if (total > 0) {
            return {
              kind: 'pill',
              label: `${formatNavCount(total)} alert`,
              tone: ticketBadge.breachedCount > 0 ? 'danger' : 'warning',
            };
          }
          if (ticketBadge.openCount > 0) {
            return {
              kind: 'pill',
              label: `${formatNavCount(ticketBadge.openCount)} open`,
              tone: 'primary',
            };
          }
          return null;
        }
        case 'Plans':
          if (plansBadge.count > 0) {
            return {
              kind: 'pill',
              label: `${formatNavCount(plansBadge.count)} review`,
              tone: 'warning',
            };
          }
          return null;
        case 'Notifications':
          if (notificationsBadge.draftCount > 0) {
            return {
              kind: 'pill',
              label: `${formatNavCount(notificationsBadge.draftCount)} draft`,
              tone: 'warning',
            };
          }
          if (notificationsBadge.hasUpcomingScheduled) {
            return { kind: 'pill', label: 'Soon', tone: 'primary' };
          }
          return null;
        default:
          return null;
      }
    },
    [unassignedCount, ticketBadge, plansBadge.count, notificationsBadge],
  );

  const navigate = useCallback(
    (route: keyof AdminDrawerParamList, screen?: DrawerNestedScreen) => {
      if (screen) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigation.navigate(route as any, { screen });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigation.navigate(route as any);
      }
    },
    [navigation],
  );

  const handleSignOut = useCallback(() => {
    void signOut(dispatch);
  }, [dispatch]);

  const sectionNodes = useMemo(
    () =>
      SECTIONS.map((section) => (
        <View key={section.id} style={styles.section}>
          {section.label ? (
            <>
              <View style={styles.sectionDivider} />
              <Text style={styles.sectionLabel}>{section.label}</Text>
            </>
          ) : null}

          {section.items.map((item) => {
            const inventoryState = state.routes.find((r) => r.name === 'Inventory')?.state;
            const paymentsState = state.routes.find((r) => r.name === 'Payments')?.state;
            const nestedRoute =
              item.route === 'Payments' && paymentsState && 'routes' in paymentsState && paymentsState.index != null
                ? paymentsState.routes[paymentsState.index]?.name
                : item.route === 'Inventory' &&
                    inventoryState &&
                    'routes' in inventoryState &&
                    inventoryState.index != null
                  ? inventoryState.routes[inventoryState.index]?.name
                  : undefined;
            const isActive =
              item.screen != null
                ? activeRoute === item.route && nestedRoute === item.screen
                : activeRoute === item.route && nestedRoute == null;
            const itemKey = item.screen ? `${item.route}-${item.screen}` : item.route;
            const notification = getNotification(item.route, item.showBadge);

            return (
              <Pressable
                key={itemKey}
                style={[styles.item, isActive && styles.itemActive]}
                onPress={() => navigate(item.route, item.screen)}
              >
                {isActive ? <View style={styles.activeBar} /> : null}
                <View style={[styles.itemIconWrap, isActive && styles.itemIconWrapActive]}>
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={isActive ? adminColors.primary : colors.textSecondary}
                  />
                </View>
                <Text
                  style={[styles.itemLabel, isActive && styles.itemLabelActive]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                {notification ? <NavNotificationBadge notification={notification} /> : null}
              </Pressable>
            );
          })}
        </View>
      )),
    [activeRoute, getNotification, navigate, state.routes],
  );

  return (
    <View
      style={[
        styles.wrapper,
        { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.sm) },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.brand}>Prime Fibernet</Text>
        <Text style={styles.brandSub}>Admin Panel</Text>

        {user ? (
          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Ionicons name="person" size={20} color={adminColors.primary} />
            </View>
            <View style={styles.userTextBlock}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.name}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <DrawerContentScrollView
        {...props}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sectionNodes}
      </DrawerContentScrollView>

      <View style={styles.footer}>
        <View style={styles.footerDivider} />
        <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={adminColors.badgeBlocked} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const ITEM_HEIGHT = 48;
const DRAWER_EDGE_INSET = spacing.sm;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: adminColors.sidebarBg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingBottom: spacing.xs,
    width: '100%',
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    backgroundColor: adminColors.sidebarBg,
  },
  footerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderDefault,
    marginBottom: spacing.sm,
    marginRight: DRAWER_EDGE_INSET,
  },
  brand: {
    fontSize: 21,
    fontWeight: '800',
    color: adminColors.primary,
    paddingTop: spacing.sm,
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    fontWeight: '600',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: adminColors.primaryTint,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.sm,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTextBlock: { flex: 1, minWidth: 0 },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  section: {
    width: '100%',
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderDefault,
    marginLeft: spacing.md,
    marginRight: DRAWER_EDGE_INSET,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxs,
    paddingBottom: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ITEM_HEIGHT,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginHorizontal: DRAWER_EDGE_INSET,
    marginBottom: 2,
    borderRadius: radius.lg,
    position: 'relative',
  },
  itemActive: {
    backgroundColor: adminColors.primaryTint,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    backgroundColor: adminColors.activeBorder,
    borderRadius: 2,
  },
  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWhite,
  },
  itemIconWrapActive: {
    backgroundColor: colors.surfaceWhite,
  },
  itemLabel: {
    flex: 1,
    flexShrink: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  itemLabelActive: {
    color: adminColors.primary,
    fontWeight: '700',
  },
  navCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    minWidth: 28,
    textAlign: 'right',
  },
  navPill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    maxWidth: 96,
  },
  navPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  navPillPrimary: {
    backgroundColor: adminColors.navPillPrimaryBg,
  },
  navPillTextPrimary: {
    color: adminColors.navPillPrimaryText,
  },
  navPillWarning: {
    backgroundColor: adminColors.navPillWarningBg,
  },
  navPillTextWarning: {
    color: adminColors.navPillWarningText,
  },
  navPillDanger: {
    backgroundColor: adminColors.navPillDangerBg,
  },
  navPillTextDanger: {
    color: adminColors.navPillDangerText,
  },
  navPillSuccess: {
    backgroundColor: adminColors.navPillSuccessBg,
  },
  navPillTextSuccess: {
    color: adminColors.navPillSuccessText,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
    marginBottom: spacing.xs,
    minHeight: 48,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: adminColors.badgeBlocked,
    textAlign: 'center',
  },
});
