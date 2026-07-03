import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AdminScreenLayout,
  AdminEmptyState,
  AdminStateShell,
  FilterChips,
  RoleGuard,
  StatusBadge,
} from '@/components/admin';
import {
  useListPlanChangeRequestsQuery,
  useReviewPlanChangeRequestMutation,
  type AdminPlanChangeRequest,
} from '@/services/api/adminPlanChangesApi';
import type { AdminPlansStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { formatCustomerAccountId } from '@/utils/customerAccount';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminPlansStackParamList, 'PlanChangeRequests'>;
type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

const FILTER_OPTIONS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCycle(cycle: string): string {
  return cycle.charAt(0).toUpperCase() + cycle.slice(1);
}

function PlanChangeCard({
  item,
  reviewing,
  onApprove,
  onReject,
}: {
  item: AdminPlanChangeRequest;
  reviewing: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const accountId = formatCustomerAccountId(item.customerAccountId, item.customerId);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <Text style={styles.accountId}>Account {accountId}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.planRow}>
        <Text style={styles.planLabel}>From</Text>
        <Text style={styles.planValue}>{item.currentPlanName ?? '—'}</Text>
      </View>
      <View style={styles.planRow}>
        <Text style={styles.planLabel}>To</Text>
        <Text style={styles.planValue}>{item.requestedPlanName ?? '—'}</Text>
      </View>
      <Text style={styles.metaLine}>
        {formatCycle(item.requestedCycle)} billing · {formatDateTime(item.createdAt)}
      </Text>

      {item.reason ? (
        <View style={styles.reasonBlock}>
          <Text style={styles.reasonLabel}>Customer reason</Text>
          <Text style={styles.reasonText}>{item.reason}</Text>
        </View>
      ) : null}

      {item.adminNotes && item.status !== 'pending' ? (
        <Text style={styles.adminNotes}>Admin note: {item.adminNotes}</Text>
      ) : null}

      {item.status === 'pending' ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reject plan change"
            disabled={reviewing}
            onPress={() => onReject(item.id)}
            style={({ pressed }) => [styles.rejectBtn, pressed && styles.btnPressed]}
          >
            <Text style={styles.rejectBtnText}>Reject</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Approve plan change"
            disabled={reviewing}
            onPress={() => onApprove(item.id)}
            style={({ pressed }) => [styles.approveBtn, pressed && styles.btnPressed]}
          >
            <Text style={styles.approveBtnText}>Approve</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function PlanChangeRequestsScreen(_props: Props) {
  const [filter, setFilter] = useState<FilterTab>('pending');
  const { data, isLoading, isError, error, refetch, isFetching } = useListPlanChangeRequestsQuery(
    filter === 'all' ? undefined : { status: filter },
  );
  const [review, { isLoading: reviewing }] = useReviewPlanChangeRequestMutation();

  const rows = useMemo(() => data ?? [], [data]);
  const pendingCount = useMemo(() => rows.filter((r) => r.status === 'pending').length, [rows]);

  const handleApprove = useCallback(
    (id: string) => {
      Alert.alert('Approve plan change', 'Apply this plan to the customer subscription?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            void review({ id, action: 'approve' })
              .unwrap()
              .catch((e: unknown) => {
                Alert.alert('Could not approve', queryErrorMessage(e));
              });
          },
        },
      ]);
    },
    [review],
  );

  const handleReject = useCallback(
    (id: string) => {
      if (Alert.prompt) {
        Alert.prompt(
          'Reject plan change',
          'Optional note for the customer',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reject',
              style: 'destructive',
              onPress: (notes?: string) => {
                void review({ id, action: 'reject', adminNotes: notes })
                  .unwrap()
                  .catch((e: unknown) => {
                    Alert.alert('Could not reject', queryErrorMessage(e));
                  });
              },
            },
          ],
          'plain-text',
        );
        return;
      }

      Alert.alert('Reject plan change', 'Decline this request?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            void review({ id, action: 'reject' })
              .unwrap()
              .catch((e: unknown) => {
                Alert.alert('Could not reject', queryErrorMessage(e));
              });
          },
        },
      ]);
    },
    [review],
  );

  const listHeader = (
    <View style={styles.header}>
      <Text style={styles.title}>Plan change requests</Text>
      <Text style={styles.subtitle}>
        {filter === 'pending' ? `${pendingCount} pending review` : `${rows.length} requests`}
      </Text>
      <FilterChips options={FILTER_OPTIONS} selected={filter} onSelect={setFilter} />
    </View>
  );

  return (
    <RoleGuard requiredPermission="plans.edit">
      <AdminStateShell
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        loadingRows={6}
        loadingShape="card"
      >
        <AdminScreenLayout padded={false}>
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            contentContainerStyle={adminScreenStyles.listContent}
            ListHeaderComponent={listHeader}
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            ListEmptyComponent={
              <AdminEmptyState
                title="No plan change requests"
                subtitle={
                  filter === 'pending'
                    ? 'New customer plan upgrades will appear here for review.'
                    : 'No requests match this filter.'
                }
                iconName="swap-horizontal-outline"
              />
            }
            renderItem={({ item }) => (
              <PlanChangeCard
                item={item}
                reviewing={reviewing}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            )}
          />
        </AdminScreenLayout>
      </AdminStateShell>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardTitleBlock: { flex: 1 },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  accountId: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  planLabel: {
    width: 40,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  planValue: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  metaLine: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  reasonBlock: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  adminNotes: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.errorRed,
    alignItems: 'center',
  },
  rejectBtnText: {
    color: colors.errorRed,
    fontWeight: '600',
  },
  approveBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: adminColors.primary,
    alignItems: 'center',
  },
  approveBtnText: {
    color: colors.white,
    fontWeight: '600',
  },
  btnPressed: { opacity: 0.85 },
});
