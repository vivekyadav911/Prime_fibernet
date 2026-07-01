import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminSettingsStackParamList } from '@/types/navigation';
import type { SettingsNavRoute } from '@/types/settings';

type NavItem = {
  route: SettingsNavRoute;
  label: string;
  icon: string;
};

const NAV_ITEMS: NavItem[] = [
  { route: 'AdminAccount', label: 'Admin Account', icon: '👤' },
  { route: 'General', label: 'General', icon: '🏢' },
  { route: 'Security', label: 'Security', icon: '🔒' },
  { route: 'Officers', label: 'Officers', icon: '🛡️' },
  { route: 'OfficerSalary', label: 'Officer Salary', icon: '💵' },
  { route: 'Notifications', label: 'Notifications', icon: '🔔' },
  { route: 'Integrations', label: 'Integrations', icon: '🔌' },
  { route: 'WhatsAppSettings', label: 'WhatsApp', icon: '💬' },
  { route: 'Appearance', label: 'Appearance', icon: '🎨' },
  { route: 'System', label: 'System', icon: '⚙️' },
  { route: 'BackupExport', label: 'Backup & Export', icon: '💾' },
  { route: 'AuditLogs', label: 'Audit Logs', icon: '📜' },
];

type SettingsHubLayoutProps = {
  activeRoute: SettingsNavRoute;
  children: ReactNode;
};

export function SettingsHubLayout({ activeRoute, children }: SettingsHubLayoutProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const navigation = useNavigation<NativeStackNavigationProp<AdminSettingsStackParamList>>();

  const sidebar = (
    <View style={[styles.sidebar, isWide && styles.sidebarWide]}>
      <Text style={styles.sidebarTitle}>Settings</Text>
      {NAV_ITEMS.map((item) => {
        const isActive = item.route === activeRoute;
        return (
          <Pressable
            key={item.route}
            style={[styles.navItem, isActive && styles.navItemActive]}
            onPress={() => navigation.navigate(item.route)}
          >
            <Text style={styles.navIcon}>{item.icon}</Text>
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (!isWide) {
    return <>{children}</>;
  }

  return (
    <View style={styles.split}>
      {sidebar}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {children}
      </ScrollView>
    </View>
  );
}

export function SettingsMobileNav() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminSettingsStackParamList>>();

  return (
    <View style={styles.mobileNav}>
      {NAV_ITEMS.map((item) => (
        <Pressable
          key={item.route}
          style={styles.mobileNavItem}
          onPress={() => navigation.navigate(item.route)}
        >
          <Text style={styles.navIcon}>{item.icon}</Text>
          <Text style={styles.mobileNavLabel}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  split: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 240,
    backgroundColor: adminColors.cardBg,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.borderDefault,
    paddingVertical: spacing.md,
  },
  sidebarWide: { paddingHorizontal: spacing.sm },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.xs,
    borderRadius: radius.full,
  },
  navItemActive: { backgroundColor: adminColors.primaryTint },
  navIcon: { width: 28, fontSize: 18, textAlign: 'center' },
  navLabel: { fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginLeft: spacing.sm },
  navLabelActive: { color: adminColors.primary, fontWeight: '700' },
  content: { flex: 1 },
  contentInner: { padding: spacing.md },
  mobileNav: { gap: spacing.xs },
  mobileNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  mobileNavLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginLeft: spacing.sm },
});
