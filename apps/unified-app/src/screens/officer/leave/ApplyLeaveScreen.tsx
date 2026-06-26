import { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LeaveType } from '@/types/attendance';
import { Button } from '@prime/ui';

import { SelectField } from '@/components/admin';
import { DateRangePicker, ScreenWrapper, ToggleSwitch } from '@/components/common';
import { useApplyLeave } from '@/hooks/attendance/useAttendance';
import type { OfficerLeaveStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type Props = NativeStackScreenProps<OfficerLeaveStackParamList, 'ApplyLeave'>;

const LEAVE_TYPES: LeaveType[] = ['casual', 'sick', 'earned', 'unpaid', 'compensatory'];

export function ApplyLeaveScreen({ navigation }: Props) {
  const [applyLeave, { isLoading: submitting }] = useApplyLeave();
  const [leaveType, setLeaveType] = useState<LeaveType>('casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);

  const onSubmit = useCallback(async () => {
    if (!startDate || !endDate || !reason.trim()) return;
    await applyLeave({
      leaveType,
      fromDate: startDate,
      toDate: endDate,
      reason: reason.trim(),
      isHalfDay,
      halfDayPeriod: isHalfDay ? 'morning' : undefined,
    });
    navigation.goBack();
  }, [applyLeave, endDate, isHalfDay, leaveType, navigation, reason, startDate]);

  return (
    <ScreenWrapper>
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
        fromLabel="From date"
        toLabel="To date"
      />

      <View style={styles.halfDayRow}>
        <Text style={styles.halfDayLabel}>Half day</Text>
        <ToggleSwitch value={isHalfDay} onValueChange={setIsHalfDay} />
      </View>

      <Text style={styles.label}>REASON</Text>
      <TextInput
        style={styles.input}
        placeholder="Reason for leave"
        value={reason}
        onChangeText={setReason}
        multiline
        placeholderTextColor={colors.textSecondary}
      />

      <Button
        label={submitting ? 'Submitting…' : 'Submit Leave Request'}
        onPress={() => void onSubmit()}
        disabled={submitting}
        style={styles.cta}
      />
      <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  halfDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.sm,
  },
  halfDayLabel: { color: colors.textPrimary, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    color: colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  cta: { marginTop: spacing.lg, minHeight: 48 },
});
