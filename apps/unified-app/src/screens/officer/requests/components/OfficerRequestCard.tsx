import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@prime/ui';

import { TicketPriorityBadge, TicketStatusBadge } from '@/components/TicketPortal/TicketStatusBadge';
import { OfficerLocationSummary } from '@/screens/officer/components/OfficerLocationSummary';
import { OfficerPortalNavigateButton } from '@/screens/officer/components/OfficerPortalNavigateButton';
import type { PortalTicketItem } from '@/types/portalTicket';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { PortalItemCoordinates } from '@/utils/officerPortalCoordinates';

type OfficerTicketCardProps = {
  item: PortalTicketItem;
  advanceLabel?: string;
  onPress: (itemId: string, kind: PortalTicketItem['kind']) => void;
  onAdvance?: (item: PortalTicketItem) => void;
  onLocationSaved?: () => void;
};

export const OfficerTicketCard = React.memo(function OfficerTicketCard({
  item,
  advanceLabel,
  onPress,
  onAdvance,
  onLocationSaved,
}: OfficerTicketCardProps) {
  const [savedLocation, setSavedLocation] = useState<PortalItemCoordinates | null>(null);

  const displayCoordinates = savedLocation ?? item.coordinates ?? null;
  const displayAddress = useMemo(
    () => displayCoordinates?.address?.trim() || item.customerAddress.trim(),
    [displayCoordinates, item.customerAddress],
  );

  const handleLocationUpdated = useCallback(
    (location: PortalItemCoordinates) => {
      setSavedLocation(location);
      onLocationSaved?.();
    },
    [item.id, item.kind, onLocationSaved],
  );

  return (
    <View style={styles.card}>
      <Pressable onPress={() => onPress(item.id, item.kind)}>
        <View style={styles.header}>
          <Text style={styles.number}>{item.displayNumber}</Text>
          {item.priority ? <TicketPriorityBadge priority={item.priority} /> : null}
        </View>
        <Text style={styles.category}>{item.categoryLabel}</Text>
        <Text style={styles.customer} numberOfLines={1}>
          {item.customerName}
        </Text>
        <Text style={styles.address} numberOfLines={2}>
          {displayAddress}
        </Text>
        <TicketStatusBadge status={item.statusBucket} />
      </Pressable>
      <View style={styles.actions}>
        <View style={styles.navigateCol}>
          <OfficerPortalNavigateButton
            item={{ ...item, customerAddress: displayAddress }}
            latitude={displayCoordinates?.latitude}
            longitude={displayCoordinates?.longitude}
            showFixPinLink
            onLocationUpdated={handleLocationUpdated}
          />
          <OfficerLocationSummary address={displayAddress} coordinates={displayCoordinates} />
        </View>
      </View>
      {advanceLabel && onAdvance ? (
        <Button label={advanceLabel} onPress={() => onAdvance(item)} style={styles.btn} />
      ) : null}
    </View>
  );
});

/** @deprecated Use OfficerTicketCard */
export const OfficerRequestCard = OfficerTicketCard;

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xs,
    backgroundColor: colors.surfaceWhite,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  number: { flex: 1, fontWeight: '700', fontSize: 15, color: colors.primaryNavy },
  category: { fontWeight: '600', fontSize: 14, color: colors.textPrimary },
  customer: { color: colors.textSecondary, fontSize: 13 },
  address: { color: colors.textSecondary, fontSize: 13 },
  actions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
  },
  navigateCol: {
    flex: 1,
    gap: spacing.xxs,
  },
  btn: { marginTop: spacing.xs },
});
