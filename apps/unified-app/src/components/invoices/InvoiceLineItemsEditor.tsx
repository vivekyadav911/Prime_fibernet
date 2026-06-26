import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormField, SelectField, SectionCard } from '@/components/admin';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { InvoiceLineItem, InvoiceType } from '@/types/invoice';
import { GST_RATE_OPTIONS, INVOICE_UNIT_OPTIONS } from '@/types/invoice';
import { computeInvoiceTotals } from '@/utils/invoicePdf';
import { formatINR } from '@/utils/currencyFormat';

type InvoiceLineItemsEditorProps = {
  invoiceType: InvoiceType;
  lineItems: InvoiceLineItem[];
  onChange: (items: InvoiceLineItem[]) => void;
  defaultHsn?: string;
};

const EMPTY_ITEM: InvoiceLineItem = {
  description: '',
  hsnSac: '998422',
  quantity: 1,
  unit: 'Nos',
  unitPrice: 0,
  gstRate: 18,
};

export function InvoiceLineItemsEditor({
  invoiceType,
  lineItems,
  onChange,
  defaultHsn = '998422',
}: InvoiceLineItemsEditorProps) {
  const totals = computeInvoiceTotals(lineItems.length ? lineItems : [EMPTY_ITEM], invoiceType);
  const items = lineItems.length ? lineItems : [{ ...EMPTY_ITEM, hsnSac: defaultHsn }];

  const updateItem = (index: number, patch: Partial<InvoiceLineItem>) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(next);
  };

  const addItem = () => {
    onChange([...items, { ...EMPTY_ITEM, hsnSac: defaultHsn }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  const showGst = invoiceType !== 'non_gst';

  return (
    <SectionCard title="Items & services" actionLabel="+ Add item" onAction={addItem}>
      {items.map((item, index) => (
        <View key={index} style={styles.itemBlock}>
          <FormField
            label="Item description"
            value={item.description}
            onChangeText={(v) => updateItem(index, { description: v })}
            placeholder="Internet service"
          />
          <FormField
            label="HSN / SAC"
            value={item.hsnSac}
            onChangeText={(v) => updateItem(index, { hsnSac: v })}
          />
          {showGst ? (
            <SelectField
              label="GST rate (%)"
              value={String(item.gstRate) as `${number}`}
              options={GST_RATE_OPTIONS.map((r) => ({ value: String(r), label: `${r}%` }))}
              onSelect={(v) => updateItem(index, { gstRate: Number(v) })}
            />
          ) : null}
          <View style={styles.row}>
            <View style={styles.half}>
              <FormField
                label="Qty"
                value={String(item.quantity)}
                onChangeText={(v) => updateItem(index, { quantity: Number(v) || 0 })}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.half}>
              <SelectField
                label="Unit"
                value={item.unit}
                options={INVOICE_UNIT_OPTIONS.map((u) => ({ value: u, label: u }))}
                onSelect={(v) => updateItem(index, { unit: v })}
              />
            </View>
          </View>
          <FormField
            label="Unit price (excl. tax)"
            value={String(item.unitPrice)}
            onChangeText={(v) => updateItem(index, { unitPrice: Number(v) || 0 })}
            keyboardType="numeric"
          />
          {items.length > 1 ? (
            <Pressable onPress={() => removeItem(index)}>
              <Text style={styles.removeLink}>Remove item</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatINR(totals.subtotal)}</Text>
        </View>
        {showGst ? (
          <>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>CGST</Text>
              <Text style={styles.totalValue}>{formatINR(totals.cgstAmount)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>SGST</Text>
              <Text style={styles.totalValue}>{formatINR(totals.sgstAmount)}</Text>
            </View>
          </>
        ) : null}
        <View style={[styles.totalRow, styles.grandRow]}>
          <Text style={styles.grandLabel}>Total amount</Text>
          <Text style={styles.grandValue}>{formatINR(totals.totalAmount)}</Text>
        </View>
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  itemBlock: { gap: spacing.sm, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  removeLink: { fontSize: 12, color: colors.errorRed, fontWeight: '600' },
  totals: {
    borderTopWidth: 1,
    borderColor: colors.borderDefault,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 13, color: colors.textSecondary },
  totalValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  grandRow: { marginTop: spacing.xs },
  grandLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  grandValue: { fontSize: 16, fontWeight: '800', color: adminColors.primary },
});
