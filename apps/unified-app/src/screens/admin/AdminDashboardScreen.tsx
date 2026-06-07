import { StyleSheet, Text, View } from 'react-native';
import { Screen, colors } from '@prime/ui';

import { useGetDashboardKpisQuery } from '@/store/api/endpoints';

export function AdminDashboardScreen() {
  const { data } = useGetDashboardKpisQuery();

  return (
    <Screen>
      <Text style={styles.title}>Admin dashboard</Text>
      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.label}>Active subscribers</Text>
          <Text style={styles.value}>{data?.activeSubscribers ?? 0}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>MRR (₹)</Text>
          <Text style={styles.value}>{data?.mrr ?? 0}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Open requests</Text>
          <Text style={styles.value}>{data?.openRequests ?? 0}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Officers online</Text>
          <Text style={styles.value}>{data?.officersOnline ?? 0}</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
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
