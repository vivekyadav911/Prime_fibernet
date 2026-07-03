import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminButton, AdminScreenLayout, DateField, FormField, RoleGuard, SelectField } from '@/components/admin';
import { useAttendanceOverride } from '@/hooks/attendance/useAdminAttendance';
import { useGetOfficersQuery } from '@/services/api/officersApi';
import { setAdminRecordsPrefs } from '@/store/slices/attendanceSlice';
import { useAppDispatch } from '@/store/hooks';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { getLocalDateString } from '@/utils/dateUtils';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'ManualAttendanceEntry'>;

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'half_day', label: 'Half day' },
  { value: 'on_leave', label: 'On leave' },
];

const FUTURE_ALLOWED_STATUSES = new Set(['on_leave', 'holiday']);

export function ManualAttendanceEntryScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { data: officers, isLoading: officersLoading, isError, error } = useGetOfficersQuery();
  const [override, { isLoading: saving }] = useAttendanceOverride();

  const [officerId, setOfficerId] = useState('');
  const [date, setDate] = useState(getLocalDateString());
  const [checkInTime, setCheckInTime] = useState('09:00');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [status, setStatus] = useState('present');
  const [reason, setReason] = useState('');
  const [confirmOverride, setConfirmOverride] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const officerOptions = useMemo(
    () =>
      (officers ?? []).map((o) => ({
        value: o.id,
        label: o.name?.trim() || 'Unknown officer',
      })),
    [officers],
  );

  const isFutureDate = date > getLocalDateString();

  const buildIsoTime = useCallback(
    (time: string) => {
      if (!time.trim()) return undefined;
      const [hours, minutes] = time.split(':');
      const dt = new Date(date);
      dt.setHours(Number(hours), Number(minutes), 0, 0);
      return dt.toISOString();
    },
    [date],
  );

  const handleSave = useCallback(async () => {
    if (!officerId) {
      setFormError('Select an officer');
      return;
    }
    if (!reason.trim()) {
      setFormError('A reason is required for manual entries');
      return;
    }

    if (isFutureDate && !FUTURE_ALLOWED_STATUSES.has(status)) {
      setFormError('Future dates only allow on leave or holiday status');
      return;
    }

    setFormError(null);

    try {
      await override({
        officerId,
        date,
        checkIn: buildIsoTime(checkInTime),
        checkOut: checkOutTime ? buildIsoTime(checkOutTime) : undefined,
        status,
        reason: reason.trim(),
        confirmOverride,
      }).unwrap();

      dispatch(
        setAdminRecordsPrefs({
          selectedDate: date,
          viewMode: 'list',
          useDateRange: false,
        }),
      );

      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (e) {
      const message = queryErrorMessage(e);
      if (message.includes('CONFIRM_OVERRIDE_REQUIRED')) {
        setFormError(
          'This date has a geofence-verified check-in. Enable override confirmation below and provide a reason.',
        );
        return;
      }
      setFormError(message);
    }
  }, [
    buildIsoTime,
    checkInTime,
    checkOutTime,
    confirmOverride,
    date,
    dispatch,
    isFutureDate,
    navigation,
    officerId,
    override,
    reason,
    status,
  ]);

  return (
    <RoleGuard requiredPermission="attendance.edit">
      <AdminScreenLayout>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Manual attendance entry</Text>
          <Text style={styles.subtitle}>
            Use for device failure, GPS issues, or other edge cases. Entries are validated server-side,
            upserted per officer/date, and written to the audit trail.
          </Text>

          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          {isError ? <Text style={styles.error}>{queryErrorMessage(error)}</Text> : null}
          {isFutureDate && !FUTURE_ALLOWED_STATUSES.has(status) ? (
            <Text style={styles.warning}>
              Future dates cannot be marked present, absent, late, or half day.
            </Text>
          ) : null}

          <SelectField
            label="Officer"
            value={officerId}
            options={officerOptions}
            onSelect={setOfficerId}
            placeholder={officersLoading ? 'Loading officers…' : 'Select officer'}
          />

          <DateField label="Date" value={date} onChange={setDate} placeholder="Select date" />

          <FormField
            label="Check-in time"
            value={checkInTime}
            onChangeText={setCheckInTime}
            placeholder="09:00"
          />

          <FormField
            label="Check-out time (optional)"
            value={checkOutTime}
            onChangeText={setCheckOutTime}
            placeholder="18:00"
          />

          <SelectField
            label="Status"
            value={status}
            options={STATUS_OPTIONS}
            onSelect={setStatus}
            placeholder="Select status"
          />

          <FormField
            label="Reason (required)"
            value={reason}
            onChangeText={setReason}
            placeholder="GPS failure / device offline / approved exception"
            multiline
          />

          <View style={styles.overrideRow}>
            <Text style={styles.overrideLabel}>
              Confirm override of geofence-verified check-in
            </Text>
            <AdminButton
              label={confirmOverride ? 'Override confirmed' : 'Enable override'}
              variant={confirmOverride ? 'primary' : 'secondary'}
              onPress={() => setConfirmOverride((value) => !value)}
            />
          </View>

          <AdminButton
            label={saving ? 'Saving…' : 'Save manual entry'}
            onPress={() => void handleSave()}
            disabled={saving || officersLoading}
          />
        </ScrollView>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, gap: spacing.sm },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  error: { color: colors.errorRed, fontSize: 13 },
  warning: { color: colors.textSecondary, fontSize: 13 },
  overrideRow: { gap: spacing.xs },
  overrideLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
});
