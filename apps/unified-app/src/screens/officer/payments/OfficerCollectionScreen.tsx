import { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '@prime/ui';

import { AmountDisplay } from '@/components/payments';
import { EmptyState, ErrorState, ScreenWrapper, SkeletonLoader } from '@/components/common';
import { useOfficerCollectionsSync } from '@/hooks/officer/useOfficerCollectionsSync';
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

type Section = { title: string; data: OfficerAssignedCustomer[] };

export function OfficerCollectionScreen() {
  useOfficerCollectionsSync();

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

  const sections = useMemo<Section[]>(() => {
    const assigned = data?.assigned ?? [];
    const openPool = data?.openPool ?? [];
    const result: Section[] = [];
    if (assigned.length) result.push({ title: 'My assignments', data: assigned });
    if (openPool.length) result.push({ title: 'Open pool (any officer)', data: openPool });
    return result;
  }, [data?.assigned, data?.openPool]);

  const outstandingTotal = useMemo(
    () => sections.flatMap((s) => s.data).reduce((sum, c) => sum + c.outstanding_amount, 0),
    [sections],
  );

  const totalCustomers = useMemo(
    () => sections.reduce((sum, section) => sum + section.data.length, 0),
    [sections],
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

  const renderCustomer = (item: OfficerAssignedCustomer) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.name}>
          {item.name} · {item.customer_id}
        </Text>
        {item.assignmentType === 'open_pool' ? (
          <View style={styles.poolBadge}>
            <Text style={styles.poolBadgeText}>Open pool</Text>
          </View>
        ) : null}
      </View>
      <AmountDisplay amount={item.outstanding_amount} />
      {item.next_due_date ? <Text style={styles.due}>Due: {item.next_due_date}</Text> : null}
      {item.payment_status ? <Text style={styles.status}>{item.payment_status}</Text> : null}
      <View style={styles.row}>
        <Button label="History" variant="secondary" onPress={() => onViewHistory(item)} />
        <Button label="Collect →" onPress={() => onCollect(item)} />
      </View>
    </View>
  );

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      {tabs}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryTitle}>Collection customers</Text>
        <Text style={styles.summaryLine}>
          {totalCustomers} customers · {formatINR(outstandingTotal)} outstanding
        </Text>
        <Text style={styles.summaryLine}>
          Collected today: {formatINR(data?.todayTotal ?? 0)} · Confirmed: {data?.confirmedToday ?? 0}
        </Text>
        <View style={styles.collectCta}>
          <Button label="Collect payment" onPress={onSearchCollect} />
        </View>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <EmptyState
            title="No customers to collect"
            subtitle="Ask admin to assign customers or add them to the open pool."
            actionLabel="Open collect list"
            onAction={onSearchCollect}
          />
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item }) => renderCustomer(item)}
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
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
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: { fontWeight: '600', color: colors.textPrimary, flex: 1 },
  poolBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    backgroundColor: adminColors.primaryTint,
    borderWidth: 1,
    borderColor: adminColors.permissionBoxBorder,
  },
  poolBadgeText: { fontSize: 11, fontWeight: '600', color: adminColors.primary },
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
