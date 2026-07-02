import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminButton, AdminScreenLayout, AdminEmptyState, AdminStateShell, FilterChips, RoleGuard, StatusBadge } from '@/components/admin';
import {
  useApprovalRequests,
  useReviewApproval,
} from '@/hooks/attendance/useAdminAttendance';
import { useAttendanceRealtimeSync } from '@/hooks/attendance/useAttendanceRealtimeSync';
import {
  useBulkReviewApprovalsMutation,
  useGetApprovalAuditLogQuery,
  useGetApprovalRequestsQuery,
} from '@/services/api/attendanceApi';
import type { ApprovalAuditEntry, ApprovalRequest } from '@/types/attendance';
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

function AuditLogPanel({ requestId }: { requestId: string }) {
  const { data, isLoading, isError, error } = useGetApprovalAuditLogQuery(requestId);

  if (isLoading) {
    return <Text style={styles.auditLoading}>Loading audit log…</Text>;
  }

  if (isError) {
    return <Text style={styles.auditError}>{queryErrorMessage(error)}</Text>;
  }

  const entries = data ?? [];
  if (entries.length === 0) {
    return <Text style={styles.auditEmpty}>No audit entries yet.</Text>;
  }

  return (
    <View style={styles.auditPanel}>
      <Text style={styles.auditTitle}>Audit log</Text>
      {entries.map((entry: ApprovalAuditEntry) => (
        <View key={entry.id} style={styles.auditRow}>
          <Text style={styles.auditAction}>
            {entry.action === 'approve' ? 'Approved' : 'Rejected'} by {entry.performedByName}
          </Text>
          <Text style={styles.auditMeta}>{formatDateTime(entry.createdAt)}</Text>
          {entry.notes ? <Text style={styles.auditNotes}>{entry.notes}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function ApprovalRequestCard({
  item,
  selected,
  expanded,
  selectionMode,
  onToggleSelect,
  onToggleExpand,
  onApprove,
  onReject,
  reviewing,
}: {
  item: ApprovalRequest;
  selected: boolean;
  expanded: boolean;
  selectionMode: boolean;
  onToggleSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  reviewing: boolean;
}) {
  const distanceLabel = formatDistance(item.distanceFromFence);
  const locationLabel = item.geofenceName || 'Unassigned zone';

  return (
    <Pressable
      onPress={() => {
        if (selectionMode && item.status === 'pending') {
          onToggleSelect(item.id);
          return;
        }
        onToggleExpand(item.id);
      }}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          {selectionMode && item.status === 'pending' ? (
            <Text style={styles.selectMark}>{selected ? '☑' : '☐'}</Text>
          ) : null}
          <View style={styles.cardTitleText}>
            <Text style={styles.officerName}>{item.officerName || 'Unknown officer'}</Text>
            <Text style={styles.requestType}>{formatRequestType(item.type)}</Text>
          </View>
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

      {expanded ? <AuditLogPanel requestId={item.id} /> : null}

      {item.status === 'pending' && !selectionMode ? (
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
    </Pressable>
  );
}

function SummaryStrip({
  tab,
  filteredCount,
  pendingTotal,
  allTotal,
}: {
  tab: FilterTab;
  filteredCount: number;
  pendingTotal: number;
  allTotal: number;
}) {
  const label =
    tab === 'pending'
      ? `Showing ${filteredCount} of ${pendingTotal} pending`
      : tab === 'all'
        ? `Showing ${filteredCount} of ${allTotal} total`
        : `Showing ${filteredCount} ${tab}`;

  return (
    <View style={styles.summaryStrip}>
      <View style={styles.summaryCell}>
        <Text style={[styles.summaryValue, styles.summaryValuePending]}>{pendingTotal}</Text>
        <Text style={styles.summaryLabel}>Pending</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryCell}>
        <Text style={styles.summaryValue}>{filteredCount}</Text>
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
    </View>
  );
}

export function ApprovalRequestsScreen(_props: Props) {
  useAttendanceRealtimeSync();
  const [tab, setTab] = useState<FilterTab>('pending');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: allData } = useGetApprovalRequestsQuery({});
  const { data, isLoading, isError, error, refetch, isFetching } = useApprovalRequests({
    status: tab === 'all' ? undefined : tab,
  });
  const [review, { isLoading: reviewing }] = useReviewApproval();
  const [bulkReview, { isLoading: bulkReviewing }] = useBulkReviewApprovalsMutation();

  const records = data ?? [];
  const allRecords = allData ?? [];
  const pendingTotal = useMemo(
    () => allRecords.filter((r) => r.status === 'pending').length,
    [allRecords],
  );

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

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const runBulkAction = useCallback(
    (action: 'approve' | 'reject') => {
      if (selectedIds.length === 0) return;

      Alert.alert(
        action === 'approve' ? 'Bulk approve' : 'Bulk reject',
        `${action === 'approve' ? 'Approve' : 'Reject'} ${selectedIds.length} selected request(s)?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: action === 'approve' ? 'Approve all' : 'Reject all',
            style: action === 'reject' ? 'destructive' : 'default',
            onPress: () => {
              void bulkReview({
                ids: selectedIds,
                action,
                reason: action === 'reject' ? 'Bulk rejected by admin' : undefined,
              })
                .unwrap()
                .then((result) => {
                  if (result.failed.length > 0) {
                    Alert.alert(
                      'Partial success',
                      `${result.succeeded.length} updated, ${result.failed.length} failed.`,
                    );
                  }
                  setSelectedIds([]);
                  setSelectionMode(false);
                  refetch();
                })
                .catch((e) => Alert.alert('Bulk action failed', queryErrorMessage(e)));
            },
          },
        ],
      );
    },
    [bulkReview, refetch, selectedIds],
  );

  const renderItem = useCallback(
    ({ item }: { item: ApprovalRequest }) => (
      <ApprovalRequestCard
        item={item}
        selected={selectedIds.includes(item.id)}
        expanded={expandedId === item.id}
        selectionMode={selectionMode}
        onToggleSelect={toggleSelect}
        onToggleExpand={toggleExpand}
        reviewing={reviewing || bulkReviewing}
        onApprove={(id) => void handleApprove(id)}
        onReject={(id) => void handleReject(id)}
      />
    ),
    [
      bulkReviewing,
      expandedId,
      handleApprove,
      handleReject,
      reviewing,
      selectedIds,
      selectionMode,
      toggleExpand,
      toggleSelect,
    ],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <SummaryStrip
          tab={tab}
          filteredCount={records.length}
          pendingTotal={pendingTotal}
          allTotal={allRecords.length}
        />
        <FilterChips options={FILTER_OPTIONS} selected={tab} onSelect={setTab} />
        {tab === 'pending' ? (
          <View style={styles.bulkToolbar}>
            <AdminButton
              label={selectionMode ? 'Cancel selection' : 'Select multiple'}
              variant="ghost"
              onPress={() => {
                setSelectionMode((v) => !v);
                setSelectedIds([]);
              }}
            />
            {selectionMode ? (
              <>
                <AdminButton
                  label={`Approve (${selectedIds.length})`}
                  onPress={() => runBulkAction('approve')}
                  disabled={selectedIds.length === 0 || bulkReviewing}
                />
                <AdminButton
                  label={`Reject (${selectedIds.length})`}
                  variant="secondary"
                  onPress={() => runBulkAction('reject')}
                  disabled={selectedIds.length === 0 || bulkReviewing}
                />
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    ),
    [
      allRecords.length,
      bulkReviewing,
      pendingTotal,
      records.length,
      runBulkAction,
      selectedIds.length,
      selectionMode,
      tab,
    ],
  );

  return (
    <RoleGuard requiredPermission="attendance.edit">
      <AdminStateShell
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        loadingRows={6}
        loadingShape="card"
      >
      <AdminScreenLayout>
        <FlatList
          data={records}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          contentContainerStyle={adminScreenStyles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isFetching || reviewing || bulkReviewing}
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
      </AdminScreenLayout>
      </AdminStateShell>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  listHeader: { gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  bulkToolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
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
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
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
  cardSelected: {
    borderColor: adminColors.primary,
    backgroundColor: adminColors.primaryTint,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardTitleBlock: { flex: 1, flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
  cardTitleText: { flex: 1, gap: 2 },
  selectMark: { fontSize: 18, color: adminColors.primary, marginTop: 2 },
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
    backgroundColor: adminColors.surfaceMuted,
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
  auditPanel: {
    backgroundColor: adminColors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  auditTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  auditRow: { gap: 2, paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderDefault },
  auditAction: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  auditMeta: { fontSize: 12, color: colors.textSecondary },
  auditNotes: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' },
  auditLoading: { fontSize: 12, color: colors.textSecondary },
  auditError: { fontSize: 12, color: colors.errorRed },
  auditEmpty: { fontSize: 12, color: colors.textSecondary },
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
