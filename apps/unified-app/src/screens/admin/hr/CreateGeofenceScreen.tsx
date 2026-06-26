import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { GeofenceLocationControls } from '@/components/attendance/GeofenceLocationControls';
import { GeofenceLocationPicker } from '@/components/attendance/GeofenceLocationPicker';
import { FormField, RoleGuard } from '@/components/admin';
import { SkeletonLoader } from '@/components/common';
import { useCreateGeofence, useGeofence, useUpdateGeofence } from '@/hooks/attendance/useAdminAttendance';
import { reverseGeocode } from '@/services/GeocodingService';
import type { Coordinates } from '@/types/attendance';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { resolveGeofenceAddressFields } from '@/utils/geofenceDisplay';
import {
  GEOFENCE_RADIUS_MAX_M,
  GEOFENCE_RADIUS_MIN_M,
  validateGeofence,
} from '@/utils/geofenceUtils';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'CreateGeofence'>;

const DEFAULT_CENTER: Coordinates = { latitude: 28.6139, longitude: 77.209 };

export function CreateGeofenceScreen({ route, navigation }: Props) {
  const geofenceId = route.params?.geofenceId;
  const isEdit = Boolean(geofenceId);
  const { data: existing, isLoading } = useGeofence(geofenceId ?? '');
  const [create, { isLoading: creating }] = useCreateGeofence();
  const [update, { isLoading: updating }] = useUpdateGeofence();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [radius, setRadius] = useState(200);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [error, setError] = useState<string | null>(null);

  const radiusValidation = useMemo(
    () => validateGeofence({ shape: 'circle', center, radius }),
    [center, radius],
  );

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setAddress(existing.address);
      setCity(existing.city);
      setState(existing.state);
      if (existing.geometry.shape === 'circle') {
        setCenter(existing.geometry.center);
        setRadius(existing.geometry.radius);
      }
    }
  }, [existing]);

  const suggestAddressFromCoordinates = useCallback(
    async (coords: Coordinates) => {
      if (address.trim() && city.trim() && state.trim()) return;
      try {
        const result = await reverseGeocode(coords.latitude, coords.longitude);
        if (!address.trim() && result.address) setAddress(result.address);
        if (!city.trim() && result.city) setCity(result.city);
        if (!state.trim() && result.state) setState(result.state);
      } catch {
        // Best-effort reverse geocoding; coordinate fallback applied on save.
      }
    },
    [address, city, state],
  );

  const handleMapCenterChange = useCallback(
    (next: Coordinates) => {
      setCenter(next);
      void suggestAddressFromCoordinates(next);
    },
    [suggestAddressFromCoordinates],
  );

  const handleSave = useCallback(async () => {
    const geometry = { shape: 'circle' as const, center, radius };
    const validation = validateGeofence(geometry);
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid geofence');
      return;
    }
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    const resolved = resolveGeofenceAddressFields(address, city, state, center);

    const payload = {
      name: name.trim(),
      address: resolved.address,
      city: resolved.city,
      state: resolved.state,
      geometry,
      assignedOfficers: existing?.assignedOfficers ?? [],
    };

    if (isEdit && geofenceId) {
      await update({ id: geofenceId, payload });
    } else {
      await create(payload);
    }
    navigation.goBack();
  }, [address, center, city, create, existing?.assignedOfficers, geofenceId, isEdit, name, navigation, radius, state, update]);

  if (isEdit && isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={6} />
      </Screen>
    );
  }

  return (
    <RoleGuard requiredPermission="attendance.edit">
      <Screen style={adminScreenStyles.canvas}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>{isEdit ? 'Edit geofence' : 'Add geofence'}</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {radiusValidation.warning ? (
              <Text style={styles.warning}>{radiusValidation.warning}</Text>
            ) : null}

            <Text style={styles.hint}>Tap the map or drag the pin to set the exact location.</Text>
            <GeofenceLocationPicker
              center={center}
              radius={radius}
              onCenterChange={handleMapCenterChange}
            />

            <Text style={styles.sliderLabel}>
              Radius: {radius}m ({GEOFENCE_RADIUS_MIN_M}–{GEOFENCE_RADIUS_MAX_M}m)
            </Text>
            <View style={styles.radiusRow}>
              <Button
                label="−"
                variant="ghost"
                onPress={() => setRadius((r) => Math.max(GEOFENCE_RADIUS_MIN_M, r - 25))}
              />
              <Button
                label="+"
                variant="ghost"
                onPress={() => setRadius((r) => Math.min(GEOFENCE_RADIUS_MAX_M, r + 25))}
              />
            </View>

            <GeofenceLocationControls
              address={address}
              city={city}
              state={state}
              center={center}
              onAddressChange={setAddress}
              onCityChange={setCity}
              onStateChange={setState}
              onCenterChange={setCenter}
            />

            <FormField label="Name" value={name} onChangeText={setName} placeholder="Office HQ" />

            <Button
              label={creating || updating ? 'Saving…' : 'Save geofence'}
              onPress={() => void handleSave()}
              disabled={creating || updating || !radiusValidation.valid}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, gap: spacing.sm },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  hint: { fontSize: 13, color: colors.textSecondary },
  sliderLabel: { fontSize: 13, color: colors.textSecondary },
  radiusRow: { flexDirection: 'row', gap: spacing.sm },
  error: { color: colors.errorRed, fontSize: 13 },
  warning: { color: adminColors.badgePending, fontSize: 13 },
});
