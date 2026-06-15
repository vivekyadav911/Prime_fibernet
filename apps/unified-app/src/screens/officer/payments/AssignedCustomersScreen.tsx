import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { AmountDisplay } from '@/components/payments';
import { EmptyState, ErrorState, ScreenWrapper, SkeletonLoader } from '@/components/common';
import { useGetOfficerAssignedCustomersQuery } from '@/services/api/paymentCollectionApi';
import type { OfficerCollectionsStackParamList } from '@/types/navigation';
import type { OfficerAssignedCustomer } from '@/types/payments';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

export function AssignedCustomersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OfficerCollectionsStackParamList>>();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetOfficerAssignedCustomersQuery(debouncedQuery);

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
          Showing customers assigned to you by admin. Search is limited to your assigned list only.
        </Text>
      </View>

      <Text style={styles.label}>SEARCH ASSIGNED CUSTOMERS</Text>
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
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="No assigned customers"
              subtitle={
                debouncedQuery
                  ? 'No matches in your assigned list. Try another search.'
                  : 'Ask admin to assign customers for collection.'
              }
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable onPress={() => onCollect(item)}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.customer_id}
                  {item.phone ? ` · ${item.phone}` : ''}
                </Text>
                <AmountDisplay amount={item.outstanding_amount} />
                {item.next_due_date ? (
                  <Text style={styles.due}>Due: {item.next_due_date}</Text>
                ) : null}
                {item.payment_status ? (
                  <Text style={styles.status}>{item.payment_status}</Text>
                ) : null}
              </Pressable>
              <View style={styles.actions}>
                <Pressable style={styles.historyBtn} onPress={() => onViewHistory(item)}>
                  <Text style={styles.historyBtnText}>History</Text>
                </Pressable>
                <Pressable style={styles.collectBtn} onPress={() => onCollect(item)}>
                  <Text style={styles.collectBtnText}>Collect</Text>
                </Pressable>
              </View>
            </View>
          )}
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
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  name: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
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
