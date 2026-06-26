import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { signalGlass } from '@/theme/customer/signalGlass';

type Variant = 'primary' | 'ghost' | 'danger' | 'outline';

type CustomerButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
};

export function CustomerButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  accessibilityLabel,
  icon,
}: CustomerButtonProps) {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        isPrimary && styles.primary,
        variant === 'ghost' && styles.ghost,
        variant === 'outline' && styles.outline,
        variant === 'danger' && styles.danger,
        isPrimary && signalGlass.shadow.primaryGlow,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={18}
          color={isPrimary ? signalGlass.colors.onPrimaryContainer : signalGlass.colors.primary}
          style={styles.icon}
        />
      ) : null}
      <Text
        style={[
          styles.label,
          isPrimary && styles.primaryLabel,
          variant === 'ghost' && styles.ghostLabel,
          variant === 'outline' && styles.outlineLabel,
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
    paddingVertical: signalGlass.spacing.sm,
    paddingHorizontal: signalGlass.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: signalGlass.spacing.xs,
    minHeight: 48,
  },
  primary: { backgroundColor: signalGlass.colors.primaryContainer },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
  },
  danger: { backgroundColor: signalGlass.colors.errorContainer },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.45 },
  icon: { marginRight: 2 },
  label: {
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.bodySemiBold,
    fontSize: 14,
    fontWeight: '600',
  },
  primaryLabel: {
    color: signalGlass.colors.onPrimaryContainer,
  },
  ghostLabel: { color: signalGlass.colors.primary },
  outlineLabel: { color: signalGlass.colors.onSurface },
  disabledLabel: { color: signalGlass.colors.textMuted },
});
