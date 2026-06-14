import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { signOut } from '@/hooks/useAuth';
import { useUnassignedRequestCount } from '@/hooks/useAdminRequests';
import { usePlansSidebarBadge } from '@/hooks/usePlans';
import { useTicketPortalBadge } from '@/hooks/useTickets';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminDrawerParamList } from '@/types/navigation';

type DrawerItem = {
  route: keyof AdminDrawerParamList;
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
    id: 'people',
    label: 'People',
    items: [
      { route: 'Users', label: 'Users', icon: '👥' },
      { route: 'Officers', label: 'Officers', icon: '🛡️' },
    ],
  },
  {
    id: 'hr',
    label: 'HR & Workforce',
    items: [
      { route: 'Attendance', label: 'Attendance', icon: '📅' },
      { route: 'Payroll', label: 'Payroll', icon: '💰' },
      { route: 'RoleManagement', label: 'Role Management', icon: '🔐' },
    ],
  },
  {
    id: 'ops',
    label: 'Operations',
    items: [
      { route: 'Requests', label: 'Requests', icon: '📋', showBadge: true },
      { route: 'TicketPortal', label: 'Ticket Portal', icon: '🎫', showBadge: true },
      { route: 'Plans', label: 'Plans', icon: '📶', showBadge: true },
      { route: 'Notifications', label: 'Notifications', icon: '🔔' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { route: 'Payments', label: 'Payments', icon: '💳' },
      { route: 'Invoices', label: 'Invoices', icon: '🧾' },
    ],
  },
  {
    id: 'assets',
    label: 'Assets',
    items: [{ route: 'Inventory', label: 'Inventory', icon: '📦' }],
  },
  {
    id: 'reports',
    label: 'Reports',
    items: [{ route: 'Reports', label: 'Reports', icon: '📊' }],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { route: 'Support', label: 'Support', icon: '💬' },
      { route: 'Settings', label: 'Settings', icon: '⚙️' },
      { route: 'Map', label: 'Map', icon: '🗺️' },
      { route: 'Audit', label: 'Audit Logs', icon: '📜' },
    ],
  },
];

export function AdminDrawerContent(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const unassignedCount = useUnassignedRequestCount();
  const ticketBadge = useTicketPortalBadge();
  const plansBadge = usePlansSidebarBadge();
  const { state, navigation } = props;
  const activeRoute = state.routes[state.index]?.name;

  const navigate = useCallback(
    (route: keyof AdminDrawerParamList) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigation.navigate(route as any);
    },
    [navigation],
  );

  const handleSignOut = useCallback(() => {
    void signOut(dispatch);
  }, [dispatch]);

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
            <Text style={styles.userName} numberOfLines={1}>
              {user.name}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user.email}
            </Text>
          </View>
        ) : null}
      </View>

      <DrawerContentScrollView
        {...props}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map((section) => (
          <View key={section.id} style={styles.section}>
            {section.label ? (
              <>
                <View style={styles.sectionDivider} />
                <Text style={styles.sectionLabel}>{section.label}</Text>
              </>
            ) : null}

            {section.items.map((item) => {
              const isActive = activeRoute === item.route;
              return (
                <Pressable
                  key={item.route}
                  style={[styles.item, isActive && styles.itemActive]}
                  onPress={() => navigate(item.route)}
                >
                  {isActive ? <View style={styles.activeBar} /> : null}
                  <View style={styles.itemIconWrap}>
                    <Text style={styles.itemIcon}>{item.icon}</Text>
                    {item.route === 'Requests' && item.showBadge && unassignedCount > 0 ? (
                      <View style={styles.navBadge} />
                    ) : null}
                    {item.route === 'TicketPortal' && ticketBadge.showBadge ? (
                      <View
                        style={[
                          styles.navBadge,
                          ticketBadge.isBreached ? styles.navBadgeDanger : styles.navBadgeWarning,
                        ]}
                      />
                    ) : null}
                    {item.route === 'Plans' && item.showBadge && plansBadge.showBadge ? (
                      <View style={styles.navBadge} />
                    ) : null}
                  </View>
                  <Text
                    style={[styles.itemLabel, isActive && styles.itemLabelActive]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </DrawerContentScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: adminColors.sidebarBg,
  },
  header: {
    paddingHorizontal: spacing.sm,
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
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    backgroundColor: adminColors.sidebarBg,
  },
  brand: {
    fontSize: 18,
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
    borderRadius: radius.sm,
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
  section: {
    width: '100%',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.borderDefault,
    marginHorizontal: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xxs,
    paddingBottom: spacing.xxs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingVertical: spacing.xs + 2,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    marginHorizontal: spacing.xxs,
    borderRadius: radius.sm,
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
  itemIconWrap: {
    position: 'relative',
    marginRight: spacing.xs + 2,
    marginLeft: spacing.xxs,
  },
  itemIcon: {
    fontSize: 17,
  },
  navBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: adminColors.primary,
  },
  navBadgeWarning: {
    backgroundColor: adminColors.badgePending,
  },
  navBadgeDanger: {
    backgroundColor: adminColors.badgeBlocked,
  },
  itemLabel: {
    flex: 1,
    flexShrink: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  itemLabelActive: {
    color: adminColors.primary,
    fontWeight: '700',
  },
  signOutBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: adminColors.badgeBlocked,
    textAlign: 'center',
  },
});
