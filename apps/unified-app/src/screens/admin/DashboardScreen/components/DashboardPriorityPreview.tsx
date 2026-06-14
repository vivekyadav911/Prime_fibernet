import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { UpcomingRecharge } from '@/types/api/admin';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import { RechargeExpiryPill } from './RechargeExpiryPill';

type DashboardPriorityPreviewProps = {
  items: UpcomingRecharge[];
  totalUrgent: number;
  onViewAll: () => void;
};

function PriorityRow({ item, isLast }: { item: UpcomingRecharge; isLast: boolean }) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <View style={styles.rowMain}>
        <Text style={styles.name} numberOfLines={1}>
          {item.customerName}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.planName} · {item.city || '—'}
        </Text>
      </View>
      <RechargeExpiryPill daysRemaining={item.daysRemaining} />
    </View>
  );
}

export function DashboardPriorityPreview({
  items,
  totalUrgent,
  onViewAll,
}: DashboardPriorityPreviewProps) {
  if (!items.length) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Renewals due</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{totalUrgent}</Text>
        </View>
      </View>

      <View style={styles.list}>
        {items.map((item, index) => (
          <PriorityRow key={item.id} item={item} isLast={index === items.length - 1} />
        ))}
      </View>

      {totalUrgent > items.length ? (
        <Pressable onPress={onViewAll} style={({ pressed }) => [styles.footer, pressed && styles.footerPressed]}>
          <Text style={styles.footerText}>View all {totalUrgent} renewals</Text>
          <View style={styles.footerIcon}>
            <Ionicons name="arrow-forward" size={12} color={adminColors.primary} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: adminColors.dashboard.panelBorder,
    marginBottom: adminColors.dashboard.sectionGap,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: adminColors.dashboard.surfacePastel,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: adminColors.dashboard.rowDivider,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  countBadge: {
    backgroundColor: adminColors.dashboard.kpiUrgentBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: adminColors.dashboard.kpiUrgentBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    minWidth: 22,
    alignItems: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    color: adminColors.badgePending,
    fontVariant: ['tabular-nums'],
  },
  list: {
    paddingHorizontal: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: adminColors.dashboard.rowDivider,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  meta: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: adminColors.dashboard.rowDivider,
    backgroundColor: adminColors.dashboard.ctaBg,
  },
  footerPressed: {
    backgroundColor: adminColors.dashboard.ctaPressedBg,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '700',
    color: adminColors.primary,
    letterSpacing: 0.2,
  },
  footerIcon: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: adminColors.cardBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: adminColors.dashboard.ctaBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
