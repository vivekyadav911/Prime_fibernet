import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';

import { useActiveShift, useOfficerProfile, usePendingCollections, useRequestCounts } from '@/hooks/officer';
import { signOut } from '@/hooks/useAuth';
import { useAppDispatch } from '@/store/hooks';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type DrawerItem = {
  route: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: number;
};

const MENU_ITEMS: DrawerItem[] = [
  { route: 'Dashboard', label: 'Dashboard', icon: 'home-outline' },
  { route: 'RequestsStack', label: 'Requests', icon: 'clipboard-outline' },
  { route: 'Map', label: 'Map', icon: 'map-outline' },
  { route: 'Attendance', label: 'Attendance', icon: 'calendar-outline' },
  { route: 'CollectionsStack', label: 'Collections', icon: 'cash-outline' },
  { route: 'Invoice', label: 'Invoice', icon: 'receipt-outline' },
  { route: 'Inventory', label: 'Inventory', icon: 'cube-outline' },
  { route: 'Payslip', label: 'Payslip', icon: 'wallet-outline' },
  { route: 'LeaveStack', label: 'Leave', icon: 'leaf-outline' },
  { route: 'Support', label: 'Support', icon: 'chatbubble-outline' },
  { route: 'ProfileStack', label: 'Profile', icon: 'person-outline' },
];

export function OfficerDrawerContent(props: DrawerContentComponentProps) {
  const { navigation, state } = props;
  const { profile } = useOfficerProfile();
  const { isActive, elapsedLabel } = useActiveShift();
  const { newRequests } = useRequestCounts();
  const { pendingCount } = usePendingCollections();
  const dispatch = useAppDispatch();

  const activeRoute = state.routes[state.index]?.name;

  const badgeFor = (route: string): number | undefined => {
    if (route === 'RequestsStack') return newRequests > 0 ? newRequests : undefined;
    if (route === 'CollectionsStack') return pendingCount > 0 ? pendingCount : undefined;
    return undefined;
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        {profile?.avatarUrl ? (
          <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{profile?.name?.charAt(0) ?? 'O'}</Text>
          </View>
        )}
        <Text style={styles.name}>{profile?.name ?? 'Officer'}</Text>
        <Text style={styles.meta}>{profile?.designation ?? 'Field Technician'}</Text>
        {profile?.employeeId ? (
          <Text style={styles.meta}>{profile.employeeId}</Text>
        ) : null}

        {isActive ? (
          <View style={styles.shiftRow}>
            <View style={styles.shiftDot} />
            <Text style={styles.shiftText}>SHIFT ACTIVE · {elapsedLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.divider} />

      {MENU_ITEMS.map((item) => {
        const focused =
          activeRoute === item.route ||
          (item.route === 'RequestsStack' && activeRoute === 'RequestsStack') ||
          (item.route === 'CollectionsStack' && activeRoute === 'CollectionsStack');
        const badge = badgeFor(item.route);

        return (
          <Pressable
            key={item.route}
            style={[styles.item, focused && styles.itemActive]}
            onPress={() => navigation.navigate(item.route as never)}
          >
            <Ionicons
              name={item.icon}
              size={22}
              color={focused ? colors.drawerActiveText : colors.drawerText}
            />
            <Text style={[styles.itemLabel, focused && styles.itemLabelActive]}>{item.label}</Text>
            {badge != null ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}

      <View style={styles.divider} />

      <Pressable style={styles.signOut} onPress={() => void signOut(dispatch)}>
        <Ionicons name="log-out-outline" size={22} color={colors.red} />
        <Text style={styles.signOutLabel}>Sign Out</Text>
      </Pressable>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.drawerBg },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    alignItems: 'flex-start',
  },
  avatar: { width: 56, height: 56, borderRadius: 28, marginBottom: spacing.sm },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.drawerActive,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarInitial: { fontSize: 22, fontWeight: '700', color: colors.white },
  name: { fontSize: 18, fontWeight: '700', color: colors.white },
  meta: { fontSize: 13, color: colors.drawerText, marginTop: 2 },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  shiftDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.emerald },
  shiftText: { fontSize: 12, fontWeight: '600', color: colors.emerald },
  divider: { height: 1, backgroundColor: colors.drawerActive, marginVertical: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
    gap: spacing.md,
  },
  itemActive: { backgroundColor: colors.drawerActive },
  itemLabel: { flex: 1, fontSize: 15, color: colors.drawerText },
  itemLabelActive: { color: colors.drawerActiveText, fontWeight: '600' },
  badge: {
    backgroundColor: colors.drawerBadge,
    borderRadius: radius.full,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.white },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  signOutLabel: { fontSize: 15, color: colors.red, fontWeight: '600' },
});
