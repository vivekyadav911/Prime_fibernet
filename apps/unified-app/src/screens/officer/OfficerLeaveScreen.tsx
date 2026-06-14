import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import type { LeaveRequestRecord, LeaveType } from '@/types/attendance';
import { Button, Screen } from '@prime/ui';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import { SelectField } from '@/components/admin';
import { DateRangePicker, EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import {
  useApplyLeave,
  useCancelLeave,
  useLeaveBalances,
  useMyLeaveRequests,
} from '@/hooks/attendance/useAttendance';
import { queryErrorMessage } from '@/utils/queryError';

const LEAVE_TYPES: LeaveType[] = ['casual', 'sick', 'earned', 'unpaid', 'compensatory'];

function LeaveHistoryRow({
  item,
  onCancel,
}: {
  item: LeaveRequestRecord;
  onCancel: (id: string) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{item.leaveType} · {item.fromDate} → {item.toDate}</Text>
      <Text style={styles.rowStatus}>{item.status}</Text>
      {item.status === 'pending' ? (
        <Button label="Cancel" variant="ghost" onPress={() => onCancel(item.id)} />
      ) : null}
    </View>
  );
}

export function OfficerLeaveScreen() {
  const { data, isLoading, isError, error, refetch } = useMyLeaveRequests();
  const { data: balances } = useLeaveBalances();
  const [applyLeave, { isLoading: submitting }] = useApplyLeave();
  const [cancelLeave] = useCancelLeave();

  const [leaveType, setLeaveType] = useState<LeaveType>('casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);

  const onSubmit = useCallback(async () => {
    if (!startDate || !endDate || !reason) return;
    await applyLeave({
      leaveType,
      fromDate: startDate,
      toDate: endDate,
      reason,
      isHalfDay,
      halfDayPeriod: isHalfDay ? 'morning' : undefined,
    });
    setReason('');
    refetch();
  }, [applyLeave, endDate, isHalfDay, leaveType, reason, refetch, startDate]);

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
      <Screen>
        <SkeletonLoader rows={6} showAvatar />
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

  const casualBalance = balances?.find((b) => b.leaveType === 'casual');

  return (
    <Screen>
      <Text style={styles.title}>Leave application</Text>
      {casualBalance ? (
        <Text style={styles.balance}>
          Casual: {casualBalance.remainingDays}/{casualBalance.totalDays} days remaining
        </Text>
      ) : null}

      <View style={styles.chips}>
        {LEAVE_TYPES.map((t) => (
          <Pressable
            key={t}
            style={[styles.chip, leaveType === t && styles.chipActive]}
            onPress={() => setLeaveType(t)}
          >
            <Text style={[styles.chipText, leaveType === t && styles.chipTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <SelectField
        label="Leave type"
        value={leaveType}
        options={LEAVE_TYPES.map((t) => ({ label: t, value: t }))}
        onSelect={setLeaveType}
      />

      <DateRangePicker
        from={startDate}
        to={endDate}
        onFromChange={setStartDate}
        onToChange={setEndDate}
        fromLabel="Start date"
        toLabel="End date"
      />

      <View style={styles.halfDayRow}>
        <Text style={styles.halfDayLabel}>Half day</Text>
        <Switch value={isHalfDay} onValueChange={setIsHalfDay} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Reason"
        value={reason}
        onChangeText={setReason}
        multiline
        placeholderTextColor={colors.textSecondary}
      />

      <Button
        label={submitting ? 'Submitting…' : 'Submit leave request'}
        onPress={() => void onSubmit()}
        disabled={submitting}
        style={styles.btn}
      />

      <Text style={styles.historyTitle}>Previous requests</Text>
      {!data?.length ? (
        <EmptyState title="No leave requests" subtitle="Submitted requests will appear here" icon="🏖️" />
      ) : (
        <FlatList data={data} keyExtractor={(item) => item.id} renderItem={renderItem} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '600', marginBottom: spacing.sm, color: colors.textPrimary },
  balance: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  chipActive: { backgroundColor: colors.primaryNavy, borderColor: colors.primaryNavy },
  chipText: { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: colors.white },
  halfDayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  halfDayLabel: { color: colors.textPrimary, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  btn: { marginBottom: spacing.lg },
  historyTitle: { fontWeight: '600', marginBottom: spacing.sm, color: colors.textPrimary },
  row: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderColor: colors.borderDefault },
  rowTitle: { fontWeight: '600', color: colors.textPrimary, textTransform: 'capitalize' },
  rowStatus: { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
});
