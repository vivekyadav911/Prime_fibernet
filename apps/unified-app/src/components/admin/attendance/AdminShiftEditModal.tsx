import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminButton } from '@/components/admin/AdminButton';
import { FormField } from '@/components/admin/FormField';
import { DismissKeyboardScrollView } from '@/components/common';
import { useAttendanceOverride } from '@/hooks/attendance/useAdminAttendance';
import { useKeyboardBottomInset } from '@/hooks/useKeyboardBottomInset';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AttendanceRecord } from '@/types/attendance';
import { parseLocalDateString } from '@/utils/dateUtils';
import { queryErrorMessage } from '@/utils/queryError';

type Props = {
  visible: boolean;
  record: AttendanceRecord | null;
  onClose: () => void;
  onSaved?: () => void;
};

function isoToTimeInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function buildIsoTime(date: string, time: string): string | undefined {
  if (!time.trim()) return undefined;
  const [hours, minutes] = time.split(':');
  const dt = parseLocalDateString(date);
  dt.setHours(Number(hours), Number(minutes), 0, 0);
  return dt.toISOString();
}

function isGeofenceVerified(method: AttendanceRecord['checkInMethod']): boolean {
  return method === 'geofence_auto' || method === 'manual_inside' || method === 'approved_outside';
}

export function AdminShiftEditModal({ visible, record, onClose, onSaved }: Props) {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardBottomInset(spacing.md);
  const [override, { isLoading: saving }] = useAttendanceOverride();

  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [reason, setReason] = useState('');
  const [confirmOverride, setConfirmOverride] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isActive = Boolean(record?.checkInTime && !record?.checkOutTime);
  const isCompleted = Boolean(record?.checkInTime && record?.checkOutTime);
  const needsOverride = record ? isGeofenceVerified(record.checkInMethod) && Boolean(record.checkInTime) : false;

  useEffect(() => {
    if (!visible || !record) return;
    setCheckInTime(isoToTimeInput(record.checkInTime) || '');
    setCheckOutTime(isoToTimeInput(record.checkOutTime) || '');
    setReason('');
    setConfirmOverride(false);
    setFormError(null);
  }, [record, visible]);

  const status = useMemo(() => record?.status ?? 'present', [record?.status]);

  const persist = useCallback(
    async (payload: { checkIn?: string; checkOut?: string; forceOverride?: boolean }) => {
      if (!record) return;
      if (!reason.trim() || reason.trim().length < 3) {
        setFormError('A reason of at least 3 characters is required');
        return;
      }
      if (needsOverride && !confirmOverride && !payload.forceOverride) {
        setFormError('Confirm override for geofence-verified check-in');
        return;
      }

      setFormError(null);
      try {
        await override({
          officerId: record.officerId,
          date: record.date,
          checkIn: payload.checkIn,
          checkOut: payload.checkOut,
          status,
          reason: reason.trim(),
          confirmOverride: needsOverride || payload.forceOverride === true,
        }).unwrap();
        onSaved?.();
        onClose();
      } catch (e) {
        const message = queryErrorMessage(e);
        if (message.includes('CONFIRM_OVERRIDE_REQUIRED')) {
          setFormError('Enable override confirmation below — this shift was geofence-verified.');
          return;
        }
        setFormError(message);
      }
    },
    [confirmOverride, needsOverride, onClose, onSaved, override, reason, record, status],
  );

  const handleSave = useCallback(() => {
    if (!record) return;
    void persist({
      checkIn: buildIsoTime(record.date, checkInTime),
      checkOut: checkOutTime ? buildIsoTime(record.date, checkOutTime) : undefined,
    });
  }, [checkInTime, checkOutTime, persist, record]);

  const handleStartNow = useCallback(() => {
    if (!record) return;
    const now = new Date().toISOString();
    void persist({ checkIn: now, checkOut: undefined, forceOverride: true });
  }, [persist, record]);

  const handleEndNow = useCallback(() => {
    if (!record) return;
    const now = new Date().toISOString();
    const checkIn = record.checkInTime ?? buildIsoTime(record.date, checkInTime) ?? now;
    void persist({ checkIn, checkOut: now, forceOverride: true });
  }, [checkInTime, persist, record]);

  const handleReopenShift = useCallback(() => {
    if (!record?.checkInTime) return;
    void persist({
      checkIn: record.checkInTime,
      checkOut: undefined,
      forceOverride: true,
    });
  }, [persist, record]);

  if (!record) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable
          style={[styles.backdrop, { paddingTop: insets.top }]}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        >
          <Pressable
            style={[
              styles.sheet,
              {
                paddingBottom: Math.max(insets.bottom + spacing.md, keyboardInset),
                maxHeight: keyboardInset > 0 ? '78%' : '88%',
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <DismissKeyboardScrollView contentContainerStyle={styles.scroll}>
              <Text style={styles.title}>Edit shift</Text>
              <Text style={styles.subtitle}>
                {record.officerName} · {record.date}
              </Text>

              {formError ? <Text style={styles.error}>{formError}</Text> : null}

              <View style={styles.quickRow}>
                {!isActive ? (
                  <AdminButton
                    label="Start shift now"
                    variant="secondary"
                    onPress={() => void handleStartNow()}
                    disabled={saving || !reason.trim()}
                  />
                ) : null}
                {isActive ? (
                  <AdminButton
                    label="End shift now"
                    variant="secondary"
                    onPress={() => void handleEndNow()}
                    disabled={saving || !reason.trim()}
                  />
                ) : null}
                {isCompleted ? (
                  <AdminButton
                    label="Reopen shift"
                    variant="secondary"
                    onPress={() => void handleReopenShift()}
                    disabled={saving || !reason.trim()}
                  />
                ) : null}
              </View>

              <FormField
                label="Check-in time"
                value={checkInTime}
                onChangeText={setCheckInTime}
                placeholder="09:00"
              />
              <FormField
                label="Check-out time (leave empty for active shift)"
                value={checkOutTime}
                onChangeText={setCheckOutTime}
                placeholder="18:00"
              />
              <FormField
                label="Reason (required)"
                value={reason}
                onChangeText={setReason}
                placeholder="Officer finished by mistake / device issue"
                multiline
              />

              {needsOverride ? (
                <View style={styles.overrideRow}>
                  <Text style={styles.overrideLabel}>Override geofence-verified times</Text>
                  <AdminButton
                    label={confirmOverride ? 'Override confirmed' : 'Confirm override'}
                    variant={confirmOverride ? 'primary' : 'secondary'}
                    onPress={() => setConfirmOverride((v) => !v)}
                  />
                </View>
              ) : null}

              <View style={styles.actions}>
                <AdminButton label="Cancel" variant="ghost" onPress={onClose} disabled={saving} />
                <AdminButton
                  label={saving ? 'Saving…' : 'Save changes'}
                  onPress={() => void handleSave()}
                  disabled={saving}
                />
              </View>
            </DismissKeyboardScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  scroll: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md },
  title: { fontSize: 18, fontWeight: '700', color: adminColors.primary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.xs },
  error: { color: colors.errorRed, fontSize: 13 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  overrideRow: { gap: spacing.xs },
  overrideLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
