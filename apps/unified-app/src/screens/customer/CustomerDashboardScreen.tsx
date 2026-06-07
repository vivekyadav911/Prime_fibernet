import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Button, EmptyState, ErrorState, Screen, StatusChip, colors } from '@prime/ui';

import type { CustomerTabParamList } from '@/navigation/CustomerNavigator';
import { useAppSelector } from '@/store/hooks';
import { useGetActiveSubscriptionQuery, useGetMyRequestsQuery } from '@/store/api/endpoints';

export function CustomerDashboardScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<CustomerTabParamList>>();
  const user = useAppSelector((s) => s.auth.user);
  const { data: subscription, isLoading, error, refetch } = useGetActiveSubscriptionQuery(user?.id ?? '', {
    skip: !user?.id,
  });
  const { data: requests } = useGetMyRequestsQuery(user?.id ?? '', { skip: !user?.id });
  const [payLoading] = useState(false);

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={colors.primaryNavy} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState message="Could not load dashboard" onRetry={refetch} />
      </Screen>
    );
  }

  const recentRequests = requests?.slice(0, 3) ?? [];
  const showExpiryBanner =
    subscription?.daysUntilExpiry != null && subscription.daysUntilExpiry <= 7 && subscription.daysUntilExpiry >= 0;

  return (
    <Screen padded={false}>
      {showExpiryBanner ? (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            Plan expires in {subscription?.daysUntilExpiry} day(s). Renew to stay connected.
          </Text>
        </View>
      ) : null}
      <View style={styles.banner}>
        {subscription ? (
          <>
            <Text style={styles.planName}>{subscription.planName ?? 'Active plan'}</Text>
            <Text style={styles.planMeta}>
              Valid until {new Date(subscription.endAt).toLocaleDateString()}
            </Text>
            <StatusChip status={subscription.status} />
          </>
        ) : (
          <EmptyState
            title="No active plan"
            description="Browse plans to subscribe"
            actionLabel="View plans"
            onAction={() => navigation.navigate('Plans')}
          />
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
                <Text style={styles.capitalize}>{item.requestType}</Text>
                <StatusChip status={item.status} />
              </View>
            )}
          />
        )}
      </View>
      <View style={styles.actions}>
        <Button
          label={payLoading ? 'Loading…' : 'Pay bill / Renew'}
          onPress={() => navigation.navigate('Plans')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  warningBanner: { backgroundColor: colors.warningAmber, padding: 12 },
  warningText: { color: colors.white, fontWeight: '600', textAlign: 'center' },
  banner: { backgroundColor: colors.primaryNavy, padding: 24, gap: 8 },
  planName: { color: colors.white, fontSize: 22, fontWeight: '700' },
  planMeta: { color: colors.white, opacity: 0.9 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  muted: { color: colors.textSecondary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  capitalize: { textTransform: 'capitalize' },
  actions: { padding: 16 },
});
