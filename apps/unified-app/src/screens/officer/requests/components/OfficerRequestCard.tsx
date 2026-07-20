import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@prime/ui';

import { TicketPriorityBadge, TicketStatusBadge } from '@/components/TicketPortal/TicketStatusBadge';
import { OfficerPortalNavigateButton } from '@/screens/officer/components/OfficerPortalNavigateButton';
import type { PortalTicketItem } from '@/types/portalTicket';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { PortalItemCoordinates } from '@/utils/officerPortalCoordinates';

type OfficerTicketCardProps = {
  item: PortalTicketItem;
  advanceLabel?: string;
  claimLabel?: string;
  claiming?: boolean;
  onPress: (itemId: string, kind: PortalTicketItem['kind']) => void;
  onAdvance?: (item: PortalTicketItem) => void;
  onClaim?: (item: PortalTicketItem) => void;
  onLocationSaved?: () => void;
};

function complaintPreview(item: PortalTicketItem): string {
  const ticketDesc = item.ticket?.description?.trim();
  if (ticketDesc) return ticketDesc;
  const requestDesc = item.request?.description?.trim();
  if (requestDesc) return requestDesc;
  return item.categoryLabel;
}

export const OfficerTicketCard = React.memo(function OfficerTicketCard({
  item,
  advanceLabel,
  claimLabel,
  claiming = false,
  onPress,
  onAdvance,
  onClaim,
  onLocationSaved,
}: OfficerTicketCardProps) {
  const [savedLocation, setSavedLocation] = useState<PortalItemCoordinates | null>(null);

  const displayCoordinates = savedLocation ?? item.coordinates ?? null;
  const displayAddress = useMemo(
    () => displayCoordinates?.address?.trim() || item.customerAddress.trim(),
    [displayCoordinates, item.customerAddress],
  );
  const description = useMemo(() => complaintPreview(item), [item]);

  const handleLocationUpdated = useCallback(
    (location: PortalItemCoordinates) => {
      setSavedLocation(location);
      onLocationSaved?.();
    },
    [onLocationSaved],
  );

  return (
    <View style={styles.card}>
      <Pressable style={styles.main} onPress={() => onPress(item.id, item.kind)}>
        <View style={styles.topLine}>
          <Text style={styles.number} numberOfLines={1}>
            {item.displayNumber}
          </Text>
          {item.priority ? <TicketPriorityBadge priority={item.priority} compact /> : null}
          <TicketStatusBadge status={item.statusBucket} compact />
        </View>
        <Text style={styles.customer} numberOfLines={1}>
          {item.customerName}
          {item.categoryLabel ? ` · ${item.categoryLabel}` : ''}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      </Pressable>

      <View style={styles.actions}>
        <OfficerPortalNavigateButton
          item={{ ...item, customerAddress: displayAddress }}
          latitude={displayCoordinates?.latitude}
          longitude={displayCoordinates?.longitude}
          showFixPinLink
          onLocationUpdated={handleLocationUpdated}
        />
        {claimLabel && onClaim ? (
          <Button
            label={claiming ? '…' : claimLabel}
            onPress={() => onClaim(item)}
            disabled={claiming}
            style={styles.actionBtn}
          />
        ) : null}
        {advanceLabel && onAdvance ? (
          <Button
            label={advanceLabel}
            onPress={() => onAdvance(item)}
            style={styles.actionBtn}
            variant="secondary"
          />
        ) : null}
      </View>
    </View>
  );
});

/** @deprecated Use OfficerTicketCard */
export const OfficerRequestCard = OfficerTicketCard;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
    gap: spacing.xs,
  },
  main: {
    gap: 2,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  number: {
    flexShrink: 1,
    fontWeight: '700',
    fontSize: 13,
    color: colors.primaryNavy,
  },
  customer: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  description: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  actionBtn: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
});
