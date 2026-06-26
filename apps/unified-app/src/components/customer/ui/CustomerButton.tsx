import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

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
  const { theme } = useCustomerTheme();
  const styles = useThemedStyles(createStyles);
  const isPrimary = variant === 'primary';

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
        isPrimary && styles.primary,
        variant === 'ghost' && styles.ghost,
        variant === 'outline' && styles.outline,
        variant === 'danger' && styles.danger,
        isPrimary && styles.primaryGlow,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={18}
          color={isPrimary ? theme.colors.onPrimary : theme.colors.primary}
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

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    base: {
      borderRadius: theme.radius.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: theme.spacing.xs,
      minHeight: 48,
    },
    primary: { backgroundColor: theme.colors.primaryContainer },
    primaryGlow: theme.shadow.primaryGlow,
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
    },
    danger: { backgroundColor: theme.colors.errorContainer },
    pressed: { opacity: 0.88 },
    disabled: { opacity: 0.45 },
    icon: { marginRight: 2 },
    label: {
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
      fontSize: 14,
      fontWeight: '600',
    },
    primaryLabel: {
      color: theme.colors.onPrimary,
    },
    ghostLabel: { color: theme.colors.primary },
    outlineLabel: { color: theme.colors.onSurface },
    disabledLabel: { color: theme.colors.textMuted },
  });
