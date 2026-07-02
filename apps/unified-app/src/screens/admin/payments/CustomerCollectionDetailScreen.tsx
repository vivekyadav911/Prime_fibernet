import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { CollectionStatusBadge, PaymentStatusBadge } from '@/components/payments';
import { AdminScreenLayout, AdminStateShell } from '@/components/admin';
import { useCustomerCollectionHistory } from '@/hooks/usePayments';
import { useGetCustomerCollectionDetailQuery } from '@/services/api/collectionAssignmentsApi';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import type { AdminPaymentsStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { formatINR } from '@/utils/currencyFormat';

type Props = NativeStackScreenProps<AdminPaymentsStackParamList, 'CustomerCollectionDetail'>;

export function CustomerCollectionDetailScreen({ route }: Props) {
  const { customerId } = route.params;
  const { data: customer, isLoading: customerLoading } = useGetCustomerCollectionDetailQuery(customerId);
  const { data: events, isLoading, isError, error, refetch } = useCustomerCollectionHistory(customerId);

  return (
    <AdminStateShell
      isLoading={customerLoading || isLoading}
      isError={isError}
      error={error}
      onRetry={refetch}
      loadingRows={6}
    >
      <AdminScreenLayout padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{customer?.name ?? 'Customer'}</Text>
        <Text style={styles.meta}>
          {customer?.customerId}
          {customer?.phone ? ` · ${customer.phone}` : ''}
        </Text>
        {customer ? (
          <View style={styles.row}>
            <CollectionStatusBadge status={customer.collectionStatus} />
            <Text style={styles.amount}>{formatINR(customer.outstandingAmount)} outstanding</Text>
          </View>
        ) : null}
        {customer?.assignedOfficerName ? (
          <Text style={styles.assigned}>Assigned: {customer.assignedOfficerName}</Text>
        ) : null}
        {customer?.claimedByOfficerName ? (
          <Text style={styles.assigned}>Claimed by: {customer.claimedByOfficerName}</Text>
        ) : null}
      </View>

      <Text style={styles.sectionLabel}>ASSIGNMENT HISTORY</Text>
      <FlatList
        data={events ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[adminScreenStyles.listContent, styles.list]}
        ListEmptyComponent={<Text style={styles.empty}>No assignment events yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.eventCard}>
            <View style={styles.eventHeader}>
              {item.event_source === 'payment' ? (
                <PaymentStatusBadge status={item.status as 'confirmed' | 'refunded' | 'pending_review' | 'cash_collected'} />
              ) : (
                <CollectionStatusBadge status={item.status} />
              )}
              <Text style={styles.eventDate}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
            {item.notes ? <Text style={styles.eventNotes}>{item.notes}</Text> : null}
            {item.actor_role ? (
              <Text style={styles.eventActor}>By {item.actor_role}</Text>
            ) : null}
          </View>
        )}
      />
      </AdminScreenLayout>
    </AdminStateShell>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: spacing.md,
    backgroundColor: adminColors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    gap: spacing.xs,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  meta: { color: colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  amount: { fontWeight: '600', color: adminColors.primary },
  assigned: { fontSize: 13, color: colors.textSecondary },
  sectionLabel: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  list: { padding: spacing.md, paddingTop: 0, gap: spacing.sm },
  eventCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eventDate: { fontSize: 12, color: colors.textSecondary },
  eventNotes: { color: colors.textPrimary },
  eventActor: { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
  empty: { color: colors.textSecondary, padding: spacing.md },
});
