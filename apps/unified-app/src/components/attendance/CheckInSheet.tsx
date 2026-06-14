import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Circle, Marker, Polygon } from 'react-native-maps';
import { Button } from '@prime/ui';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { Coordinates, Geofence } from '@/types/attendance';
import { circleToPolygon } from '@/utils/geofenceUtils';

type Props = {
  mode: 'check_in' | 'approval';
  geofence: Geofence | null;
  coords: Coordinates;
  distance: number;
  isInside: boolean;
  onConfirm: (payload: { notes?: string; reason?: string }) => void;
  onDismiss: () => void;
  isLoading?: boolean;
};

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
  }, [mode, notes, onConfirm, reason]);

  const mapRegion = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const polygonCoords =
    geofence?.geometry.shape === 'circle'
      ? circleToPolygon(geofence.geometry.center, geofence.geometry.radius, 32)
      : geofence?.geometry.shape === 'polygon'
        ? geofence.geometry.vertices
        : [];

  return (
    <BottomSheetModal ref={ref} snapPoints={snapPoints} onDismiss={onDismiss}>
      <BottomSheetView style={styles.content}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Text style={styles.title}>
            {mode === 'check_in' ? 'Check In' : 'Request Attendance Approval'}
          </Text>

          {geofence ? (
            <Text style={styles.subtitle}>
              {isInside
                ? `✅ Inside ${geofence.name}`
                : `⚠ ${(distance / 1000).toFixed(1)} km outside zone`}
            </Text>
          ) : null}

          <MapView style={styles.map} region={mapRegion}>
            <Marker coordinate={coords} />
            {geofence?.geometry.shape === 'circle' ? (
              <Circle
                center={geofence.geometry.center}
                radius={geofence.geometry.radius}
                strokeColor={colors.primaryNavy}
                fillColor="rgba(27,58,107,0.15)"
              />
            ) : polygonCoords.length >= 3 ? (
              <Polygon
                coordinates={polygonCoords}
                strokeColor={colors.primaryNavy}
                fillColor="rgba(27,58,107,0.15)"
              />
            ) : null}
          </MapView>

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
              placeholder="Reason (required, min 20 characters)"
              value={reason}
              onChangeText={setReason}
              multiline
              placeholderTextColor={colors.textSecondary}
            />
          )}

          <Button
            label={mode === 'check_in' ? 'Confirm check in' : 'Submit approval request'}
            onPress={handleConfirm}
            disabled={isLoading || (mode === 'approval' && reason.trim().length < 20)}
          />
        </KeyboardAvoidingView>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.sm },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  map: { height: 120, borderRadius: 8, overflow: 'hidden' },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 8,
    padding: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    color: colors.textPrimary,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
});
