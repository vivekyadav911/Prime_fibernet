import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { LeaveRequestRecord } from '@/types/attendance';
import { Button } from '@prime/ui';

import { EmptyState, ErrorState, ScreenWrapper, SkeletonLoader } from '@/components/common';
import {
  useCancelLeave,
  useLeaveBalances,
  useMyLeaveRequests,
} from '@/hooks/attendance/useAttendance';
import type { OfficerLeaveStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

function LeaveBalanceCard({
  leaveType,
  total,
  used,
  remaining,
}: {
  leaveType: string;
  total: number;
  used: number;
  remaining: number;
}) {
  return (
    <View style={styles.balanceCard}>
      <Text style={styles.balanceType}>{leaveType}</Text>
      <Text style={styles.balanceLine}>Used: {used}</Text>
      <Text style={styles.balanceRemain}>Left: {remaining}</Text>
      <Text style={styles.balanceTotal}>of {total}</Text>
    </View>
  );
}

function LeaveHistoryRow({
  item,
  onCancel,
}: {
  item: LeaveRequestRecord;
  onCancel: (id: string) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>
        {item.fromDate} – {item.toDate} · {item.leaveType}
      </Text>
      <Text style={styles.rowReason}>{item.reason}</Text>
      <Text style={styles.rowStatus}>{item.status}</Text>
      {item.status === 'pending' ? (
        <Button label="Cancel" variant="ghost" onPress={() => onCancel(item.id)} />
      ) : null}
    </View>
  );
}

export function OfficerLeaveScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OfficerLeaveStackParamList>>();
  const { data, isLoading, isError, error, refetch } = useMyLeaveRequests();
  const { data: balances } = useLeaveBalances();
  const [cancelLeave] = useCancelLeave();

  const handleCancel = useCallback(
    async (id: string) => {
      await cancelLeave(id);
      refetch();
    },
    [cancelLeave, refetch],
  );

  const renderItem = useCallback(
    ({ item }: { item: LeaveRequestRecord }) => (
      <LeaveHistoryRow item={item} onCancel={(id) => void handleCancel(id)} />
    ),
    [handleCancel],
  );

  if (isLoading) {
    return (
      <ScreenWrapper scrollable={false}>
        <SkeletonLoader rows={6} showAvatar />
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

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Leave Balance (This Year)</Text>
        <View style={styles.balanceRow}>
          {(balances ?? []).slice(0, 3).map((b) => (
            <LeaveBalanceCard
              key={b.leaveType}
              leaveType={b.leaveType}
              total={b.totalDays}
              used={b.usedDays}
              remaining={b.remainingDays}
            />
          ))}
        </View>
        <Pressable
          style={styles.applyBtn}
          onPress={() => navigation.navigate('ApplyLeave')}
        >
          <Text style={styles.applyText}>+ Apply Leave</Text>
        </Pressable>
      </View>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.historyTitle}>My Requests</Text>}
        ListEmptyComponent={
          <EmptyState title="No leave requests" subtitle="Submitted requests will appear here" icon="🏖️" />
        }
        renderItem={renderItem}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.md },
  title: { fontSize: 14, fontWeight: '700', color: colors.primaryNavy, marginBottom: spacing.sm },
  balanceRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  balanceCard: {
    flex: 1,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.sm,
    ...shadow.card,
  },
  balanceType: { fontWeight: '700', textTransform: 'capitalize', color: colors.textPrimary },
  balanceLine: { fontSize: 12, color: colors.textSecondary },
  balanceRemain: { fontSize: 16, fontWeight: '700', color: colors.accentTeal },
  balanceTotal: { fontSize: 11, color: colors.textSecondary },
  applyBtn: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryNavy,
    borderRadius: radius.md,
  },
  applyText: { color: colors.white, fontWeight: '700' },
  list: { padding: spacing.md, paddingTop: 0 },
  historyTitle: { fontWeight: '700', marginBottom: spacing.sm, color: colors.textPrimary },
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  rowTitle: { fontWeight: '600', color: colors.textPrimary, textTransform: 'capitalize' },
  rowReason: { color: colors.textSecondary, marginTop: 2 },
  rowStatus: { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize', marginTop: 4 },
});
