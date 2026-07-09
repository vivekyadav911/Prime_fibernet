import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { PortalItemCoordinates } from '@/utils/officerPortalCoordinates';
import { isUsableMapCoordinate } from '@/utils/officerPortalCoordinates';

type Props = {
  address: string;
  coordinates?: PortalItemCoordinates | null;
};

export function OfficerLocationSummary({ address, coordinates }: Props) {
  const trimmedAddress = address.trim();
  const hasCoords =
    coordinates != null &&
    isUsableMapCoordinate(coordinates.latitude, coordinates.longitude);

  if (!trimmedAddress && !hasCoords) return null;

  return (
    <View style={styles.wrap}>
      {trimmedAddress ? (
        <Text style={styles.address} numberOfLines={3}>
          {trimmedAddress}
        </Text>
      ) : null}
      {hasCoords ? (
        <Text style={styles.coords}>
          Pin: {coordinates!.latitude.toFixed(5)}, {coordinates!.longitude.toFixed(5)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xs,
    gap: spacing.xxs,
  },
  address: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  coords: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
});
