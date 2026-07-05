import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { PressableScale } from './PressableScale';
import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

export type CustomerFilterChip = {
  id: string;
  label: string;
};

type CustomerFilterChipsProps = {
  chips: CustomerFilterChip[];
  selectedId: string;
  onSelect: (id: string) => void;
  trailingAction?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Horizontal filter chips with scroll fade cue and optional trailing action. */
export function CustomerFilterChips({
  chips,
  selectedId,
  onSelect,
  trailingAction,
  style,
}: CustomerFilterChipsProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.scrollWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {chips.map((chip) => {
            const active = chip.id === selectedId;
            return (
              <PressableScale
                key={chip.id}
                onPress={() => onSelect(chip.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{chip.label}</Text>
              </PressableScale>
            );
          })}
        </ScrollView>
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', theme.colors.bgDeep]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.fadeEdge}
        />
      </View>
      {trailingAction ? <View style={styles.trailing}>{trailingAction}</View> : null}
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    scrollWrap: {
      flex: 1,
      position: 'relative',
    },
    scrollContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingRight: theme.spacing.lg,
    },
    fadeEdge: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 28,
    },
    chip: {
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 8,
    },
    chipActive: {
      backgroundColor: theme.colors.chipActiveBg,
      borderColor: theme.colors.chipActiveBorder,
    },
    chipIdle: {
      backgroundColor: theme.colors.chipInactiveBg,
      borderColor: theme.colors.borderSubtle,
    },
    chipLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.bodyMedium,
    },
    chipLabelActive: {
      color: theme.colors.primary,
    },
    trailing: {
      flexShrink: 0,
    },
  });
