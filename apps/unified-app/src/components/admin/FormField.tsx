import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { adminDesign, adminInputStyle } from '@/theme/adminDesign';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

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
          placeholderTextColor={adminDesign.colors.textMuted}
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
  wrap: { marginBottom: adminDesign.layout.fieldGap },
  label: { ...adminDesign.typography.label, marginBottom: adminDesign.layout.labelGap },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    ...adminInputStyle,
    flex: 1,
    fontSize: adminDesign.input.fontSize,
    color: colors.textPrimary,
  },
  inputError: { borderColor: colors.errorRed },
  helper: { ...adminDesign.typography.meta, marginTop: spacing.xxs },
  error: { color: colors.errorRed, fontSize: 12, marginTop: spacing.xxs },
});
