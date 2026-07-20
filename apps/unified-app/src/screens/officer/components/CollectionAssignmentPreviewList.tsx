import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';

import { AmountDisplay, CollectionStatusBadge } from '@/components/payments';
import { SkeletonLoader } from '@/components/common';
import { useClaimCollection } from '@/hooks/officer/useClaimCollection';
import { useOfficerCollections } from '@/hooks/usePayments';
import { navigateToOfficerPayments } from '@/navigation/officerShellNavigation';
import type { OfficerAssignedCustomer } from '@/types/payments';
import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/spacing';
import { selectCollectionDashboardPreview } from '@/utils/officerCollectionFilters';
import { queryErrorMessage } from '@/utils/queryError';

type Props = {
  limit?: number;
};

export function CollectionAssignmentPreviewList({ limit = 3 }: Props) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { data, isLoading, isError, error, refetch } = useOfficerCollections();
  const { claim, isLoading: claiming } = useClaimCollection();

  const preview = useMemo(
    () => selectCollectionDashboardPreview(data?.myWork ?? [], data?.openPool ?? [], limit),
    [data?.myWork, data?.openPool, limit],
  );

  const openCollections = useCallback(() => {
    navigateToOfficerPayments(navigation, { screen: 'CollectionsList' });
  }, [navigation]);

  const onCollect = useCallback(
    (customer: OfficerAssignedCustomer) => {
      navigateToOfficerPayments(navigation, {
        screen: 'CashCollection',
        params: {
          customerId: customer.id,
          customerName: customer.name,
          accountNumber: customer.customer_id,
          amount: customer.outstanding_amount,
          dueDate: customer.next_due_date ?? undefined,
        },
      });
    },
    [navigation],
  );

  const onClaim = useCallback(
    async (customer: OfficerAssignedCustomer) => {
      try {
        await claim(customer.id).unwrap();
        Alert.alert('Assigned', `${customer.name} is now under Assigned to me.`);
        await refetch();
      } catch (e) {
        Alert.alert('Cannot claim', e instanceof Error ? e.message : 'Try again.');
      }
    },
    [claim, refetch],
  );

  const onItemAction = useCallback(
    (customer: OfficerAssignedCustomer) => {
      if (customer.assignmentType === 'open_pool') {
        void onClaim(customer);
        return;
      }
      onCollect(customer);
    },
    [onClaim, onCollect],
  );

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Collection assignments</Text>
        <Pressable onPress={openCollections} style={styles.viewAll} accessibilityRole="button">
          <Text style={styles.viewAllText}>View All →</Text>
        </Pressable>
      </View>

      {isLoading && !data ? (
        <SkeletonLoader rows={2} rowHeight={88} shape="card" />
      ) : isError ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Could not load assignments</Text>
          <Text style={styles.emptySubtitle}>{queryErrorMessage(error)}</Text>
        </View>
      ) : preview.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No collection assignments</Text>
          <Text style={styles.emptySubtitle}>
            Direct assignments and open-pool customers will appear here
          </Text>
        </View>
      ) : (
        preview.map((item) => {
          const isPool = item.assignmentType === 'open_pool';
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.customerId} numberOfLines={1}>
                  {item.name} · {item.customer_id}
                </Text>
                <CollectionStatusBadge status={item.collectionStatus ?? item.assignmentType} />
              </View>
              {item.phone ? <Text style={styles.meta}>{item.phone}</Text> : null}
              <AmountDisplay amount={item.outstanding_amount} />
              {item.next_due_date ? (
                <Text style={styles.due}>Due: {item.next_due_date}</Text>
              ) : null}
              <Pressable
                style={styles.collectBtn}
                onPress={() => onItemAction(item)}
                disabled={claiming}
              >
                <Text style={styles.collectText}>{isPool ? 'Pick up →' : 'Collect →'}</Text>
              </Pressable>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.primaryNavy },
  viewAll: { minHeight: 48, justifyContent: 'center' },
  viewAllText: { color: colors.accentTeal, fontWeight: '600', fontSize: 14 },
  emptyCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xxs,
    ...shadow.card,
  },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  customerId: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.primaryNavy },
  meta: { fontSize: 13, color: colors.textSecondary },
  due: { fontSize: 12, color: colors.textSecondary },
  collectBtn: {
    alignSelf: 'flex-start',
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: colors.accentTeal,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  collectText: { color: colors.white, fontWeight: '700', fontSize: 14 },
});
