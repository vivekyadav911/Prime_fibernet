import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { AmountDisplay } from '@/components/payments';
import { EmptyState, ErrorState, ScreenWrapper, SkeletonLoader } from '@/components/common';
import { useOfficerCollectionsSync } from '@/hooks/officer/useOfficerCollectionsSync';
import { useGetOfficerAssignedCustomersQuery } from '@/services/api/paymentCollectionApi';
import type { OfficerCollectionsStackParamList } from '@/types/navigation';
import type { OfficerAssignedCustomer } from '@/types/payments';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

export function AssignedCustomersScreen() {
  useOfficerCollectionsSync();

  const navigation = useNavigation<NativeStackNavigationProp<OfficerCollectionsStackParamList>>();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetOfficerAssignedCustomersQuery(debouncedQuery);

  const sections = useMemo(() => {
    const assigned = (data ?? []).filter((c) => c.assignmentType === 'assigned');
    const openPool = (data ?? []).filter((c) => c.assignmentType === 'open_pool');
    return { assigned, openPool };
  }, [data]);

  const listData = useMemo(() => {
    const rows: Array<{ type: 'header'; title: string } | { type: 'customer'; customer: OfficerAssignedCustomer }> =
      [];
    if (sections.assigned.length) {
      rows.push({ type: 'header', title: 'My assignments' });
      sections.assigned.forEach((customer) => rows.push({ type: 'customer', customer }));
    }
    if (sections.openPool.length) {
      rows.push({ type: 'header', title: 'Open pool (any officer)' });
      sections.openPool.forEach((customer) => rows.push({ type: 'customer', customer }));
    }
    return rows;
  }, [sections]);

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

  return (
    <ScreenWrapper scrollable={false}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          My assignments are yours only. Open pool customers can be collected by any officer.
        </Text>
      </View>

      <Text style={styles.label}>SEARCH CUSTOMERS</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Name, account ID, or phone"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {isLoading || (isFetching && !data) ? <SkeletonLoader rows={4} /> : null}

      {isError ? <ErrorState message={queryErrorMessage(error)} onRetry={refetch} /> : null}

      {!isLoading && !isError ? (
        <FlatList
          data={listData}
          keyExtractor={(item, index) =>
            item.type === 'header' ? `header-${item.title}` : item.customer.id
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="No customers to collect"
              subtitle={
                debouncedQuery
                  ? 'No matches in your collection list.'
                  : 'Ask admin to assign customers or add them to the open pool.'
              }
            />
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return <Text style={styles.sectionTitle}>{item.title}</Text>;
            }

            const customer = item.customer;
            return (
              <View style={styles.card}>
                <Pressable onPress={() => onCollect(customer)}>
                  <View style={styles.cardTop}>
                    <Text style={styles.name}>{customer.name}</Text>
                    {customer.assignmentType === 'open_pool' ? (
                      <View style={styles.poolBadge}>
                        <Text style={styles.poolBadgeText}>Open pool</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.meta}>
                    {customer.customer_id}
                    {customer.phone ? ` · ${customer.phone}` : ''}
                  </Text>
                  <AmountDisplay amount={customer.outstanding_amount} />
                  {customer.next_due_date ? (
                    <Text style={styles.due}>Due: {customer.next_due_date}</Text>
                  ) : null}
                  {customer.payment_status ? (
                    <Text style={styles.status}>{customer.payment_status}</Text>
                  ) : null}
                </Pressable>
                <View style={styles.actions}>
                  <Pressable style={styles.historyBtn} onPress={() => onViewHistory(customer)}>
                    <Text style={styles.historyBtnText}>History</Text>
                  </Pressable>
                  <Pressable style={styles.collectBtn} onPress={() => onCollect(customer)}>
                    <Text style={styles.collectBtnText}>Collect</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      ) : null}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: adminColors.primaryTint,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: adminColors.permissionBoxBorder,
  },
  bannerText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  searchRow: { marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    fontSize: 15,
    color: colors.textPrimary,
  },
  list: { paddingBottom: spacing.lg },
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
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  poolBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    backgroundColor: adminColors.primaryTint,
    borderWidth: 1,
    borderColor: adminColors.permissionBoxBorder,
  },
  poolBadgeText: { fontSize: 11, fontWeight: '600', color: adminColors.primary },
  meta: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xxs },
  due: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
  status: {
    fontSize: 12,
    color: adminColors.primary,
    marginTop: spacing.xxs,
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  historyBtn: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  historyBtnText: { fontWeight: '600', color: colors.textSecondary },
  collectBtn: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: adminColors.primary,
  },
  collectBtnText: { fontWeight: '600', color: colors.white },
});
