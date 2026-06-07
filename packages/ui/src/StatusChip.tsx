import { StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

const STATUS_COLORS: Record<string, string> = {
  pending: colors.warningAmber,
  active: colors.successGreen,
  working: colors.accentTeal,
  resolved: colors.successGreen,
  success: colors.successGreen,
  failed: colors.errorRed,
  refunded: colors.textSecondary,
  expired: colors.errorRed,
};

type StatusChipProps = { status: string };

export function StatusChip({ status }: StatusChipProps) {
  const color = STATUS_COLORS[status] ?? colors.textSecondary;
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{status.replace(/_/g, ' ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
});
