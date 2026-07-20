import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '@prime/ui';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { Coordinates, Geofence } from '@/types/attendance';
import { formatOutsideZoneDistance } from '@/utils/formatDistance';

type Props = {
  mode: 'check_in' | 'approval';
  geofence: Geofence | null;
  coords: Coordinates | null;
  distance: number;
  isInside: boolean;
  onConfirm: (payload: { notes?: string; reason?: string }) => void;
  onDismiss: () => void;
  isLoading?: boolean;
};

function isValidCoord(coords: Coordinates | null | undefined): coords is Coordinates {
  return (
    coords != null &&
    Number.isFinite(coords.latitude) &&
    Number.isFinite(coords.longitude) &&
    Math.abs(coords.latitude) <= 90 &&
    Math.abs(coords.longitude) <= 180
  );
}

export const CheckInSheet = forwardRef<BottomSheetModal, Props>(function CheckInSheet(
  { mode, geofence, coords, distance, isInside, onConfirm, onDismiss, isLoading },
  ref,
) {
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const snapPoints = useMemo(() => ['75%'], []);

  const handleConfirm = useCallback(() => {
    if (mode === 'approval') {
      onConfirm({ reason });
    } else {
      onConfirm({ notes });
    }
  }, [distance, geofence, isInside, mode, notes, onConfirm, reason]);

  const safeCoords = isValidCoord(coords) ? coords : null;

  const radiusM =
    geofence?.geometry.shape === 'circle' && Number.isFinite(geofence.geometry.radius)
      ? geofence.geometry.radius
      : null;

  const outsideLabel = formatOutsideZoneDistance(
    Number.isFinite(distance) ? distance : null,
    radiusM,
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      onDismiss={onDismiss}
      enableDynamicSizing={false}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Text style={styles.title}>
            {mode === 'check_in' ? 'Check In' : 'Request Attendance Approval'}
          </Text>

          {geofence ? (
            <Text style={styles.subtitle}>
              {isInside
                ? `Inside ${geofence.name}`
                : outsideLabel
                  ? `Outside ${geofence.name} — ${outsideLabel}`
                  : `Outside ${geofence.name}`}
            </Text>
          ) : (
            <Text style={styles.subtitle}>No zone selected — request will still be sent to admin.</Text>
          )}

          {/* ponytail: no MapView in Gorhom sheet — Android native crash; text location only */}
          <View style={styles.mapFallback}>
            <Text style={styles.mapFallbackText}>
              {safeCoords
                ? `Your location: ${safeCoords.latitude.toFixed(5)}, ${safeCoords.longitude.toFixed(5)}`
                : 'Waiting for GPS fix…'}
            </Text>
          </View>

          {mode === 'check_in' ? (
            <TextInput
              style={styles.input}
              placeholder="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholderTextColor={colors.textSecondary}
            />
          ) : (
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Reason (optional)"
              value={reason}
              onChangeText={setReason}
              multiline
              placeholderTextColor={colors.textSecondary}
            />
          )}

          <Button
            label={mode === 'check_in' ? 'Confirm check in' : 'Submit approval request'}
            onPress={handleConfirm}
            disabled={isLoading || (mode === 'approval' && !safeCoords)}
          />
          {mode === 'approval' && !safeCoords ? (
            <Text style={styles.hint}>Location is required to submit an approval request.</Text>
          ) : null}
        </KeyboardAvoidingView>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  mapFallback: {
    height: 88,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.xxs,
  },
  mapFallbackText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 8,
    padding: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    color: colors.textPrimary,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: colors.red },
});
