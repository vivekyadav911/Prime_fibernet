import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '@prime/ui';

import { AmountDisplay } from '@/components/payments';
import { EmptyState, ErrorState, ScreenWrapper, SkeletonLoader } from '@/components/common';
import { useOfficerCollections } from '@/hooks/usePayments';
import { formatINR } from '@/utils/currencyFormat';
import type { OfficerCollectionsStackParamList } from '@/types/navigation';
import type { OfficerAssignedCustomer } from '@/types/payments';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

import { OfficerCollectionHistoryScreen } from './OfficerCollectionHistoryScreen';

type TabKey = 'assigned' | 'history';

export function OfficerCollectionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OfficerCollectionsStackParamList>>();
  const [tab, setTab] = useState<TabKey>('assigned');
  const { data, isLoading, isError, error, refetch } = useOfficerCollections();

  const onSearchCollect = useCallback(() => {
    navigation.navigate('AssignedCustomers');
  }, [navigation]);

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

  const assigned = data?.assigned ?? [];
  const outstandingTotal = assigned.reduce((sum, c) => sum + c.outstanding_amount, 0);

  const tabs = (
    <View style={styles.tabs}>
      {(['assigned', 'history'] as TabKey[]).map((key) => (
        <Pressable
          key={key}
          style={[styles.tab, tab === key && styles.tabActive]}
          onPress={() => setTab(key)}
        >
          <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
            {key === 'assigned' ? 'Collect' : 'History'}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  if (tab === 'history') {
    return (
      <ScreenWrapper scrollable={false} padded={false}>
        {tabs}
        <OfficerCollectionHistoryScreen embedded />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      {tabs}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryTitle}>Assigned customers</Text>
        <Text style={styles.summaryLine}>
          {assigned.length} customers · {formatINR(outstandingTotal)} outstanding
        </Text>
        <Text style={styles.summaryLine}>
          Collected today: {formatINR(data?.todayTotal ?? 0)} · Confirmed: {data?.confirmedToday ?? 0}
        </Text>
        <View style={styles.collectCta}>
          <Button label="Collect payment" onPress={onSearchCollect} />
        </View>
      </View>
      <FlatList
        data={assigned}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            title="No assigned customers"
            subtitle="Ask admin to assign customers to you for collection."
            actionLabel="Open collect list"
            onAction={onSearchCollect}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>
              {item.name} · {item.customer_id}
            </Text>
            <AmountDisplay amount={item.outstanding_amount} />
            {item.next_due_date ? <Text style={styles.due}>Due: {item.next_due_date}</Text> : null}
            {item.payment_status ? (
              <Text style={styles.status}>{item.payment_status}</Text>
            ) : null}
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
  tabs: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceWhite,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  tabActive: { backgroundColor: adminColors.primary, borderColor: adminColors.primary },
  tabText: { fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.white },
  summaryBar: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  summaryTitle: { fontWeight: '700', color: adminColors.primary, marginBottom: spacing.xs },
  summaryLine: { fontSize: 13, color: colors.textSecondary },
  collectCta: { marginTop: spacing.sm },
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
  name: { fontWeight: '600', color: colors.textPrimary },
  status: { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
  due: { fontSize: 12, color: colors.amber },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
