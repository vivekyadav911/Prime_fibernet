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
};

export const BulkDispatchCard = memo(function BulkDispatchCard({
  invoiceType,
  channel,
  onInvoiceTypeChange,
  onChannelChange,
  onSend,
  sending,
}: BulkDispatchCardProps) {
  return (
    <SectionCard title="Bulk dispatch">
      <Text style={styles.hint}>Send all pending invoices of the selected type</Text>
      <FilterChips
        options={INVOICE_TYPE_OPTIONS}
        selected={invoiceType}
        onSelect={onInvoiceTypeChange}
      />
      <FilterChips
        options={CHANNEL_OPTIONS}
        selected={channel}
        onSelect={onChannelChange}
      />
      <View style={styles.btnWrap}>
        <Button label="Send bulk invoices" onPress={onSend} disabled={sending} />
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
