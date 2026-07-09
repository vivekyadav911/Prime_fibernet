import { Linking, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { Button } from '@prime/ui';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type NavigationButtonProps = {
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  label?: string;
  variant?: 'primary' | 'ghost';
  onPress?: () => void;
  onLongPress?: () => void;
};

import { isUsableMapCoordinate } from '@/utils/officerPortalCoordinates';

export type NavigateToAddressResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_destination' | 'open_failed'; message: string };

export async function navigateToAddress(
  address: string,
  lat?: number | null,
  lng?: number | null,
): Promise<NavigateToAddressResult> {
  const trimmedAddress = address.trim();
  const hasCoords =
    lat != null && lng != null && isUsableMapCoordinate(Number(lat), Number(lng));

  if (!hasCoords && !trimmedAddress) {
    return {
      ok: false,
      reason: 'invalid_destination',
      message: 'No valid address or coordinates for navigation.',
    };
  }

  const destination = hasCoords
    ? `${lat},${lng}`
    : encodeURIComponent(trimmedAddress);

  const appleUrl = `maps://app?daddr=${destination}`;
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

  try {
    if (Platform.OS === 'ios') {
      const supported = await Linking.canOpenURL(appleUrl);
      await Linking.openURL(supported ? appleUrl : googleUrl);
      return { ok: true };
    }

    const googleNav = `google.navigation:q=${destination}`;
    const supported = await Linking.canOpenURL(googleNav);
    await Linking.openURL(supported ? googleNav : googleUrl);
    return { ok: true };
  } catch {
    return {
      ok: false,
      reason: 'open_failed',
      message: 'Could not open maps. Check the address or update the location.',
    };
  }
}

export function NavigationButton({
  address,
  latitude,
  longitude,
  label = 'Navigate',
  variant = 'ghost',
  onPress,
  onLongPress,
}: NavigationButtonProps) {
  const defaultPress = () => {
    void navigateToAddress(address, latitude, longitude);
  };

  if (variant === 'primary') {
    return <Button label={label} onPress={onPress ?? defaultPress} />;
  }

  return (
    <Pressable
      style={styles.ghost}
      onPress={onPress ?? defaultPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
    >
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
