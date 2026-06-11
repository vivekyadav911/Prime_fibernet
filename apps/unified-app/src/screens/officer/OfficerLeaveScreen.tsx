import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput } from 'react-native';
import type { LeaveRequest } from '@prime/types';
import { Button, Screen } from '@prime/ui';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import { DateRangePicker, EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { useAppSelector } from '@/store/hooks';
import { useCreateLeaveRequestMutation, useGetLeaveRequestsQuery } from '@/store/api/endpoints';
import { queryErrorMessage } from '@/utils/queryError';

import { LeaveRequestRow } from './components/LeaveRequestRow';

export function OfficerLeaveScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data, isLoading, isError, error, refetch } = useGetLeaveRequestsQuery(user?.id ?? '', { skip: !user?.id });
  const [createLeave] = useCreateLeaveRequestMutation();
  const [leaveType, setLeaveType] = useState('casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const onSubmit = async () => {
    if (!user || !startDate || !endDate || !reason) return;
    await createLeave({ userId: user.id, leaveType, startDate, endDate, reason });
    setReason('');
    refetch();
  };

  const keyExtractor = useCallback((item: LeaveRequest) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: LeaveRequest }) => <LeaveRequestRow leave={item} />,
    [],
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

  return (
    <Screen>
      <Text style={styles.title}>Leave request</Text>
      <TextInput style={styles.input} placeholder="Leave type (casual/sick)" value={leaveType} onChangeText={setLeaveType} />
      <DateRangePicker
        from={startDate}
        to={endDate}
        onFromChange={setStartDate}
        onToChange={setEndDate}
        fromLabel="Start date"
        toLabel="End date"
      />
      <TextInput style={styles.input} placeholder="Reason" value={reason} onChangeText={setReason} multiline />
      <Button label="Submit leave request" onPress={onSubmit} style={styles.btn} />
      <Text style={styles.historyTitle}>Previous requests</Text>
      {!data?.length ? (
        <EmptyState title="No leave requests" subtitle="Submitted requests will appear here" icon="🏖️" />
      ) : (
        <FlatList data={data} keyExtractor={keyExtractor} renderItem={renderItem} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '600', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: 8,
    backgroundColor: colors.surfaceWhite,
  },
  btn: { marginBottom: 24 },
  historyTitle: { fontWeight: '600', marginBottom: 8 },
});
