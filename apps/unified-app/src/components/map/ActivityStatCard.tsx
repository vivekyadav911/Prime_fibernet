import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Props = {
  icon: string;
  label: string;
  value: string;
  backgroundColor: string;
  valueColor: string;
};

export function ActivityStatCard({
  icon,
  label,
  value,
  backgroundColor,
  valueColor,
}: Props) {
  return (
    <View style={[styles.card, { backgroundColor }]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: spacing.md,
    margin: spacing.xxs,
  },
  icon: { fontSize: 18, marginBottom: spacing.xxs },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  value: { fontSize: 20, fontWeight: '700', marginTop: spacing.xxs },
});
