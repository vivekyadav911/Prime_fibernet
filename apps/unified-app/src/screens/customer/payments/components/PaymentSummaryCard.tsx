import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@prime/ui';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type PaymentSummaryCardProps = {
  totalSpent: number;
  onPayNow?: () => void;
  onViewBills?: () => void;
  showPayNow?: boolean;
};

export function PaymentSummaryCard({ totalSpent, onPayNow, onViewBills, showPayNow }: PaymentSummaryCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Total spent</Text>
      <Text style={styles.value}>₹{totalSpent.toFixed(2)}</Text>
      {showPayNow && onPayNow ? (
        <Button label="Pay now / Renew" onPress={onPayNow} style={styles.button} />
      ) : null}
      {onViewBills ? (
        <Button label="My bills" variant="secondary" onPress={onViewBills} style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primaryNavy,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  label: { color: colors.white, opacity: 0.85, fontSize: 14 },
  value: { color: colors.white, fontSize: 28, fontWeight: '700' },
  button: { marginTop: spacing.sm },
});
