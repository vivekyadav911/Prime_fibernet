import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '@prime/ui';

import { AmountDisplay, CollectionStatusBadge } from '@/components/payments';
import { EmptyState, ErrorState, ScreenWrapper, SkeletonLoader } from '@/components/common';
import { useOfficerCollections } from '@/hooks/usePayments';
import { formatINR } from '@/utils/currencyFormat';
import type { OfficerCollectionsStackParamList } from '@/types/navigation';
import type { OfficerAssignedCustomer } from '@/types/payments';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

export function OfficerCollectionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OfficerCollectionsStackParamList>>();
  const { data, isLoading, isError, error, refetch } = useOfficerCollections();

  const myWork = data?.myWork ?? [];
  const outstandingTotal = myWork.reduce((sum, c) => sum + c.outstanding_amount, 0);

  const onCollect = useCallback(
    (customer: OfficerAssignedCustomer) => {
      navigation.navigate('CashCollection', {
        customerId: customer.id,
        customerName: customer.name,
        accountNumber: customer.customer_id,
        amount: customer.outstanding_amount,
        dueDate: customer.next_due_date ?? undefined,
      });
    },
    [navigation],
  );

  const onViewHistory = useCallback(
    (customer: OfficerAssignedCustomer) => {
      navigation.navigate('CustomerPaymentHistory', {
        customerId: customer.id,
        customerName: customer.name,
      });
    },
    [navigation],
  );

  const onOpenHistory = useCallback(() => {
    navigation.navigate('CollectionHistory');
  }, [navigation]);

  if (isLoading) {
    return (
      <ScreenWrapper scrollable={false}>
        <SkeletonLoader rows={5} />
      </ScreenWrapper>
    );
  }

  if (isError) {
    return (
      <ScreenWrapper scrollable={false}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <View style={styles.summaryBar}>
        <Text style={styles.summaryTitle}>My assignments</Text>
        <Text style={styles.summaryLine}>
          {myWork.length} customers · {formatINR(outstandingTotal)} outstanding
        </Text>
        <Text style={styles.summaryLine}>
          Collected today: {formatINR(data?.todayTotal ?? 0)} · Confirmed: {data?.confirmedToday ?? 0}
        </Text>
        <View style={styles.collectCta}>
          <Button label="Record payment" variant="secondary" onPress={() => navigation.navigate('RecordPayment')} />
          <Button label="View collection history" variant="secondary" onPress={onOpenHistory} />
        </View>
      </View>
      <FlatList
        data={myWork}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            title="No assigned work"
            subtitle="Use Collect Payment in the menu to search and claim customers from the open pool."
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>
                {item.name} · {item.customer_id}
              </Text>
              <CollectionStatusBadge status={item.collectionStatus ?? item.assignmentType} />
            </View>
            <AmountDisplay amount={item.outstanding_amount} />
            {item.next_due_date ? <Text style={styles.due}>Due: {item.next_due_date}</Text> : null}
            <View style={styles.row}>
              <Button label="History" variant="secondary" onPress={() => onViewHistory(item)} />
              <Button label="Collect →" onPress={() => onCollect(item)} />
            </View>
          </View>
        )}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  summaryBar: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  summaryTitle: { fontWeight: '700', color: adminColors.primary, marginBottom: spacing.xs },
  summaryLine: { fontSize: 13, color: colors.textSecondary },
  collectCta: { marginTop: spacing.sm, gap: spacing.sm },
  list: { padding: spacing.md, paddingTop: 0 },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xs,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: { fontWeight: '600', color: colors.textPrimary, flex: 1 },
  due: { fontSize: 12, color: colors.amber },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
