import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

type CustomerInputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function CustomerInput({ label, error, style, ...rest }: CustomerInputProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    wrap: { gap: theme.spacing.xs },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      fontFamily: theme.fonts.bodyMedium,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.inputFieldBorder,
      borderRadius: theme.radius.sm,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.inputFieldBg,
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.body,
      fontSize: 15,
    },
    inputError: { borderColor: theme.colors.accentDanger },
    error: {
      color: theme.colors.accentDanger,
      fontSize: 12,
      fontFamily: theme.fonts.body,
    },
  });
