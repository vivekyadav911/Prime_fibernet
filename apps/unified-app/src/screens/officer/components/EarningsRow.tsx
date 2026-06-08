import React from 'react';
import { Linking, StyleSheet, Text } from 'react-native';
import type { Payslip } from '@prime/types';
import { colors } from '@/theme/colors';

type EarningsRowProps = {
  payslip: Payslip;
  onOpenPdf: (url: string) => void;
};

export const EarningsRow = React.memo(function EarningsRow({ payslip, onOpenPdf }: EarningsRowProps) {
  return (
    <Text style={styles.row} onPress={() => payslip.pdfUrl && onOpenPdf(payslip.pdfUrl)}>
      {new Date(payslip.month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} — ₹
      {payslip.netPay.toFixed(2)}
      {payslip.pdfUrl ? ' · Download PDF' : ''}
    </Text>
  );
});

const styles = StyleSheet.create({
  row: { paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.borderDefault, color: colors.primaryNavy },
});
