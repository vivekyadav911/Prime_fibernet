import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Button, EmptyState, ErrorState, Screen, colors } from '@prime/ui';

import { useAppSelector } from '@/store/hooks';
import { useGetMyRequestsQuery, useGetPlansQuery } from '@/store/api/endpoints';

export function CustomerDashboardScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: plans, isLoading: plansLoading, error: plansError, refetch } = useGetPlansQuery();
  const { data: requests } = useGetMyRequestsQuery(user?.id ?? '', { skip: !user?.id });

  if (plansLoading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={colors.primaryNavy} />
      </Screen>
    );
  }

  if (plansError) {
    return (
      <Screen>
        <ErrorState message="Could not load dashboard" onRetry={refetch} />
      </Screen>
    );
  }

  const activePlan = plans?.[0];
  const recentRequests = requests?.slice(0, 3) ?? [];

  return (
    <Screen padded={false}>
      <View style={styles.banner}>
        {activePlan ? (
          <>
            <Text style={styles.planName}>{activePlan.name}</Text>
            <Text style={styles.planMeta}>{activePlan.speedMbps} Mbps · ₹{activePlan.price}</Text>
          </>
        ) : (
          <EmptyState title="No active plan" description="Browse plans to subscribe" actionLabel="View plans" />
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent requests</Text>
        {recentRequests.length === 0 ? (
          <Text style={styles.muted}>No service requests yet</Text>
        ) : (
          <FlatList
            data={recentRequests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text>{item.requestType}</Text>
                <Text style={styles.chip}>{item.status}</Text>
              </View>
            )}
          />
        )}
      </View>
      <View style={styles.actions}>
        <Button label="Pay bill" onPress={() => undefined} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.primaryNavy, padding: 24 },
  planName: { color: colors.white, fontSize: 22, fontWeight: '700' },
  planMeta: { color: colors.white, opacity: 0.9, marginTop: 4 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  muted: { color: colors.textSecondary },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  chip: { color: colors.accentTeal, textTransform: 'capitalize' },
  actions: { padding: 16 },
});
