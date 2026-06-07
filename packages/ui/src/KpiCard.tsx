import { StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

type KpiCardProps = { label: string; value: string | number };

export function KpiCard({ label, value }: KpiCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '47%',
    backgroundColor: colors.surfaceWhite,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  label: { color: colors.textSecondary, fontSize: 12 },
  value: { fontSize: 24, fontWeight: '700', color: colors.primaryNavy, marginTop: 4 },
});
