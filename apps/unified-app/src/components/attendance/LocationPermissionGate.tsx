import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { Button, Screen } from '@prime/ui';

import { locationService } from '@/services/LocationService';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { useAppDispatch } from '@/store/hooks';
import {
  setBackgroundPermissionStatus,
  setLocationPermissionStatus,
} from '@/store/slices/attendanceSlice';

type Props = {
  children: React.ReactNode;
  limitedMode?: boolean;
  onLimitedMode?: () => void;
};

export function LocationPermissionGate({ children, limitedMode, onLimitedMode }: Props) {
  const dispatch = useAppDispatch();
  const [foregroundGranted, setForegroundGranted] = useState<boolean | null>(null);
  const [backgroundGranted, setBackgroundGranted] = useState<boolean | null>(null);

  const checkAll = useCallback(async () => {
    const perms = await locationService.checkPermissions();
    setForegroundGranted(perms.foreground);
    setBackgroundGranted(perms.background);
    dispatch(setLocationPermissionStatus(perms.foreground ? 'granted' : 'denied'));
    dispatch(setBackgroundPermissionStatus(perms.background ? 'granted' : 'denied'));
  }, [dispatch]);

  useEffect(() => {
    void checkAll();
  }, [checkAll]);

  const requestPermissions = useCallback(async () => {
    const perms = await locationService.requestPermissions();
    setForegroundGranted(perms.foreground);
    setBackgroundGranted(perms.background);
    dispatch(setLocationPermissionStatus(perms.foreground ? 'granted' : 'denied'));
    dispatch(setBackgroundPermissionStatus(perms.background ? 'granted' : 'denied'));
  }, [dispatch]);

  if (Platform.OS === 'web') return <>{children}</>;

  if (foregroundGranted && (backgroundGranted || limitedMode)) {
    return (
      <>
        {!backgroundGranted && limitedMode ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              Background location unavailable — limited attendance mode active.
            </Text>
          </View>
        ) : null}
        {children}
      </>
    );
  }

  if (foregroundGranted === null) {
    return (
      <Screen>
        <Text style={styles.title}>Checking permissions…</Text>
      </Screen>
    );
  }

  return (
    <Screen style={styles.gate}>
      <Text style={styles.emoji}>📍</Text>
      <Text style={styles.title}>Location access required</Text>
      <Text style={styles.body}>
        Prime Fibernet uses your location to verify geofence-based attendance during shifts.
        Background access lets check-in reminders work when the app is closed.
      </Text>
      <Button label="Grant permission" onPress={() => void requestPermissions()} />
      {onLimitedMode ? (
        <Button label="Use limited mode" variant="ghost" onPress={onLimitedMode} />
      ) : null}
      <Button label="Open settings" variant="ghost" onPress={() => void Linking.openSettings()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gate: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emoji: { fontSize: 48 },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  body: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  banner: { backgroundColor: colors.warningAmber, padding: spacing.sm },
  bannerText: { color: colors.white, fontSize: 12, textAlign: 'center' },
});
