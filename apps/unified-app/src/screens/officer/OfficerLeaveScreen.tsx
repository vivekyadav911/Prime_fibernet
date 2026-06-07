import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput } from 'react-native';
import { Button, Screen, StatusChip, colors } from '@prime/ui';

import { useAppSelector } from '@/store/hooks';
import { useCreateLeaveRequestMutation, useGetLeaveRequestsQuery } from '@/store/api/endpoints';

export function OfficerLeaveScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data, refetch } = useGetLeaveRequestsQuery(user?.id ?? '', { skip: !user?.id });
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

  return (
    <Screen>
      <Text style={styles.title}>Leave request</Text>
      <TextInput style={styles.input} placeholder="Leave type (casual/sick)" value={leaveType} onChangeText={setLeaveType} />
      <TextInput style={styles.input} placeholder="Start date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} />
      <TextInput style={styles.input} placeholder="End date (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} />
      <TextInput style={styles.input} placeholder="Reason" value={reason} onChangeText={setReason} multiline />
      <Button label="Submit leave request" onPress={onSubmit} style={styles.btn} />
      <Text style={styles.historyTitle}>Previous requests</Text>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text style={styles.row}>
            {item.leaveType} · {item.startDate} to {item.endDate} · <StatusChip status={item.status} />
          </Text>
        )}
        ListEmptyComponent={<Text style={styles.muted}>No leave requests</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '600', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.surfaceWhite,
  },
  btn: { marginBottom: 24 },
  historyTitle: { fontWeight: '600', marginBottom: 8 },
  row: { paddingVertical: 8, color: colors.textSecondary },
  muted: { color: colors.textSecondary },
});
