import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Button } from '@prime/ui';

import { AmountDisplay, CollectionStatusBadge } from '@/components/payments';
import { EmptyState, ErrorState, ScreenWrapper, SkeletonLoader } from '@/components/common';
import { useClaimCollection } from '@/hooks/officer/useClaimCollection';
import { useGetOfficerAssignedCustomersQuery } from '@/services/api/paymentCollectionApi';
import { formatINR } from '@/utils/currencyFormat';
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
  const { claim, isLoading: claiming } = useClaimCollection();

  const openPool = useMemo(
    () =>
      (data ?? []).filter(
        (c) => c.assignmentType === 'open_pool' && c.collectionStatus === 'open',
      ),
    [data],
  );

  const outstandingTotal = useMemo(
    () => openPool.reduce((sum, c) => sum + c.outstanding_amount, 0),
    [openPool],
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

  const onClaim = useCallback(
    async (customer: OfficerAssignedCustomer) => {
      try {
        await claim(customer.id).unwrap();
        Alert.alert('Claimed', `${customer.name} is now in My Work under Collections.`);
        refetch();
      } catch (e) {
        Alert.alert('Cannot claim', e instanceof Error ? e.message : 'Try again.');
      }
    },
    [claim, refetch],
  );

  return (
    <ScreenWrapper scrollable={false}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          Customers admin placed in the open pool. Search and claim to add them to My Work under
          Collections.
        </Text>
      </View>

      <Text style={styles.label}>Search open pool</Text>
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

      {!isLoading && !isError ? (
        <Text style={styles.summaryLine}>
          {openPool.length} customers · {formatINR(outstandingTotal)} outstanding
        </Text>
      ) : null}

      {isLoading || (isFetching && !data) ? <SkeletonLoader rows={4} /> : null}

      {isError ? <ErrorState message={queryErrorMessage(error)} onRetry={refetch} /> : null}

      {!isLoading && !isError ? (
        <FlatList
          data={openPool}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="Open pool is empty"
              subtitle={
                debouncedQuery
                  ? 'No matches in the open pool. Try another search.'
                  : 'No customers in the open pool. Admin must release customers to the pool first.'
              }
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
              {item.phone ? <Text style={styles.meta}>{item.phone}</Text> : null}
              <AmountDisplay amount={item.outstanding_amount} />
              {item.next_due_date ? <Text style={styles.due}>Due: {item.next_due_date}</Text> : null}
              {item.payment_status ? (
                <Text style={styles.status}>{item.payment_status}</Text>
              ) : null}
              <View style={styles.actions}>
                <Button label="History" variant="secondary" onPress={() => onViewHistory(item)} />
                <Button
                  label="Claim"
                  onPress={() => void onClaim(item)}
                  disabled={claiming}
                />
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
  searchRow: { marginBottom: spacing.sm },
  summaryLine: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
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
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  meta: { fontSize: 13, color: colors.textSecondary },
  due: { fontSize: 12, color: colors.textSecondary },
  status: {
    fontSize: 12,
    color: adminColors.primary,
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
