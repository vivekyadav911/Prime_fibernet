import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

type CustomerLockedFieldProps = {
  label: string;
  value: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  mono?: boolean;
  hint?: string;
  inputProps?: Pick<TextInputProps, 'accessibilityLabel'>;
};

/** Read-only account field with explicit "Read only" affordance. */
export function CustomerLockedField({
  label,
  value,
  icon = 'lock-outline',
  mono = false,
  hint,
  inputProps,
}: CustomerLockedFieldProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.readOnlyTag}>Read only</Text>
      </View>
      <View style={styles.inputWrap}>
        <MaterialCommunityIcons name={icon} size={20} color={theme.colors.outline} style={styles.leadingIcon} />
        <TextInput
          style={[styles.input, mono && styles.monoInput]}
          value={value}
          editable={false}
          accessibilityLabel={inputProps?.accessibilityLabel ?? label}
        />
        <MaterialCommunityIcons name="lock-outline" size={18} color={theme.colors.outline} />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    field: { gap: theme.spacing.xs, marginBottom: theme.spacing.sm },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
    },
    label: {
      ...theme.typography.label,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.bodySemiBold,
    },
    readOnlyTag: {
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.bodyMedium,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.readOnlyFieldBorder,
      borderStyle: 'dashed',
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.readOnlyFieldBg,
      paddingHorizontal: theme.spacing.sm,
      minHeight: 48,
      opacity: 0.92,
    },
    leadingIcon: { marginRight: theme.spacing.xs },
    input: {
      flex: 1,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.body,
      fontSize: 16,
      paddingVertical: theme.spacing.sm,
    },
    monoInput: { fontFamily: theme.fonts.mono },
    hint: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontFamily: theme.fonts.body,
      lineHeight: 18,
    },
  });
