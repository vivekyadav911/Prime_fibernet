import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@prime/ui';

import { FilterChips, SectionCard } from '@/components/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type BulkDispatchCardProps = {
  invoiceType: 'non_gst' | 'gst';
  channel: 'email' | 'whatsapp';
  onInvoiceTypeChange: (type: 'non_gst' | 'gst') => void;
  onChannelChange: (channel: 'email' | 'whatsapp') => void;
  onSend: () => void;
  sending?: boolean;
};

export function BulkDispatchCard({
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
        options={[
          { value: 'non_gst', label: 'Non-GST' },
          { value: 'gst', label: 'GST' },
        ]}
        selected={invoiceType}
        onSelect={onInvoiceTypeChange}
      />
      <FilterChips
        options={[
          { value: 'email', label: 'Email' },
          { value: 'whatsapp', label: 'WhatsApp' },
        ]}
        selected={channel}
        onSelect={onChannelChange}
      />
      <View style={styles.btnWrap}>
        <Button label="Send bulk invoices" onPress={onSend} disabled={sending} />
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  btnWrap: { marginTop: spacing.sm },
});
