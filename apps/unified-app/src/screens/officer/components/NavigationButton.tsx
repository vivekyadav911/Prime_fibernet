import { Linking, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { Button } from '@prime/ui';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type NavigationButtonProps = {
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  label?: string;
  variant?: 'primary' | 'ghost';
};

export async function navigateToAddress(
  address: string,
  lat?: number | null,
  lng?: number | null,
): Promise<void> {
  const destination =
    lat != null && lng != null ? `${lat},${lng}` : encodeURIComponent(address);

  const appleUrl = `maps://app?daddr=${destination}`;
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

  if (Platform.OS === 'ios') {
    const supported = await Linking.canOpenURL(appleUrl);
    await Linking.openURL(supported ? appleUrl : googleUrl);
    return;
  }

  const googleNav = `google.navigation:q=${destination}`;
  const supported = await Linking.canOpenURL(googleNav);
  await Linking.openURL(supported ? googleNav : googleUrl);
}

export function NavigationButton({
  address,
  latitude,
  longitude,
  label = 'Navigate',
  variant = 'ghost',
}: NavigationButtonProps) {
  const onPress = () => {
    void navigateToAddress(address, latitude, longitude);
  };

  if (variant === 'primary') {
    return <Button label={label} onPress={onPress} />;
  }

  return (
    <Pressable style={styles.ghost} onPress={onPress} accessibilityRole="button">
      <Text style={styles.ghostText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ghost: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  ghostText: {
    color: colors.accentTeal,
    fontWeight: '600',
    fontSize: 14,
  },
});
