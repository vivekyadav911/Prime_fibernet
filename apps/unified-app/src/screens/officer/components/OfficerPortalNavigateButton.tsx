import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PortalTicketItem } from '@/types/portalTicket';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { isUsableMapCoordinate } from '@/utils/officerPortalCoordinates';

import { NavigationButton, navigateToAddress } from './NavigationButton';
import { OfficerLocationSheet } from './OfficerLocationSheet';

type OfficerPortalNavigateButtonProps = {
  item: Pick<PortalTicketItem, 'id' | 'kind' | 'customerAddress'>;
  latitude?: number | null;
  longitude?: number | null;
  label?: string;
  variant?: 'primary' | 'ghost';
  showFixPinLink?: boolean;
  onLocationUpdated?: (location: { latitude: number; longitude: number; address: string }) => void;
  onSheetVisibilityChange?: (visible: boolean) => void;
};

export function OfficerPortalNavigateButton({
  item,
  latitude,
  longitude,
  label,
  variant,
  showFixPinLink = false,
  onLocationUpdated,
  onSheetVisibilityChange,
}: OfficerPortalNavigateButtonProps) {
  const [sheetVisible, setSheetVisible] = useState(false);

  const usableCoords = useMemo(() => {
    if (latitude == null || longitude == null) return null;
    if (!isUsableMapCoordinate(latitude, longitude)) return null;
    return { latitude, longitude };
  }, [latitude, longitude]);

  const openCorrectionSheet = useCallback(() => {
    setSheetVisible(true);
    onSheetVisibilityChange?.(true);
  }, [onSheetVisibilityChange]);

  const closeCorrectionSheet = useCallback(() => {
    setSheetVisible(false);
    onSheetVisibilityChange?.(false);
  }, [onSheetVisibilityChange]);

  const handleNavigate = useCallback(async () => {
    const result = await navigateToAddress(
      item.customerAddress,
      usableCoords?.latitude,
      usableCoords?.longitude,
    );
    if (!result.ok) {
      openCorrectionSheet();
    }
  }, [item.customerAddress, openCorrectionSheet, usableCoords]);

  const handleSaved = useCallback(
    (location: { latitude: number; longitude: number; address: string }) => {
      // ponytail: Fix pin is a location edit, not a navigate action
      onLocationUpdated?.(location);
    },
    [onLocationUpdated],
  );

  return (
    <>
      <View style={showFixPinLink ? styles.row : undefined}>
        <NavigationButton
          address={item.customerAddress}
          latitude={usableCoords?.latitude}
          longitude={usableCoords?.longitude}
          label={label}
          variant={variant}
          onPress={() => void handleNavigate()}
          onLongPress={openCorrectionSheet}
        />
        {showFixPinLink ? (
          <Pressable style={styles.fixPin} onPress={openCorrectionSheet} hitSlop={8}>
            <Text style={styles.fixPinText}>Fix pin</Text>
          </Pressable>
        ) : null}
      </View>
      <OfficerLocationSheet
        visible={sheetVisible}
        onClose={closeCorrectionSheet}
        itemId={item.id}
        kind={item.kind}
        initialAddress={item.customerAddress}
        initialLatitude={usableCoords?.latitude ?? latitude}
        initialLongitude={usableCoords?.longitude ?? longitude}
        onSaved={handleSaved}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  fixPin: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.sm },
  fixPinText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
});
