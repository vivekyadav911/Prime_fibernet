import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { AdminEmptyState, FilterChips, RoleGuard, StatusBadge } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useApprovalRequests, useReviewApproval } from '@/hooks/attendance/useAdminAttendance';
import type { ApprovalRequest } from '@/types/attendance';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'ApprovalRequests'>;
type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

const PAGE_PADDING = spacing.lg;
const CARD_RADIUS = 22;

const FILTER_OPTIONS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function formatRequestType(type: string): string {
  return type.replace(/_/g, ' ');
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDistance(meters: number): string {
  if (meters <= 0) return '';
  if (meters < 1000) return `${Math.round(meters)} m from zone`;
  return `${(meters / 1000).toFixed(1)} km from zone`;
}

function ApprovalRequestCard({
  item,
  onApprove,
  onReject,
  reviewing,
}: {
  item: ApprovalRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  reviewing: boolean;
}) {
  const distanceLabel = formatDistance(item.distanceFromFence);
  const locationLabel = item.geofenceName || 'Unassigned zone';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.officerName}>{item.officerName}</Text>
          <Text style={styles.requestType}>{formatRequestType(item.type)}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.metaBlock}>
        <Text style={styles.metaLine}>{formatDateTime(item.requestedAt)}</Text>
        <Text style={styles.metaLine}>
          {locationLabel}
          {distanceLabel ? ` · ${distanceLabel}` : ''}
        </Text>
      </View>

      {item.reason ? (
        <View style={styles.reasonBlock}>
          <Text style={styles.reasonLabel}>Reason</Text>
          <Text style={styles.reasonText}>{item.reason}</Text>
        </View>
      ) : null}

      {item.reviewNotes && item.status !== 'pending' ? (
        <Text style={styles.reviewNotes}>Review note: {item.reviewNotes}</Text>
      ) : null}

      {item.status === 'pending' ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reject request"
            disabled={reviewing}
            onPress={() => onReject(item.id)}
            style={({ pressed }) => [styles.rejectBtn, pressed && styles.btnPressed]}
          >
            <Text style={styles.rejectBtnText}>Reject</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Approve request"
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

function SummaryStrip({ pending, total }: { pending: number; total: number }) {
  return (
    <View style={styles.summaryStrip}>
      <View style={styles.summaryCell}>
        <Text style={[styles.summaryValue, styles.summaryValuePending]}>{pending}</Text>
        <Text style={styles.summaryLabel}>Pending</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryCell}>
        <Text style={styles.summaryValue}>{total}</Text>
        <Text style={styles.summaryLabel}>Showing</Text>
      </View>
    </View>
  );
}

export function ApprovalRequestsScreen(_props: Props) {
  const [tab, setTab] = useState<FilterTab>('pending');
  const { data, isLoading, isError, error, refetch, isFetching } = useApprovalRequests({
    status: tab === 'all' ? undefined : tab,
  });
  const [review, { isLoading: reviewing }] = useReviewApproval();

  const handleApprove = useCallback(
    async (id: string) => {
      await review({ id, action: 'approve' });
      refetch();
    },
    [refetch, review],
  );

  const handleReject = useCallback(
    async (id: string) => {
      await review({ id, action: 'reject', reason: 'Rejected by admin' });
      refetch();
    },
    [refetch, review],
  );

  const records = data ?? [];
  const pendingCount = useMemo(
    () => records.filter((r) => r.status === 'pending').length,
    [records],
  );

  const renderItem = useCallback(
    ({ item }: { item: ApprovalRequest }) => (
      <ApprovalRequestCard
        item={item}
        reviewing={reviewing}
        onApprove={(id) => void handleApprove(id)}
        onReject={(id) => void handleReject(id)}
      />
    ),
    [handleApprove, handleReject, reviewing],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <SummaryStrip pending={pendingCount} total={records.length} />
        <FilterChips options={FILTER_OPTIONS} selected={tab} onSelect={setTab} />
      </View>
    ),
    [pendingCount, records.length, tab],
  );

  if (isLoading) {
    return (
      <Screen safeAreaTop={false}>
        <SkeletonLoader rows={6} shape="card" />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen safeAreaTop={false} style={adminScreenStyles.canvas}>
        <View style={styles.stateCard}>
          <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
        </View>
      </Screen>
    );
  }

  return (
    <RoleGuard requiredPermission="attendance.edit">
      <Screen padded={false} safeAreaTop={false} style={adminScreenStyles.canvas}>
        <FlatList
          data={records}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          contentContainerStyle={adminScreenStyles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isFetching || reviewing}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <AdminEmptyState
                title="No approval requests"
                subtitle={
                  tab === 'pending'
                    ? 'Officer check-in exceptions will appear here when they need your review.'
                    : 'No requests match this filter right now.'
                }
                iconName="checkmark-circle-outline"
              />
            </View>
          }
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  listHeader: { gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: adminColors.cardBg,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
  },
  summaryCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 2,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderDefault,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  summaryValuePending: { color: adminColors.badgePending },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardTitleBlock: { flex: 1, gap: 2 },
  officerName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  requestType: {
    fontSize: 13,
    fontWeight: '600',
    color: adminColors.primary,
    textTransform: 'capitalize',
  },
  metaBlock: { gap: 4 },
  metaLine: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  reasonBlock: {
    backgroundColor: '#F9FAFB',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 4,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  reasonText: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  reviewNotes: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  rejectBtn: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWhite,
  },
  rejectBtnText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  approveBtn: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: adminColors.primary,
  },
  approveBtnText: { fontSize: 14, fontWeight: '600', color: colors.white },
  btnPressed: { opacity: 0.85 },
  emptyCard: {
    backgroundColor: adminColors.cardBg,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    marginTop: spacing.xs,
  },
  stateCard: {
    flex: 1,
    margin: PAGE_PADDING,
    backgroundColor: adminColors.cardBg,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    justifyContent: 'center',
  },
});
