import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { StatusBadge } from '@/components/admin';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminInvoice } from '@/types/api/admin';
import { formatINR } from '@/utils/currencyFormat';

type InvoiceListRowProps = {
  item: AdminInvoice;
  onPress?: (invoiceId: string) => void;
  onDownload?: (invoiceId: string) => void;
  onSendEmail?: (invoiceId: string) => void;
  onSendWhatsApp?: (invoiceId: string) => void;
  showDivider?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (invoiceId: string) => void;
};

function isSelectable(item: AdminInvoice): boolean {
  return item.deliveryStatus === 'draft' || item.deliveryStatus === 'pending';
}

function typeLabel(type: AdminInvoice['invoiceType']): string {
  if (type === 'non_gst') return 'NON-GST';
  if (type === 'custom_gst') return 'CUSTOM GST';
  return 'GST';
}

function statusLabel(item: AdminInvoice): string {
  if (item.deliveryStatus === 'sent') return 'invoice sent';
  if (item.deliveryStatus === 'pending') return 'pending';
  if (item.deliveryStatus === 'draft') return 'draft';
  return item.status;
}

function formatShortDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();
}

export const InvoiceListRow = memo(function InvoiceListRow({
  item,
  onPress,
  onDownload,
  onSendEmail,
  onSendWhatsApp,
  showDivider = true,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}: InvoiceListRowProps) {
  const primaryLine = item.lineItems[0]?.description ?? 'Internet service';
  const canSelect = selectionMode && isSelectable(item);

  return (
    <Pressable
      style={[
        styles.row,
        showDivider && styles.rowDivider,
        selected && styles.rowSelected,
      ]}
      onPress={() => {
        if (canSelect) {
          onToggleSelect?.(item.id);
          return;
        }
        onPress?.(item.id);
      }}
      disabled={!canSelect && !onPress}
    >
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          {selectionMode && isSelectable(item) ? (
            <Text style={styles.selectMark}>{selected ? '☑' : '☐'}</Text>
          ) : null}
          <StatusBadge status={statusLabel(item)} />
        </View>
        <View style={styles.typePill}>
          <Text style={styles.typeText}>{typeLabel(item.invoiceType)}</Text>
        </View>
      </View>

      <View style={styles.bodyRow}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.customerName}</Text>
          {item.customerEmail ? (
            <View style={styles.emailRow}>
              <Ionicons name="mail-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.email} numberOfLines={1}>{item.customerEmail}</Text>
            </View>
          ) : null}
          <Text style={styles.service} numberOfLines={1}>{primaryLine}</Text>
        </View>
        <View style={styles.amountCol}>
          <Text style={styles.date}>{formatShortDate(item.date)}</Text>
          <Text style={styles.amount}>{formatINR(item.totalAmount)}</Text>
          {item.deliveryChannel ? (
            <Text style={styles.channel}>{item.deliveryChannel}</Text>
          ) : null}
        </View>
      </View>

      {!selectionMode ? (
        <View style={styles.actions}>
          {onDownload ? (
            <Pressable style={styles.actionBtn} onPress={() => onDownload(item.id)}>
              <Ionicons name="download-outline" size={14} color={adminColors.primary} />
              <Text style={styles.actionText}>PDF</Text>
            </Pressable>
          ) : null}
          {onSendEmail ? (
            <Pressable style={styles.actionBtn} onPress={() => onSendEmail(item.id)}>
              <Ionicons name="mail-outline" size={14} color={adminColors.primary} />
              <Text style={styles.actionText}>Email</Text>
            </Pressable>
          ) : null}
          {onSendWhatsApp ? (
            <Pressable style={styles.actionBtn} onPress={() => onSendWhatsApp(item.id)}>
              <Ionicons name="logo-whatsapp" size={14} color={adminColors.primary} />
              <Text style={styles.actionText}>WhatsApp</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    padding: spacing.md,
    backgroundColor: colors.surfaceWhite,
    gap: spacing.sm,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  rowSelected: {
    backgroundColor: adminColors.chipTones.info.bg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectMark: {
    fontSize: 18,
    color: adminColors.primary,
    minWidth: 24,
  },
  typePill: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    backgroundColor: colors.background,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  bodyRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  info: { flex: 1, gap: spacing.xxs },
  name: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  email: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  service: { fontSize: 11, color: colors.textSecondary, marginTop: spacing.xxs },
  amountCol: { alignItems: 'flex-end', gap: spacing.xxs },
  date: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  amount: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  channel: { fontSize: 10, color: colors.textSecondary, textTransform: 'capitalize' },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.borderDefault,
    paddingTop: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  actionText: { fontSize: 12, fontWeight: '600', color: adminColors.primary },
});
