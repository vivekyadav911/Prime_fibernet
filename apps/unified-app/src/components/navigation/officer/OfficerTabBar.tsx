import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/customer/ui';
import { usePendingCollections, useRequestCounts } from '@/hooks/officer';
import { adminColors } from '@/theme/admin';
import { colors, officerColors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { OfficerTabParamList } from '@/types/navigation';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<
  keyof OfficerTabParamList,
  { label: string; icon: IconName; iconFocused: IconName; showBadge?: boolean }
> = {
  Dashboard: { label: 'Dashboard', icon: 'home-outline', iconFocused: 'home' },
  Tickets: { label: 'Tickets', icon: 'ticket-outline', iconFocused: 'ticket', showBadge: true },
  Attendance: { label: 'Attendance', icon: 'calendar-outline', iconFocused: 'calendar' },
  Payments: { label: 'Payments', icon: 'wallet-outline', iconFocused: 'wallet', showBadge: true },
  Settings: { label: 'Settings', icon: 'settings-outline', iconFocused: 'settings' },
};

function formatBadge(count: number): string {
  return count > 99 ? '99+' : String(count);
}

export function OfficerTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { newRequests } = useRequestCounts();
  const { pendingCount } = usePendingCollections();

  const getBadgeCount = (routeName: keyof OfficerTabParamList): number | null => {
    const cfg = TAB_CONFIG[routeName];
    if (!cfg.showBadge) return null;
    if (routeName === 'Tickets' && newRequests > 0) return newRequests;
    if (routeName === 'Payments' && pendingCount > 0) return pendingCount;
    return null;
  };

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, spacing.xs) },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const routeName = route.name as keyof OfficerTabParamList;
        const cfg = TAB_CONFIG[routeName];
        const descriptor = descriptors[route.key];
        if (!descriptor || !cfg) return null;
        const { options } = descriptor;
        const label = options.title ?? cfg.label;
        const badgeCount = getBadgeCount(routeName);

        return (
          <PressableScale
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={[styles.tab, focused && styles.tabFocused]}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={focused ? cfg.iconFocused : cfg.icon}
                size={24}
                color={focused ? colors.primaryNavy : colors.textSecondary}
              />
              {badgeCount != null ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{formatBadge(badgeCount)}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    minHeight: 64,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.surfaceWhite,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    minHeight: 48,
  },
  tabFocused: {
    backgroundColor: adminColors.primaryTint,
  },
  iconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: officerColors.navBar,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.white,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 2,
  },
  tabLabelFocused: {
    color: colors.primaryNavy,
    fontWeight: '600',
  },
});
