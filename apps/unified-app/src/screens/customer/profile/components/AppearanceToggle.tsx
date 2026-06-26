import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

type AppearanceOption = {
  id: 'dark' | 'light';
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const OPTIONS: AppearanceOption[] = [
  {
    id: 'dark',
    title: 'Signal Glass',
    subtitle: 'Dark glass theme with Hanken Grotesk',
    icon: 'moon-waning-crescent',
  },
  {
    id: 'light',
    title: 'Prime Light',
    subtitle: 'Light broadband theme with Inter',
    icon: 'white-balance-sunny',
  },
];

export function AppearanceToggle() {
  const { isDark, setDarkMode } = useCustomerTheme();
  const styles = useThemedStyles(createStyles);
  const selected = isDark ? 'dark' : 'light';

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>APPEARANCE</Text>
      {OPTIONS.map((option) => {
        const active = selected === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => setDarkMode(option.id === 'dark')}
            style={[styles.option, active && styles.optionActive]}
          >
            <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
              <MaterialCommunityIcons
                name={option.icon}
                size={22}
                color={active ? styles.iconActive.color : styles.iconIdle.color}
              />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.title, active && styles.titleActive]}>{option.title}</Text>
              <Text style={styles.subtitle}>{option.subtitle}</Text>
            </View>
            <View style={[styles.radio, active && styles.radioActive]}>
              {active ? <View style={styles.radioDot} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    wrap: { gap: theme.spacing.sm },
    heading: {
      ...theme.typography.label,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.bodySemiBold,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      padding: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      backgroundColor: theme.colors.bgSurface,
    },
    optionActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.accentPrimaryMuted,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceContainerHigh,
    },
    iconWrapActive: {
      backgroundColor: theme.colors.surfaceContainer,
    },
    iconIdle: { color: theme.colors.onSurfaceVariant },
    iconActive: { color: theme.colors.primary },
    copy: { flex: 1, minWidth: 0 },
    title: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
    },
    titleActive: { color: theme.colors.primary },
    subtitle: {
      ...theme.typography.caption,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      marginTop: 2,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.colors.outlineVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioActive: { borderColor: theme.colors.primary },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.primary,
    },
  });
