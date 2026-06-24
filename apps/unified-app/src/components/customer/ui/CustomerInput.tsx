import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { signalGlass } from '@/theme/customer/signalGlass';

type CustomerInputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function CustomerInput({ label, error, style, ...rest }: CustomerInputProps) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={signalGlass.colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: signalGlass.spacing.xs },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: signalGlass.colors.textSecondary,
    textTransform: 'uppercase',
    fontFamily: signalGlass.fonts.bodyMedium,
  },
  input: {
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
    borderRadius: signalGlass.radius.sm,
    padding: signalGlass.spacing.sm,
    backgroundColor: signalGlass.colors.bgSurface,
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.body,
    fontSize: 15,
  },
  inputError: { borderColor: signalGlass.colors.accentDanger },
  error: {
    color: signalGlass.colors.accentDanger,
    fontSize: 12,
    fontFamily: signalGlass.fonts.body,
  },
});
