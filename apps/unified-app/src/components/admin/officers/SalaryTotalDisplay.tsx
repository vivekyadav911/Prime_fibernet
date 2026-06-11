import { StyleSheet, Text, View } from 'react-native';
import { adminColors } from '@/theme/admin';
import { spacing } from '@/theme/spacing';

type SalaryTotalDisplayProps = {
  total: number;
};

export function SalaryTotalDisplay({ total }: SalaryTotalDisplayProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Total Salary</Text>
      <Text style={styles.amount}>
        ₹{total.toLocaleString('en-IN')}/month
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: adminColors.primaryTint,
  },
  label: { fontSize: 14, color: adminColors.sectionLabel, marginBottom: spacing.xxs },
  amount: { fontSize: 18, fontWeight: '700', color: adminColors.salaryTotal },
});
