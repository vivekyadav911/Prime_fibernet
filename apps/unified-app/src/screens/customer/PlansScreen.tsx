import { FlatList, StyleSheet, Text, View } from 'react-native';
import { EmptyState, ErrorState, Screen, colors } from '@prime/ui';

import { useCreatePaymentOrderMutation, useGetPlansQuery } from '@/store/api/endpoints';

export function PlansScreen() {
  const { data, isLoading, error, refetch } = useGetPlansQuery();
  const [createOrder] = useCreatePaymentOrderMutation();

  if (error) {
    return (
      <Screen>
        <ErrorState message="Failed to load plans" onRetry={refetch} />
      </Screen>
    );
  }

  if (!isLoading && (!data || data.length === 0)) {
    return (
      <Screen>
        <EmptyState title="No plans available" description="Check back later" />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.speedMbps} Mbps · ₹{item.price} · {item.validityDays} days
            </Text>
            <Text
              style={styles.cta}
              onPress={() => createOrder({ planId: item.id, amount: item.price })}
            >
              Subscribe
            </Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  name: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  meta: { color: colors.textSecondary, marginTop: 4 },
  cta: { color: colors.accentTeal, fontWeight: '600', marginTop: 12 },
});
