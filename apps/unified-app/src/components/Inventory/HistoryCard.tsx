import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { InventoryHistoryEntry } from '@/types/inventory';
import {
  formatDateTime,
  formatTime,
  getActionIcon,
  getActionIconBgColor,
  getActionIconColor,
  getActionLabel,
} from '@/utils/inventoryUtils';

type HistoryCardProps = {
  entry: InventoryHistoryEntry;
};

function deltaLabel(delta: number): string {
  if (delta === 0) return 'No qty change';
  return `${delta > 0 ? '+' : ''}${delta}`;
}

export function HistoryCard({ entry }: HistoryCardProps) {
  const iconName = getActionIcon(entry.actionType) as keyof typeof Ionicons.glyphMap;
  const isGain = entry.quantityDelta > 0;
  const isLoss = entry.quantityDelta < 0;
  const hasQtyChange = entry.quantityDelta !== 0;
  const isEdit = entry.actionType === 'edit';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: getActionIconBgColor(entry.actionType) }]}>
          <Ionicons name={iconName} size={20} color={getActionIconColor(entry.actionType)} />
        </View>
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <Text style={styles.actionName}>{getActionLabel(entry.actionType)}</Text>
            <View
              style={[
                styles.deltaBadge,
                isEdit ? styles.deltaNeutral : isGain ? styles.deltaGain : isLoss ? styles.deltaLoss : styles.deltaNeutral,
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
          <Text style={styles.itemName} numberOfLines={2}>{entry.itemName}</Text>
          {entry.itemSku ? (
            <Text style={styles.itemSku}>SKU: {entry.itemSku}</Text>
          ) : null}
        </View>
      </View>

      {hasQtyChange ? (
        <View style={styles.beforeAfter}>
          <Text style={styles.beforeAfterTitle}>Available stock change</Text>
          <View style={styles.beforeAfterRow}>
            <View style={styles.qtyBlock}>
              <Text style={styles.qtyLabel}>Before</Text>
              <Text style={styles.qtyValue}>{entry.quantityBefore}</Text>
            </View>
            <View style={styles.arrowWrap}>
              <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
            </View>
            <View style={styles.qtyBlock}>
              <Text style={styles.qtyLabel}>After</Text>
              <Text
                style={[
                  styles.qtyValue,
                  isGain ? styles.qtyValueGain : isLoss ? styles.qtyValueLoss : null,
                ]}
              >
                {entry.quantityAfter}
              </Text>
            </View>
          </View>
        </View>
      ) : isEdit ? (
        <View style={styles.metaBox}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.metaText}>Item details were updated — stock quantity unchanged</Text>
        </View>
      ) : null}

      {entry.notes ? (
        <View style={styles.notesBox}>
          <Ionicons name="document-text-outline" size={14} color={colors.textMuted} />
          <Text style={styles.notes}>{entry.notes}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.performer}>
          <Ionicons name="person-outline" size={14} color={colors.textMuted} />
          <Text style={styles.performerText} numberOfLines={1}>{entry.performedBy}</Text>
        </View>
        <View style={styles.timeWrap}>
          <Text style={styles.time}>{formatTime(entry.timestamp)}</Text>
          <Text style={styles.dateSub}>{formatDateTime(entry.timestamp)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  header: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  actionName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  itemName: { fontSize: 13, color: colors.textPrimary, marginTop: 2, fontWeight: '500' },
  itemSku: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  deltaBadge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  deltaGain: { backgroundColor: '#F0FDF4' },
  deltaLoss: { backgroundColor: '#FEF2F2' },
  deltaNeutral: { backgroundColor: '#F3F4F6' },
  deltaText: { fontSize: 12, fontWeight: '700' },
  deltaTextGain: { color: '#10B981' },
  deltaTextLoss: { color: '#EF4444' },
  deltaTextNeutral: { color: '#6B7280' },
  beforeAfter: {
    backgroundColor: '#F9FAFB',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  beforeAfterTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  beforeAfterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyBlock: { flex: 1, alignItems: 'center' },
  arrowWrap: { paddingHorizontal: spacing.xs },
  qtyLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  qtyValue: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
  qtyValueGain: { color: '#10B981' },
  qtyValueLoss: { color: '#EF4444' },
  metaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#F9FAFB',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  metaText: { flex: 1, fontSize: 12, color: colors.textSecondary },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  notes: { flex: 1, fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', lineHeight: 18 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  performer: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  performerText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  timeWrap: { alignItems: 'flex-end' },
  time: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  dateSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
});
