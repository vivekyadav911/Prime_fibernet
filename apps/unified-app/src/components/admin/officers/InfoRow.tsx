import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type InfoRowProps = {
  label: string;
  value: string;
  labelWidth?: number;
};

export function InfoRow({ label, value, labelWidth = 120 }: InfoRowProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { width: labelWidth }]}>{label}</Text>
      <Text style={styles.value}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.xxs,
    gap: spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
});
