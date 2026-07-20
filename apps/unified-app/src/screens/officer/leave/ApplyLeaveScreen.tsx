import { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LeaveType } from '@/types/attendance';
import { Button } from '@prime/ui';

import { SelectField } from '@/components/admin';
import {DateRangePicker, DismissKeyboardScrollView, ToggleSwitch} from '@/components/common';
import { OfficerScreenWrapper } from '@/components/officer';
import { useOfficerPullToRefresh } from '@/hooks/officer';
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
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit = useCallback(async () => {
    setValidationError(null);
    setSubmitError(null);

    if (!startDate || !endDate) {
      setValidationError('Please select a start and end date.');
      return;
    }
    if (!reason.trim()) {
      setValidationError('Please provide a reason for leave.');
      return;
    }

    try {
      await applyLeave({
        leaveType,
        fromDate: startDate,
        toDate: endDate,
        reason: reason.trim(),
        isHalfDay,
        halfDayPeriod: isHalfDay ? 'morning' : undefined,
      });
      navigation.goBack();
    } catch (err) {
      setSubmitError((err as Error).message ?? 'Failed to submit leave request. Please try again.');
    }
  }, [applyLeave, endDate, isHalfDay, leaveType, navigation, reason, startDate]);

  const { refreshControl } = useOfficerPullToRefresh();

  return (
    <OfficerScreenWrapper scrollable={false} padded={false}>
      <DismissKeyboardScrollView contentContainerStyle={styles.scroll} refreshControl={refreshControl}>
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

      {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}
      {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

      <Button
        label={submitting ? 'Submitting…' : 'Submit Leave Request'}
        onPress={() => void onSubmit()}
        disabled={submitting}
        style={styles.cta}
      />
      <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
      </DismissKeyboardScrollView>
    </OfficerScreenWrapper>
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
  scroll: { paddingBottom: spacing.xl },
  errorText: { color: colors.errorRed, fontSize: 13, marginTop: spacing.xs },
});
