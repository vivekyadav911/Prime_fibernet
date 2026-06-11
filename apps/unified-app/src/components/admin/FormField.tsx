import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type FormFieldProps = TextInputProps & {
  label: string;
  error?: string;
  helperText?: string;
  rightElement?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

export function FormField({
  label,
  error,
  helperText,
  rightElement,
  style,
  containerStyle,
  ...props
}: FormFieldProps) {
  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, error ? styles.inputError : null, style]}
          placeholderTextColor={colors.textSecondary}
          {...props}
        />
        {rightElement}
      </View>
      {helperText && !error ? <Text style={styles.helper}>{helperText}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xxs, textTransform: 'uppercase' },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    fontSize: 14,
  },
  inputError: { borderColor: colors.errorRed },
  helper: { color: colors.textSecondary, fontSize: 11, marginTop: spacing.xxs },
  error: { color: colors.errorRed, fontSize: 12, marginTop: spacing.xxs },
});
