import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/customer/ui';
import { signalGlass } from '@/theme/customer/signalGlass';
import { isBlurUnavailable } from '@/utils/expoRuntime';

const TAB_CONFIG: Record<string, { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; iconFocused: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  Home: { label: 'Home', icon: 'home-outline', iconFocused: 'home' },
  Plans: { label: 'Plans', icon: 'package-variant-closed', iconFocused: 'package-variant-closed' },
  Payments: { label: 'Payments', icon: 'credit-card-outline', iconFocused: 'credit-card' },
  Support: { label: 'Support', icon: 'face-agent', iconFocused: 'face-agent' },
  Profile: { label: 'Profile', icon: 'account-outline', iconFocused: 'account' },
};

export function CustomerTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const useSolid = isBlurUnavailable();

  const tabs = (
    <View style={[styles.row, { paddingBottom: Math.max(insets.bottom, signalGlass.spacing.xs) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const cfg = TAB_CONFIG[route.name] ?? { label: route.name, icon: 'circle-outline' as const, iconFocused: 'circle' as const };
        const descriptor = descriptors[route.key];
        if (!descriptor) return null;
        const { options } = descriptor;
        const label = options.title ?? cfg.label;

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
            <MaterialCommunityIcons
              name={focused ? cfg.iconFocused : cfg.icon}
              size={24}
              color={focused ? signalGlass.colors.primary : signalGlass.colors.onSurfaceVariant}
            />
            <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );

  if (useSolid) {
    return <View style={[styles.bar, styles.solidBar]}>{tabs}</View>;
  }

  return (
    <BlurView intensity={signalGlass.blur.barIntensity} tint="dark" style={styles.bar}>
      {tabs}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    borderTopColor: signalGlass.colors.borderSubtle,
  },
  solidBar: {
    backgroundColor: 'rgba(16,19,26,0.92)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    minHeight: 64,
    paddingTop: signalGlass.spacing.xs,
    paddingHorizontal: signalGlass.spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: signalGlass.spacing.xs,
    borderRadius: signalGlass.radius.md,
    minHeight: 48,
  },
  tabFocused: {
    backgroundColor: signalGlass.colors.accentPrimaryMuted,
  },
  tabLabel: {
    ...signalGlass.typography.caption,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.bodyMedium,
    marginTop: 2,
  },
  tabLabelFocused: {
    color: signalGlass.colors.primary,
  },
});
