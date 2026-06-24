import { useCallback, useEffect } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { useLocation } from '@/hooks/useLocation';
import type { OfficerStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type Props = NativeStackScreenProps<OfficerStackParamList, 'LocationGate'>;

export function LocationGateScreen({ navigation }: Props) {
  const { permissionGranted, checkPermission, requestPermission, isLoading } = useLocation({
    enableBackground: true,
  });

  const proceedIfGranted = useCallback(async () => {
    const granted = permissionGranted ?? (await checkPermission());
    if (granted) {
      navigation.replace('OfficerDrawer');
    }
  }, [checkPermission, navigation, permissionGranted]);

  useEffect(() => {
    void proceedIfGranted();
  }, [proceedIfGranted]);

  const onEnableLocation = async () => {
    const granted = await requestPermission();
    if (granted) {
      navigation.replace('OfficerDrawer');
      return;
    }
    await Linking.openSettings();
  };

  if (permissionGranted === true) {
    return null;
  }

  return (
    <Screen safeAreaTop style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.icon}>📍</Text>
        <Text style={styles.title}>Location access required</Text>
        <Text style={styles.body}>
          Prime Fibernet needs your location to assign field requests, record shift attendance, and
          verify on-site payment collection.
        </Text>
        <Button
          label={isLoading ? 'Checking…' : 'Enable location'}
          onPress={() => void onEnableLocation()}
          style={styles.button}
        />
        <Button label="Open settings" variant="ghost" onPress={() => void Linking.openSettings()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center' },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.xl,
    margin: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  icon: { fontSize: 40, textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: colors.primaryNavy, textAlign: 'center' },
  body: { color: colors.textSecondary, lineHeight: 22, textAlign: 'center' },
  button: { marginTop: spacing.sm },
});
