import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { adminColors } from '@/theme/admin';
import { adminDesign } from '@/theme/adminDesign';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type AdminButtonVariant = 'primary' | 'secondary' | 'ghost';

type AdminButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: AdminButtonVariant;
  loading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AdminButton({
  label,
  variant = 'primary',
  loading = false,
  loadingLabel,
  fullWidth,
  disabled,
  style,
  ...props
}: AdminButtonProps) {
  const isDisabled = disabled || loading;
  const displayLabel = loading ? (loadingLabel ?? `${label}…`) : label;
  const stretch = fullWidth ?? variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        stretch && styles.fullWidth,
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      {...props}
    >
      <Text style={[styles.label, styles[`${variant}Label` as const]]}>{displayLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: adminDesign.button.minHeight,
    borderRadius: adminDesign.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: adminDesign.button.paddingHorizontal,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  primary: {
    backgroundColor: adminColors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceWhite,
    borderWidth: 1,
    borderColor: adminColors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    minHeight: adminDesign.layout.minTouch,
    paddingHorizontal: spacing.md,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryLabel: {
    color: colors.surfaceWhite,
  },
  secondaryLabel: {
    color: adminColors.primary,
  },
  ghostLabel: {
    color: adminColors.primary,
  },
});
