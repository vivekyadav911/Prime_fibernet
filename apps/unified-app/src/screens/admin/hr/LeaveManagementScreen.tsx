import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { RoleGuard, StatusBadge } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useLeaveRequests, useReviewLeave } from '@/hooks/attendance/useAdminAttendance';
import type { LeaveRequestRecord } from '@/types/attendance';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'LeaveManagement'>;
type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

function LeaveCard({
  item,
  onApprove,
  onReject,
}: {
  item: LeaveRequestRecord;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{item.officerName}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.meta}>
        {item.leaveType} · {item.fromDate} → {item.toDate} ({item.days} days)
      </Text>
      <Text style={styles.reason}>{item.reason}</Text>
      {item.status === 'pending' ? (
        <View style={styles.actions}>
          <Button label="Reject" variant="ghost" onPress={() => onReject(item.id)} />
          <Button label="Approve" onPress={() => onApprove(item.id)} />
        </View>
      ) : null}
    </View>
  );
}

export function LeaveManagementScreen(_props: Props) {
  const [tab, setTab] = useState<FilterTab>('pending');
  const { data, isLoading, isError, error, refetch } = useLeaveRequests({
    status: tab === 'all' ? undefined : tab,
  });
  const [reviewLeave, { isLoading: reviewing }] = useReviewLeave();

  const handleApprove = useCallback(
    async (id: string) => {
      await reviewLeave({ id, action: 'approve' });
      refetch();
    },
    [refetch, reviewLeave],
  );

  const handleReject = useCallback(
    async (id: string) => {
      await reviewLeave({ id, action: 'reject', reason: 'Rejected' });
      refetch();
    },
    [refetch, reviewLeave],
  );

  const renderItem = useCallback(
    ({ item }: { item: LeaveRequestRecord }) => (
      <LeaveCard
        item={item}
        onApprove={(id) => void handleApprove(id)}
        onReject={(id) => void handleReject(id)}
      />
    ),
    [handleApprove, handleReject],
  );

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={6} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  const tabs: FilterTab[] = ['all', 'pending', 'approved', 'rejected'];

  return (
    <RoleGuard requiredPermission="attendance.edit">
      <Screen padded={false} style={styles.canvas}>
        <Text style={styles.title}>Leave management</Text>
        <View style={styles.tabs}>
          {tabs.map((t) => (
            <Button
              key={t}
              label={t}
              variant={tab === t ? 'primary' : 'ghost'}
              onPress={() => setTab(t)}
            />
          ))}
        </View>
        <FlatList
          data={data ?? []}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          refreshing={reviewing}
          onRefresh={refetch}
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  canvas: { backgroundColor: adminColors.canvasBg },
  title: { fontSize: 18, fontWeight: '700', padding: spacing.md, color: colors.textPrimary },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.sm, gap: spacing.xs },
  card: {
    backgroundColor: adminColors.cardBg,
    margin: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xs,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
  reason: { fontSize: 13, color: colors.textPrimary },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
});
