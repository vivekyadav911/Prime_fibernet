import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Button } from '@prime/ui';

import { useMyAssignedZones } from '@/hooks/attendance/useMyAssignedZones';
import { locationService } from '@/services/LocationService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setBackgroundPermissionStatus,
  setLocationPermissionStatus,
} from '@/store/slices/attendanceSlice';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { formatOutsideZoneDistance } from '@/utils/formatDistance';

export function GeofenceStatusBanner() {
  const dispatch = useAppDispatch();
  const zones = useMyAssignedZones();
  const fgStatus = useAppSelector((s) => s.attendance.locationPermissionStatus);
  const bgStatus = useAppSelector((s) => s.attendance.backgroundPermissionStatus);
  const [gpsEnabled, setGpsEnabled] = useState<boolean | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const permissionGranted = fgStatus === 'granted';
  const needsPermission = fgStatus === 'denied' || fgStatus === 'restricted' || fgStatus === 'undetermined';

  const syncPermissionState = useCallback(async () => {
    const perms = await locationService.checkPermissions();
    dispatch(setLocationPermissionStatus(perms.foreground ? 'granted' : 'denied'));
    dispatch(setBackgroundPermissionStatus(perms.background ? 'granted' : 'denied'));
    const enabled = await Location.hasServicesEnabledAsync();
    setGpsEnabled(enabled);
    return { perms, enabled };
  }, [dispatch]);

  useEffect(() => {
    void syncPermissionState();
  }, [syncPermissionState]);

  const handleEnableLocation = useCallback(async () => {
    setActionLoading(true);
    try {
      await Location.requestForegroundPermissionsAsync();
      const { perms, enabled } = await syncPermissionState();
      if (perms.foreground && enabled) {
        await zones.refreshLocation();
      }
    } finally {
      setActionLoading(false);
    }
  }, [syncPermissionState, zones]);

  const handleOpenSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  const handleRetryLocation = useCallback(async () => {
    setActionLoading(true);
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      setGpsEnabled(enabled);
      if (!enabled) return;
      await zones.refreshLocation();
    } finally {
      setActionLoading(false);
    }
  }, [zones]);

  if (zones.isLoading) {
    return (
      <View style={[styles.banner, styles.neutral]}>
        <Text style={styles.neutralText}>Loading assigned zones…</Text>
      </View>
    );
  }

  if (!zones.hasZone) {
    return (
      <View style={[styles.banner, styles.warn]}>
        <Text style={styles.warnText}>
          No zone assigned — contact your admin. Only Request approval is available until a zone is
          assigned.
        </Text>
      </View>
    );
  }

  if (needsPermission) {
    return (
      <View style={[styles.banner, styles.warn]}>
        <Text style={styles.warnTitle}>Location access required</Text>
        <Text style={styles.warnBody}>
          Allow location access so we can verify your assigned zone for check-in.
        </Text>
        <View style={styles.actions}>
          <Button
            label={actionLoading ? 'Requesting…' : 'Enable location'}
            onPress={() => void handleEnableLocation()}
            disabled={actionLoading}
          />
          <Button label="Open settings" variant="ghost" onPress={handleOpenSettings} />
        </View>
      </View>
    );
  }

  if (zones.isLocationLoading) {
    return (
      <View style={[styles.banner, styles.neutral]}>
        <Text style={styles.neutralText}>Getting your location…</Text>
      </View>
    );
  }

  if (!zones.coords) {
    const gpsOff = gpsEnabled === false;
    return (
      <View style={[styles.banner, styles.warn]}>
        <Text style={styles.warnTitle}>{gpsOff ? 'GPS is turned off' : 'Location unavailable'}</Text>
        <Text style={styles.warnBody}>
          {gpsOff
            ? 'Turn on device location services to check in from your assigned zone.'
            : 'We could not read your GPS fix. Enable location and try again.'}
        </Text>
        <View style={styles.actions}>
          {gpsOff ? (
            <Button
              label="Turn on GPS"
              onPress={handleOpenSettings}
              disabled={actionLoading}
            />
          ) : (
            <Button
              label={actionLoading ? 'Retrying…' : 'Retry location'}
              onPress={() => void handleRetryLocation()}
              disabled={actionLoading}
            />
          )}
          <Button label="Open settings" variant="ghost" onPress={handleOpenSettings} />
        </View>
      </View>
    );
  }

  if (permissionGranted && bgStatus !== 'granted') {
    return (
      <View style={[styles.banner, styles.neutral]}>
        <Text style={styles.neutralText}>
          Foreground location active — enable background access for automatic zone detection.
        </Text>
        <View style={styles.actions}>
          <Button
            label="Enable background"
            variant="secondary"
            onPress={() => void Location.requestBackgroundPermissionsAsync().then(() => syncPermissionState())}
          />
          <Button label="Settings" variant="ghost" onPress={handleOpenSettings} />
        </View>
      </View>
    );
  }

  if (zones.geofenceStatus.isInside) {
    const zoneName = zones.geofenceStatus.geofence?.name ?? zones.selectedZone?.name ?? 'zone';
    return (
      <View style={[styles.banner, styles.ok]}>
        <Text style={styles.okText}>Inside {zoneName}. You can check in.</Text>
      </View>
    );
  }

  const radiusM =
    zones.selectedZone?.geometry.shape === 'circle' ? zones.selectedZone.geometry.radius : null;
  const outsideLabel = formatOutsideZoneDistance(zones.geofenceStatus.distance, radiusM);
  const zoneName = zones.selectedZone?.name ?? 'office';

  return (
    <View style={[styles.banner, styles.warn]}>
      <Text style={styles.warnText}>
        Outside {zoneName}
        {outsideLabel ? ` — ${outsideLabel}` : ''}. Move into the zone or request approval.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  ok: { backgroundColor: colors.emeraldLight },
  warn: { backgroundColor: colors.amberLight },
  neutral: { backgroundColor: colors.surfaceWhite, borderWidth: 1, borderColor: colors.borderDefault },
  okText: { color: colors.emerald, fontWeight: '600', fontSize: 14 },
  warnText: { color: colors.amber, fontWeight: '600', fontSize: 14 },
  warnTitle: { color: colors.amber, fontWeight: '700', fontSize: 14, marginBottom: spacing.xxs },
  warnBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: spacing.sm },
  neutralText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
