import type { ReactNode } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { adminColors } from '@/theme/admin';
import { spacing } from '@/theme/spacing';

type SettingsRowProps = {
  label: string;
  description?: string;
  value?: boolean;
  onValueChange?: (v: boolean) => void;
  children?: ReactNode;
  disabled?: boolean;
};

export function SettingsRow({
  label,
  description,
  value,
  onValueChange,
  children,
  disabled,
}: SettingsRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.textCol}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {children ?? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: colors.borderDefault, true: adminColors.primary }}
          thumbColor={colors.surfaceWhite}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  textCol: { flex: 1 },
  label: { fontSize: 15, fontWeight: '500', color: colors.textPrimary },
  description: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});
