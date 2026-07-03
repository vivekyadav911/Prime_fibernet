import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@prime/ui';

import { TicketPriorityBadge, TicketStatusBadge } from '@/components/TicketPortal';
import type { PortalTicketItem } from '@/types/portalTicket';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { truncateTicketNumber } from '@/utils/ticketViewMappers';

type OfficerTicketCardProps = {
  item: PortalTicketItem;
  advanceLabel?: string;
  onPress: (itemId: string, kind: PortalTicketItem['kind']) => void;
  onAdvance?: (item: PortalTicketItem) => void;
};

export const OfficerTicketCard = React.memo(function OfficerTicketCard({
  item,
  advanceLabel,
  onPress,
  onAdvance,
}: OfficerTicketCardProps) {
  return (
    <Pressable style={styles.card} onPress={() => onPress(item.id, item.kind)}>
      <View style={styles.header}>
        <Text style={styles.number}>{truncateTicketNumber(item.displayNumber)}</Text>
        {item.priority ? <TicketPriorityBadge priority={item.priority} /> : null}
      </View>
      <Text style={styles.category}>{item.categoryLabel}</Text>
      <Text style={styles.customer} numberOfLines={1}>
        {item.customerName}
      </Text>
      <Text style={styles.address} numberOfLines={2}>
        {item.customerAddress}
      </Text>
      <TicketStatusBadge status={item.statusBucket} />
      {advanceLabel && onAdvance ? (
        <Button label={advanceLabel} onPress={() => onAdvance(item)} style={styles.btn} />
      ) : null}
    </Pressable>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  number: { fontWeight: '700', fontSize: 15, color: colors.primaryNavy },
  category: { fontWeight: '600', fontSize: 14, color: colors.textPrimary },
  customer: { color: colors.textSecondary, fontSize: 13 },
  address: { color: colors.textSecondary, fontSize: 13 },
  btn: { marginTop: spacing.xs },
});
