import { useCallback } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { Button, Screen } from '@prime/ui';

import { useLocationPermissionState } from '@/hooks/attendance/useLocationPermissionState';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type Props = {
  children: React.ReactNode;
};

export function LocationPermissionGate({ children }: Props) {
  const { mode, checking, requestForeground, requestBackground, openSettings, isWeb } =
    useLocationPermissionState();

  if (isWeb) return <>{children}</>;

  if (checking) {
    return (
      <Screen>
        <Text style={styles.title}>Checking location permissions…</Text>
      </Screen>
    );
  }

  if (mode === 'blocked') {
    return (
      <Screen style={styles.gate}>
        <Text style={styles.emoji}>📍</Text>
        <Text style={styles.title}>Location access required</Text>
        <Text style={styles.body}>
          Prime Fibernet uses your location to verify geofence-based attendance. Enable location
          access to check in or request approval.
        </Text>
        <Button label="Enable location" onPress={() => void requestForeground()} />
        <Button label="Open settings" variant="ghost" onPress={openSettings} />
      </Screen>
    );
  }

  return (
    <>
      {mode === 'limited' ? (
        <View style={styles.limitedBanner}>
          <Text style={styles.limitedTitle}>Limited attendance mode</Text>
          <Text style={styles.limitedBody}>
            Foreground location only — manual check-in works, but automatic zone detection is off.
          </Text>
          <View style={styles.limitedActions}>
            <Button label="Enable background" variant="secondary" onPress={() => void requestBackground()} />
            <Button label="Settings" variant="ghost" onPress={openSettings} />
          </View>
        </View>
      ) : null}
      {mode === 'full' ? (
        <View style={styles.fullBanner}>
          <Text style={styles.fullText}>Live geofence monitoring active</Text>
        </View>
      ) : null}
      {children}
    </>
  );
}

const styles = StyleSheet.create({
  gate: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emoji: { fontSize: 48 },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  body: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  limitedBanner: {
    backgroundColor: colors.amberLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  limitedTitle: { fontWeight: '700', color: colors.amber, marginBottom: spacing.xxs },
  limitedBody: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm },
  limitedActions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  fullBanner: {
    backgroundColor: colors.emeraldLight,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  fullText: { color: colors.emerald, fontWeight: '600', fontSize: 13, textAlign: 'center' },
});
