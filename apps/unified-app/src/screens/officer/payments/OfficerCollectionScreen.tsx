import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '@prime/ui';

import { AmountDisplay } from '@/components/payments';
import { EmptyState, ErrorState, ScreenWrapper, SkeletonLoader } from '@/components/common';
import { useOfficerId } from '@/hooks/useOfficerId';
import { useOfficerCollections } from '@/hooks/usePayments';
import { formatINR } from '@/utils/currencyFormat';
import type { OfficerCollectionsStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

import type { PaymentRecord } from '@/types/payments';
import { OfficerCollectionHistoryScreen } from './OfficerCollectionHistoryScreen';

type TabKey = 'today' | 'history';

export function OfficerCollectionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OfficerCollectionsStackParamList>>();
  const officerId = useOfficerId();
  const [tab, setTab] = useState<TabKey>('today');
  const { data, isLoading, isError, error, refetch } = useOfficerCollections(officerId ?? '');

  const onCollect = useCallback(
    (customer: PaymentRecord) => {
      navigation.navigate('CashCollection', {
        customerId: customer.customer_id,
        customerName: customer.customer_name,
        accountNumber: customer.account_number,
        amount: customer.total_amount,
        dueDate: customer.due_date ?? undefined,
        planName: customer.plan_name ?? undefined,
      });
    },
    [navigation],
  );

  if (!officerId) {
    return (
      <ScreenWrapper scrollable={false}>
        <ErrorState message="Officer profile not found." />
      </ScreenWrapper>
    );
  }

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

  const pending = data?.pending ?? [];
  const pendingTotal = pending.reduce((sum, p) => sum + p.total_amount, 0);

  const tabs = (
    <View style={styles.tabs}>
      {(['today', 'history'] as TabKey[]).map((key) => (
        <Pressable
          key={key}
          style={[styles.tab, tab === key && styles.tabActive]}
          onPress={() => setTab(key)}
        >
          <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
            {key === 'today' ? 'Today' : 'History'}
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
        <Text style={styles.summaryTitle}>Today&apos;s Summary</Text>
        <Text style={styles.summaryLine}>
          Pending: {pending.length} customers · {formatINR(pendingTotal)}
        </Text>
        <Text style={styles.summaryLine}>
          Collected: {formatINR(data?.todayTotal ?? 0)} · Pending confirm: {data?.confirmedToday ?? 0}
        </Text>
      </View>
      <FlatList
        data={pending}
        keyExtractor={(item) => item.customer_id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState title="No pending collections" subtitle="Assigned customers with due bills appear here." />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>
              {item.customer_name} · {item.account_number}
            </Text>
            <AmountDisplay amount={item.total_amount} />
            {item.plan_name ? <Text style={styles.plan}>{item.plan_name}</Text> : null}
            {item.due_date ? <Text style={styles.due}>Due: {item.due_date}</Text> : null}
            <View style={styles.row}>
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
  tabActive: { backgroundColor: colors.primaryNavy, borderColor: colors.primaryNavy },
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
  summaryTitle: { fontWeight: '700', color: colors.primaryNavy, marginBottom: spacing.xs },
  summaryLine: { fontSize: 13, color: colors.textSecondary },
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
  plan: { fontSize: 13, color: colors.textSecondary },
  due: { fontSize: 12, color: colors.amber },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
});
