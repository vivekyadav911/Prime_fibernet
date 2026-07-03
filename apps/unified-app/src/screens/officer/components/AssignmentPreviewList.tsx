import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TicketPriorityBadge, TicketStatusBadge } from '@/components/TicketPortal';
import type { PortalTicketItem } from '@/types/portalTicket';
import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/spacing';
import type { OfficerStackParamList } from '@/types/navigation';
import { officerTicketPriorityRank } from '@/utils/officerTicketFilters';
import { truncateTicketNumber } from '@/utils/ticketViewMappers';

import { NavigationButton } from './NavigationButton';

type AssignmentPreviewListProps = {
  items: PortalTicketItem[] | undefined;
  limit?: number;
};

export function AssignmentPreviewList({ items, limit = 3 }: AssignmentPreviewListProps) {
  const navigation = useNavigation<NativeStackNavigationProp<OfficerStackParamList>>();

  const preview = useMemo(() => {
    return [...(items ?? [])]
      .sort((a, b) => officerTicketPriorityRank(a) - officerTicketPriorityRank(b))
      .slice(0, limit);
  }, [items, limit]);

  const openDetail = useCallback(
    (itemId: string, kind: PortalTicketItem['kind']) => {
      navigation.navigate('RequestDetail', { requestId: itemId, kind });
    },
    [navigation],
  );

  if (!preview.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Today&apos;s Assignments</Text>
        <Pressable
          onPress={() => navigation.getParent()?.navigate('RequestsStack' as never)}
          style={styles.viewAll}
        >
          <Text style={styles.viewAllText}>View All →</Text>
        </Pressable>
      </View>
      {preview.map((item) => (
        <View key={`${item.kind}-${item.id}`} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.ticketNumber}>{truncateTicketNumber(item.displayNumber)}</Text>
            {item.priority ? <TicketPriorityBadge priority={item.priority} /> : null}
          </View>
          <Text style={styles.category}>{item.categoryLabel}</Text>
          <Text style={styles.desc} numberOfLines={2}>
            {item.customerName} — {item.customerAddress}
          </Text>
          <TicketStatusBadge status={item.statusBucket} />
          <View style={styles.actions}>
            <NavigationButton address={item.customerAddress} />
            <Pressable style={styles.openBtn} onPress={() => openDetail(item.id, item.kind)}>
              <Text style={styles.openText}>Open</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.primaryNavy },
  viewAll: { minHeight: 48, justifyContent: 'center' },
  viewAllText: { color: colors.accentTeal, fontWeight: '600', fontSize: 14 },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
    ...shadow.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ticketNumber: { fontSize: 14, fontWeight: '700', color: colors.primaryNavy },
  category: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  desc: { fontSize: 13, color: colors.textSecondary },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  openBtn: {
    minHeight: 48,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentTeal,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
  },
  openText: { color: colors.white, fontWeight: '700' },
});
