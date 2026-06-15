import { Pressable, StyleSheet, Text, View } from 'react-native';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type SettingsSliderProps = {
  label: string;
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  unit?: string;
  onValueChange: (v: number) => void;
  disabled?: boolean;
};

export function SettingsSlider({
  label,
  value,
  minimumValue,
  maximumValue,
  step = 1,
  unit = '',
  onValueChange,
  disabled,
}: SettingsSliderProps) {
  const clamped = Math.min(maximumValue, Math.max(minimumValue, value));
  const range = maximumValue - minimumValue;
  const progress = range > 0 ? (clamped - minimumValue) / range : 0;

  const decrement = () => {
    onValueChange(Math.max(minimumValue, clamped - step));
  };

  const increment = () => {
    onValueChange(Math.min(maximumValue, clamped + step));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {Math.round(clamped)}
          {unit}
        </Text>
      </View>
      <View style={styles.trackRow}>
        <Pressable
          style={[styles.stepBtn, (disabled || clamped <= minimumValue) && styles.stepBtnDisabled]}
          onPress={decrement}
          disabled={disabled || clamped <= minimumValue}
          accessibilityLabel={`Decrease ${label}`}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
        </View>
        <Pressable
          style={[styles.stepBtn, (disabled || clamped >= maximumValue) && styles.stepBtnDisabled]}
          onPress={increment}
          disabled={disabled || clamped >= maximumValue}
          accessibilityLabel={`Increase ${label}`}
        >
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: { fontSize: 15, fontWeight: '500', color: colors.textPrimary },
  value: { fontSize: 14, fontWeight: '600', color: adminColors.primary },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: adminColors.primary,
    backgroundColor: adminColors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.4,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  stepBtnText: {
    fontSize: 20,
    fontWeight: '600',
    color: adminColors.primary,
    lineHeight: 22,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.borderDefault,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    backgroundColor: adminColors.primary,
    borderRadius: radius.full,
  },
});
