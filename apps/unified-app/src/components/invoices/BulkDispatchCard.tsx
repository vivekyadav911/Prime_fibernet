import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@prime/ui';

import { FilterChips, SectionCard } from '@/components/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const INVOICE_TYPE_OPTIONS = [
  { value: 'non_gst' as const, label: 'Non-GST' },
  { value: 'gst' as const, label: 'GST' },
];

const CHANNEL_OPTIONS = [
  { value: 'email' as const, label: 'Email' },
  { value: 'whatsapp' as const, label: 'WhatsApp' },
];

type BulkDispatchCardProps = {
  invoiceType: 'non_gst' | 'gst';
  channel: 'email' | 'whatsapp';
  onInvoiceTypeChange: (type: 'non_gst' | 'gst') => void;
  onChannelChange: (channel: 'email' | 'whatsapp') => void;
  onSend: () => void;
  sending?: boolean;
  selectedCount?: number;
};

export const BulkDispatchCard = memo(function BulkDispatchCard({
  invoiceType,
  channel,
  onInvoiceTypeChange,
  onChannelChange,
  onSend,
  sending,
  selectedCount = 0,
}: BulkDispatchCardProps) {
  const hasSelection = selectedCount > 0;

  return (
    <SectionCard title="Bulk dispatch">
      <Text style={styles.hint}>
        {hasSelection
          ? `Send ${selectedCount} selected invoice${selectedCount === 1 ? '' : 's'}`
          : 'Send all pending invoices of the selected type, or tap Select to pick specific ones'}
      </Text>
      {!hasSelection ? (
        <FilterChips
          options={INVOICE_TYPE_OPTIONS}
          selected={invoiceType}
          onSelect={onInvoiceTypeChange}
        />
      ) : null}
      <FilterChips
        options={CHANNEL_OPTIONS}
        selected={channel}
        onSelect={onChannelChange}
      />
      <View style={styles.btnWrap}>
        <Button
          label={
            sending
              ? 'Sending…'
              : hasSelection
                ? `Send selected (${selectedCount})`
                : 'Send bulk invoices'
          }
          onPress={onSend}
          disabled={sending}
        />
      </View>
    </SectionCard>
  );
});

const styles = StyleSheet.create({
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  btnWrap: { marginTop: spacing.sm },
});
