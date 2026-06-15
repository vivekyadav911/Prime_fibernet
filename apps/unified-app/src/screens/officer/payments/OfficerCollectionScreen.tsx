import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { Button, Screen } from '@prime/ui';

import { AmountDisplay } from '@/components/payments';
import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { useOfficerId } from '@/hooks/useOfficerId';
import { useOfficerCollections } from '@/hooks/usePayments';
import { formatINR } from '@/utils/currencyFormat';
import type { OfficerDrawerParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

export function OfficerCollectionScreen() {
  const navigation = useNavigation<DrawerNavigationProp<OfficerDrawerParamList>>();
  const officerId = useOfficerId();
  const { data, isLoading, isError, error, refetch } = useOfficerCollections(officerId ?? '');

  const onCollect = useCallback(
    (customer: { customer_id: string; customer_name: string; account_number: string; total_amount: number; due_date: string | null }) => {
      navigation.navigate('CashCollection', {
        customerId: customer.customer_id,
        customerName: customer.customer_name,
        accountNumber: customer.account_number,
        amount: customer.total_amount,
        dueDate: customer.due_date ?? undefined,
      });
    },
    [navigation],
  );

  if (!officerId) {
    return <Screen><ErrorState message="Officer profile not found." /></Screen>;
  }

  if (isLoading) return <Screen><SkeletonLoader rows={5} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  const pending = data?.pending ?? [];

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Cash Collections — Today</Text>
      <Text style={styles.summary}>
        Pending: {pending.length} · Collected today: {formatINR(data?.todayTotal ?? 0)} · Confirmed: {data?.confirmedToday ?? 0}
      </Text>
      <Button label="Collection history" variant="ghost" onPress={() => navigation.navigate('CollectionHistory')} />
      <FlatList
        data={pending}
        keyExtractor={(item) => item.customer_id}
        ListEmptyComponent={<EmptyState title="No pending collections" message="Assigned customers with due bills appear here." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.customer_name} · {item.account_number}</Text>
            <AmountDisplay amount={item.total_amount} />
            {item.due_date ? <Text style={styles.due}>Due: {item.due_date}</Text> : null}
            <Button label="Collect" onPress={() => onCollect(item)} />
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.md, backgroundColor: colors.background },
  title: { fontSize: 18, fontWeight: '700', color: colors.primaryNavy, marginBottom: spacing.sm },
  summary: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xs,
  },
  name: { fontWeight: '600', color: colors.textPrimary },
  due: { fontSize: 12, color: colors.textSecondary },
});
