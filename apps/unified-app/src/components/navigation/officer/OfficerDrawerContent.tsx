import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useActiveShift, usePendingCollections, useRequestCounts } from '@/hooks/officer';
import { signOut } from '@/hooks/useAuth';
import { useGetPortalUnreadCountQuery } from '@/services/api/portalNotificationsApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { OfficerDrawerParamList } from '@/types/navigation';

type DrawerItem = {
  route: keyof OfficerDrawerParamList;
  screen?: 'AssignedCustomers' | 'CollectionsList';
  label: string;
  icon: string;
  showBadge?: boolean;
};

type DrawerSection = {
  id: string;
  label: string;
  items: DrawerItem[];
};

const SECTIONS: DrawerSection[] = [
  { id: 'top', label: '', items: [{ route: 'Dashboard', label: 'Dashboard', icon: '🏠' }] },
  {
    id: 'field',
    label: 'Field',
    items: [
      { route: 'RequestsStack', label: 'Requests', icon: '📋', showBadge: true },
      { route: 'Map', label: 'Map', icon: '🗺️' },
      { route: 'Attendance', label: 'Attendance', icon: '📅' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { route: 'CollectionsStack', label: 'Collections', icon: '💰', showBadge: true },
      {
        route: 'CollectionsStack',
        screen: 'AssignedCustomers',
        label: 'Collect Payment',
        icon: '💵',
      },
      { route: 'Invoice', label: 'Invoice', icon: '🧾' },
    ],
  },
  {
    id: 'assets',
    label: 'Assets',
    items: [{ route: 'Inventory', label: 'Inventory', icon: '📦' }],
  },
  {
    id: 'workforce',
    label: 'Workforce',
    items: [
      { route: 'Payslip', label: 'Payslip', icon: '💳' },
      { route: 'LeaveStack', label: 'Leave', icon: '🌿' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      { route: 'NotificationsStack', label: 'Notifications', icon: '🔔', showBadge: true },
      { route: 'Support', label: 'Support', icon: '💬' },
      { route: 'ProfileStack', label: 'Profile', icon: '👤' },
    ],
  },
];

function formatNavCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

export function OfficerDrawerContent(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { isActive, elapsedLabel } = useActiveShift();
  const { newRequests } = useRequestCounts();
  const { pendingCount } = usePendingCollections();
  const { data: unreadNotifications = 0 } = useGetPortalUnreadCountQuery();
  const { navigation, state } = props;
  const activeRoute = state.routes[state.index]?.name;

  const getBadgeCount = useCallback(
    (route: keyof OfficerDrawerParamList, showBadge?: boolean): number | null => {
      if (!showBadge) return null;
      if (route === 'RequestsStack' && newRequests > 0) return newRequests;
      if (route === 'CollectionsStack' && pendingCount > 0) return pendingCount;
      if (route === 'NotificationsStack' && unreadNotifications > 0) return unreadNotifications;
      return null;
    },
    [newRequests, pendingCount, unreadNotifications],
  );

  const navigate = useCallback(
    (route: keyof OfficerDrawerParamList, screen?: DrawerItem['screen']) => {
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
            const collectionsState = state.routes.find((r) => r.name === 'CollectionsStack')?.state;
            const nestedRoute =
              collectionsState && 'routes' in collectionsState && collectionsState.index != null
                ? collectionsState.routes[collectionsState.index]?.name
                : undefined;
            const isActiveItem =
              item.screen != null
                ? activeRoute === item.route && nestedRoute === item.screen
                : activeRoute === item.route && item.screen == null && nestedRoute !== 'AssignedCustomers';
            const itemKey = item.screen ? `${item.route}-${item.screen}` : item.route;
            const badgeCount = getBadgeCount(item.route, item.showBadge);

            return (
              <Pressable
                key={itemKey}
                style={[styles.item, isActiveItem && styles.itemActive]}
                onPress={() => navigate(item.route, item.screen)}
              >
                {isActiveItem ? <View style={styles.activeBar} /> : null}
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <Text
                  style={[styles.itemLabel, isActiveItem && styles.itemLabelActive]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                {badgeCount != null ? (
                  <Text style={styles.navCount}>{formatNavCount(badgeCount)}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )),
    [activeRoute, getBadgeCount, navigate, state.routes],
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
        <Text style={styles.brandSub}>Field App</Text>

        {user ? (
          <View style={styles.userCard}>
            <Text style={styles.userName} numberOfLines={1}>
              {user.name}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user.email}
            </Text>
            {isActive ? (
              <View style={styles.shiftRow}>
                <View style={styles.shiftDot} />
                <Text style={styles.shiftText}>Shift active · {elapsedLabel}</Text>
              </View>
            ) : null}
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
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const ITEM_HEIGHT = 48;
const DRAWER_EDGE_INSET = spacing.xs;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: adminColors.sidebarBg,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
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
    fontSize: 20,
    fontWeight: '800',
    color: adminColors.primary,
    paddingTop: spacing.sm,
  },
  brandSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  userCard: {
    marginBottom: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: adminColors.primaryTint,
    borderWidth: 1,
    borderColor: adminColors.permissionBoxBorder,
  },
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
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  shiftDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: adminColors.badgeActive,
  },
  shiftText: {
    fontSize: 12,
    fontWeight: '600',
    color: adminColors.salaryTotal,
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
    borderRadius: radius.full,
    position: 'relative',
  },
  itemActive: {
    backgroundColor: adminColors.primaryTint,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 4,
    bottom: 4,
    width: 3,
    backgroundColor: adminColors.activeBorder,
    borderRadius: 2,
  },
  itemIcon: {
    width: 28,
    fontSize: 20,
    textAlign: 'center',
  },
  itemLabel: {
    flex: 1,
    flexShrink: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
    marginLeft: spacing.md,
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
  signOutBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
    marginBottom: spacing.xs,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: adminColors.badgeBlocked,
    textAlign: 'center',
  },
});
