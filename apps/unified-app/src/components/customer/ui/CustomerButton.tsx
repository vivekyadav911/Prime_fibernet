import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { signalGlass } from '@/theme/customer/signalGlass';

type Variant = 'primary' | 'ghost' | 'danger';

type CustomerButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function CustomerButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  accessibilityLabel,
}: CustomerButtonProps) {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === 'ghost' && styles.ghostLabel,
          disabled && styles.disabledLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: signalGlass.radius.sm,
    paddingVertical: signalGlass.spacing.md,
    paddingHorizontal: signalGlass.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: signalGlass.colors.accentPrimary },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
  },
  danger: { backgroundColor: signalGlass.colors.accentDanger },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.45 },
  label: {
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.bodyMedium,
    fontSize: 15,
    fontWeight: '600',
  },
  ghostLabel: { color: signalGlass.colors.accentGlow },
  disabledLabel: { color: signalGlass.colors.textMuted },
});
