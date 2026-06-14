import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { signOut } from '@/hooks/useAuth';
import { useUnassignedRequestCount } from '@/hooks/useAdminRequests';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { adminColors, adminDrawerWidth } from '@/theme/admin';
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
      { route: 'TicketPortal', label: 'Ticket Portal', icon: '🎫' },
      { route: 'Plans', label: 'Plans', icon: '📶' },
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
  { id: 'reports', label: '', items: [{ route: 'Reports', label: 'Reports', icon: '📊' }] },
  {
    id: 'system',
    label: 'System',
    items: [
      { route: 'Support', label: 'Support', icon: '💬' },
      { route: 'Settings', label: 'Settings', icon: '⚙️' },
      { route: 'Map', label: 'Map', icon: '🗺️' },
    ],
  },
];

export function AdminDrawerContent(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const unassignedCount = useUnassignedRequestCount();
  const { state, navigation } = props;
  const activeRoute = state.routes[state.index]?.name;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    people: true,
    hr: false,
    ops: false,
    finance: false,
    assets: false,
    system: false,
  });

  const toggleSection = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

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
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[styles.container, { paddingTop: insets.top }]}
      style={{ width: adminDrawerWidth, backgroundColor: adminColors.sidebarBg }}
    >
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

      {SECTIONS.map((section) => (
        <View key={section.id}>
          {section.label ? (
            <Pressable onPress={() => toggleSection(section.id)} style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>{section.label}</Text>
              <Text style={styles.chevron}>{expanded[section.id] ? '▼' : '▶'}</Text>
            </Pressable>
          ) : null}
          {(section.label === '' || expanded[section.id]) &&
            section.items.map((item) => {
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
                    {item.showBadge && unassignedCount > 0 ? <View style={styles.navBadge} /> : null}
                  </View>
                  <Text style={[styles.itemLabel, isActive && styles.itemLabelActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
        </View>
      ))}

      <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing.xl, flexGrow: 1 },
  brand: { fontSize: 18, fontWeight: '800', color: adminColors.primary, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  brandSub: { fontSize: 11, color: adminColors.sectionLabel, paddingHorizontal: spacing.md, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  userCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: adminColors.primaryTint,
    borderWidth: 1,
    borderColor: adminColors.permissionBoxBorder,
  },
  userName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  userEmail: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginTop: spacing.xs },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: adminColors.sectionLabel, textTransform: 'uppercase', letterSpacing: 0.8 },
  chevron: { fontSize: 10, color: adminColors.sectionLabel },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, marginHorizontal: spacing.xs, borderRadius: 8, position: 'relative' },
  itemActive: { backgroundColor: adminColors.primaryTint },
  activeBar: { position: 'absolute', left: 0, top: 4, bottom: 4, width: 3, backgroundColor: adminColors.activeBorder, borderRadius: 2 },
  itemIconWrap: { position: 'relative', marginRight: spacing.sm, marginLeft: spacing.xs },
  itemIcon: { fontSize: 16 },
  navBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: adminColors.primary,
  },
  itemLabel: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  itemLabelActive: { color: adminColors.primary, fontWeight: '700' },
  signOutBtn: {
    marginTop: 'auto',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
    color: adminColors.badgeBlocked,
    textAlign: 'center',
  },
});
