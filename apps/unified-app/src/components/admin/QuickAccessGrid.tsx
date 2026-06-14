import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type KpiSurfaceKey = keyof typeof adminColors.kpiSurfaces;

export type QuickAccessIcon = keyof typeof Ionicons.glyphMap;
export type QuickAccessBadgeTone = 'info' | 'warning' | 'danger';

export type QuickAccessItem = {
  id: string;
  label: string;
  icon: QuickAccessIcon;
  route: string;
  surface?: KpiSurfaceKey;
  badge?: number;
  badgeTone?: QuickAccessBadgeTone;
  alertDot?: boolean;
  priority?: 'primary' | 'secondary';
};

type QuickAccessGridProps = {
  items: QuickAccessItem[];
  onPress: (route: string) => void;
};

const BADGE_COLORS: Record<QuickAccessBadgeTone, { bg: string; text: string }> = {
  info: { bg: adminColors.navPillPrimaryBg, text: adminColors.navPillPrimaryText },
  warning: { bg: adminColors.navPillWarningBg, text: adminColors.navPillWarningText },
  danger: { bg: adminColors.navPillDangerBg, text: adminColors.navPillDangerText },
};

const COLUMNS = 4;

function formatBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}

function ShortcutTile({
  item,
  onPress,
}: {
  item: QuickAccessItem;
  onPress: (route: string) => void;
}) {
  const surface = item.surface ?? 'neutral';
  const palette = adminColors.kpiSurfaces[surface];
  const isPrimary = item.priority === 'primary';
  const badgeTone = item.badgeTone ?? 'info';
  const badgePalette = BADGE_COLORS[badgeTone];
  const showCountBadge = item.badge != null && item.badge > 0;
  const showDot = item.alertDot && !showCountBadge;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        showCountBadge ? `${item.label}, ${item.badge} pending` : item.label
      }
      onPress={() => onPress(item.route)}
      style={({ pressed }) => [
        styles.tile,
        isPrimary && styles.tilePrimary,
        pressed && styles.tilePressed,
        pressed && isPrimary && styles.tilePrimaryPressed,
      ]}
    >
      <View style={[styles.iconWrap, isPrimary && styles.iconWrapPrimary]}>
        <Ionicons name={item.icon} size={isPrimary ? 18 : 16} color={palette.accent} />
        {showCountBadge ? (
          <View style={[styles.countBadge, { backgroundColor: badgePalette.bg, borderColor: badgePalette.text }]}>
            <Text style={[styles.countBadgeText, { color: badgePalette.text }]}>
              {formatBadgeCount(item.badge!)}
            </Text>
          </View>
        ) : null}
        {showDot ? (
          <View
            style={[
              styles.alertDot,
              badgeTone === 'danger' && styles.alertDotDanger,
              badgeTone === 'warning' && styles.alertDotWarning,
            ]}
          />
        ) : null}
      </View>
      <Text style={[styles.label, isPrimary && styles.labelPrimary]} numberOfLines={2} ellipsizeMode="tail">
        {item.label}
      </Text>
    </Pressable>
  );
}

export function QuickAccessGrid({ items, onPress }: QuickAccessGridProps) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.id} style={styles.cell}>
          <ShortcutTile item={item} onPress={onPress} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -3,
  },
  cell: {
    width: `${100 / COLUMNS}%`,
    paddingHorizontal: 3,
    marginBottom: spacing.xs,
  },
  tile: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
    borderRadius: radius.sm,
    backgroundColor: adminColors.cardBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: adminColors.dashboard.panelBorder,
    minHeight: 60,
    justifyContent: 'center',
  },
  tilePrimary: {
    minHeight: 64,
    backgroundColor: adminColors.dashboard.surfacePastel,
  },
  tilePressed: {
    backgroundColor: adminColors.dashboard.ctaPressedBg,
    borderColor: adminColors.primary,
    transform: [{ scale: 0.97 }],
  },
  tilePrimaryPressed: {
    backgroundColor: adminColors.permissionBoxBg,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
    backgroundColor: adminColors.cardBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: adminColors.dashboard.rowDivider,
  },
  iconWrapPrimary: {
    width: 32,
    height: 32,
    backgroundColor: adminColors.cardBg,
  },
  countBadge: {
    position: 'absolute',
    top: -5,
    right: -7,
    minWidth: 16,
    height: 16,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  countBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    lineHeight: 10,
  },
  alertDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: adminColors.primary,
    borderWidth: 1.5,
    borderColor: adminColors.cardBg,
  },
  alertDotDanger: {
    backgroundColor: adminColors.badgeBlocked,
  },
  alertDotWarning: {
    backgroundColor: adminColors.badgePending,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 12,
    width: '100%',
    letterSpacing: 0.1,
  },
  labelPrimary: {
    fontSize: 10,
    lineHeight: 13,
  },
});
