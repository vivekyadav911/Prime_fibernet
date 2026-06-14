import { Ionicons } from '@expo/vector-icons';
import type { QuickAccessItem } from '@/components/admin';
import type { QuickAccessIcon } from '@/components/admin/QuickAccessGrid';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { adminColors } from '@/theme/admin';

import { dash } from '../dashboardUi';
import { SectionEyebrow } from './ui/DashboardPrimitives';

type DashboardQuickActionsProps = {
  items: QuickAccessItem[];
  onPress: (route: string) => void;
};

const BADGE_COLORS = {
  info: { bg: '#EEF2FF', text: dash.brand },
  warning: { bg: '#FEF3C7', text: dash.warning },
  danger: { bg: '#FEE2E2', text: dash.danger },
} as const;

function QuickActionTile({
  item,
  onPress,
}: {
  item: QuickAccessItem;
  onPress: (route: string) => void;
}) {
  const surface = item.surface ?? 'neutral';
  const accent = adminColors.kpiSurfaces[surface].accent;
  const showBadge = item.badge != null && item.badge > 0;
  const badgePalette = BADGE_COLORS[item.badgeTone ?? 'info'];

  return (
    <Pressable
      onPress={() => onPress(item.route)}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={item.icon as QuickAccessIcon} size={20} color={accent} />
        {showBadge ? (
          <View style={[styles.badge, { backgroundColor: badgePalette.bg }]}>
            <Text style={[styles.badgeText, { color: badgePalette.text }]}>
              {item.badge! > 99 ? '99+' : item.badge}
            </Text>
          </View>
        ) : null}
        {item.alertDot && !showBadge ? <View style={styles.dot} /> : null}
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {item.label}
      </Text>
    </Pressable>
  );
}

export function DashboardQuickActions({ items, onPress }: DashboardQuickActionsProps) {
  return (
    <View>
      <SectionEyebrow title="Quick Actions" />
      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.id} style={styles.cell}>
            <QuickActionTile item={item} onPress={onPress} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  cell: {
    width: '25%',
    paddingHorizontal: 4,
  },
  tile: {
    height: dash.quickTileH,
    backgroundColor: dash.card,
    borderRadius: dash.radiusTile,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dash.border,
    paddingVertical: dash.tilePad,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    ...dash.shadow,
  },
  tilePressed: {
    backgroundColor: dash.pressed,
  },
  iconWrap: {
    width: dash.iconBox,
    height: dash.iconBox,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -7,
    minWidth: 14,
    height: 14,
    borderRadius: dash.radiusPill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  dot: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: dash.danger,
    borderWidth: 1.5,
    borderColor: dash.card,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: dash.text,
    textAlign: 'center',
    lineHeight: 15,
  },
});
