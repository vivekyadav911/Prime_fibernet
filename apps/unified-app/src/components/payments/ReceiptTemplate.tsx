import { StyleSheet, Text, View } from 'react-native';

import { formatINR } from '@/utils/currencyFormat';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Props = {
  companyName: string;
  companyAddress?: string;
  companyGstin?: string;
  receiptNumber: string;
  customerName: string;
  accountNumber: string;
  planName?: string | null;
  totalAmount: number;
  paymentMethod: string;
  paymentDate: string;
  billingPeriod?: string | null;
  nextDueDate?: string | null;
};

export function ReceiptTemplate(props: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.company}>{props.companyName}</Text>
      {props.companyAddress ? <Text style={styles.muted}>{props.companyAddress}</Text> : null}
      {props.companyGstin ? <Text style={styles.muted}>GSTIN: {props.companyGstin}</Text> : null}
      <Text style={styles.title}>Payment Receipt</Text>
      <Text style={styles.row}>Receipt: {props.receiptNumber}</Text>
      <Text style={styles.row}>Customer: {props.customerName}</Text>
      <Text style={styles.row}>Account: {props.accountNumber}</Text>
      {props.planName ? <Text style={styles.row}>Plan: {props.planName}</Text> : null}
      <Text style={styles.amount}>{formatINR(props.totalAmount)}</Text>
      <Text style={styles.row}>Method: {props.paymentMethod}</Text>
      <Text style={styles.row}>Date: {props.paymentDate}</Text>
      {props.billingPeriod ? <Text style={styles.row}>Period: {props.billingPeriod}</Text> : null}
      {props.nextDueDate ? <Text style={styles.row}>Next due: {props.nextDueDate}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, backgroundColor: colors.surfaceWhite },
  company: { fontSize: 18, fontWeight: '700', color: colors.primaryNavy },
  title: { fontSize: 16, fontWeight: '600', marginVertical: spacing.md, color: colors.textPrimary },
  row: { fontSize: 13, color: colors.textPrimary, marginBottom: spacing.xs },
  muted: { fontSize: 12, color: colors.textSecondary },
  amount: { fontSize: 22, fontWeight: '700', marginVertical: spacing.sm, color: colors.textPrimary },
});
