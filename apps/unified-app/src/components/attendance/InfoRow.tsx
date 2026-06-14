import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Props = {
  label: string;
  value: string;
  icon?: string;
};

export const InfoRow = memo(function InfoRow({ label, value, icon }: Props) {
  return (
    <View style={styles.row}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  icon: { fontSize: 14 },
  label: { flex: 1, fontSize: 13, color: colors.textSecondary },
  value: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
});
