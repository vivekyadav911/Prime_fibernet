import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { InventoryHistoryEntry } from '@/types/inventory';
import {
  formatTime,
  getActionIcon,
  getActionIconBgColor,
  getActionIconColor,
  getActionLabel,
  truncate,
} from '@/utils/inventoryUtils';

type HistoryListRowProps = {
  entry: InventoryHistoryEntry;
  showDivider?: boolean;
};

function deltaLabel(delta: number): string {
  if (delta === 0) return '—';
  return `${delta > 0 ? '+' : ''}${delta}`;
}

export function HistoryListRow({ entry, showDivider = true }: HistoryListRowProps) {
  const iconName = getActionIcon(entry.actionType) as keyof typeof Ionicons.glyphMap;
  const isGain = entry.quantityDelta > 0;
  const isLoss = entry.quantityDelta < 0;
  const hasQtyChange = entry.quantityDelta !== 0;
  const isEdit = entry.actionType === 'edit';

  return (
    <View style={[styles.row, showDivider && styles.rowDivider]}>
      <View style={[styles.iconWrap, { backgroundColor: getActionIconBgColor(entry.actionType) }]}>
        <Ionicons name={iconName} size={16} color={getActionIconColor(entry.actionType)} />
      </View>

      <View style={styles.main}>
        <View style={styles.topLine}>
          <View style={styles.titleBlock}>
            <Text style={styles.actionLabel}>{getActionLabel(entry.actionType)}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.itemName} numberOfLines={1}>
              {truncate(entry.itemName, 28)}
            </Text>
          </View>
          <View
            style={[
              styles.deltaPill,
              isEdit
                ? styles.deltaNeutral
                : isGain
                  ? styles.deltaGain
                  : isLoss
                    ? styles.deltaLoss
                    : styles.deltaNeutral,
            ]}
          >
            <Text
              style={[
                styles.deltaText,
                isEdit
                  ? styles.deltaTextNeutral
                  : isGain
                    ? styles.deltaTextGain
                    : isLoss
                      ? styles.deltaTextLoss
                      : styles.deltaTextNeutral,
              ]}
            >
              {deltaLabel(entry.quantityDelta)}
            </Text>
          </View>
        </View>

        <View style={styles.metaLine}>
          {entry.itemSku ? (
            <Text style={styles.metaText} numberOfLines={1}>
              {entry.itemSku}
            </Text>
          ) : null}
          {entry.itemSku && (hasQtyChange || isEdit) ? (
            <Text style={styles.metaDot}>·</Text>
          ) : null}
          {hasQtyChange ? (
            <Text style={styles.metaText}>
              <Text style={styles.metaMuted}>Stock </Text>
              <Text style={styles.metaValue}>{entry.quantityBefore}</Text>
              <Text style={styles.metaMuted}> → </Text>
              <Text
                style={[
                  styles.metaValue,
                  isGain ? styles.stockGain : isLoss ? styles.stockLoss : null,
                ]}
              >
                {entry.quantityAfter}
              </Text>
            </Text>
          ) : isEdit ? (
            <Text style={styles.metaText} numberOfLines={1}>
              Details updated
            </Text>
          ) : null}
        </View>

        <View style={styles.footerLine}>
          <View style={styles.performer}>
            <Ionicons name="person-outline" size={11} color={colors.textMuted} />
            <Text style={styles.performerText} numberOfLines={1}>
              {entry.performedBy}
            </Text>
          </View>
          <Text style={styles.time}>{formatTime(entry.timestamp)}</Text>
        </View>

        {entry.notes ? (
          <View style={styles.notesRow}>
            <Ionicons name="document-text-outline" size={11} color={colors.textMuted} />
            <Text style={styles.notes} numberOfLines={2}>
              {entry.notes}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 56,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: adminColors.dashboard.rowDivider,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  main: { flex: 1, minWidth: 0 },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  titleBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: 4,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 0,
  },
  dot: { fontSize: 12, color: colors.textMuted },
  itemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  deltaPill: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 36,
    alignItems: 'center',
  },
  deltaGain: { backgroundColor: adminColors.navPillSuccessBg },
  deltaLoss: { backgroundColor: adminColors.navPillDangerBg },
  deltaNeutral: { backgroundColor: adminColors.dashboard.metricBg },
  deltaText: { fontSize: 12, fontWeight: '700' },
  deltaTextGain: { color: adminColors.navPillSuccessText },
  deltaTextLoss: { color: adminColors.navPillDangerText },
  deltaTextNeutral: { color: colors.textSecondary },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    flexWrap: 'wrap',
    gap: 4,
  },
  metaText: { fontSize: 12, color: colors.textSecondary },
  metaDot: { fontSize: 12, color: colors.textMuted },
  metaMuted: { color: colors.textMuted },
  metaValue: { fontWeight: '600', color: colors.textPrimary },
  stockGain: { color: adminColors.badgeActive },
  stockLoss: { color: adminColors.badgeBlocked },
  footerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: spacing.sm,
  },
  performer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  performerText: { fontSize: 11, color: colors.textMuted, flex: 1 },
  time: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: adminColors.dashboard.rowDivider,
  },
  notes: { flex: 1, fontSize: 11, color: colors.textSecondary, lineHeight: 15 },
});
