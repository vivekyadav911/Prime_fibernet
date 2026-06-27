import { StyleSheet, Text, View } from 'react-native';

import { SelectField } from '@/components/admin';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import {
  PAYROLL_MONTH_OPTIONS,
  payrollYearOptions,
  periodFromMonthYear,
  stepPayrollMonth,
} from '@/utils/payrollPeriod';

type Props = {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
};

export function PayrollMonthYearPicker({ month, year, onChange }: Props) {
  const normalized = periodFromMonthYear(month, year);
  const yearOptions = payrollYearOptions();

  return (
    <View style={styles.wrap}>
      <Text style={styles.periodLabel}>{normalized.label}</Text>
      <View style={styles.row}>
        <View style={styles.field}>
          <SelectField
            label="Month"
            value={String(normalized.month)}
            options={PAYROLL_MONTH_OPTIONS}
            onSelect={(value) => onChange(Number(value), normalized.year)}
          />
        </View>
        <View style={styles.field}>
          <SelectField
            label="Year"
            value={String(normalized.year)}
            options={yearOptions}
            onSelect={(value) => onChange(normalized.month, Number(value))}
          />
        </View>
      </View>
      <View style={styles.stepRow}>
        <Text
          style={styles.stepLink}
          onPress={() => {
            const prev = stepPayrollMonth(normalized.month, normalized.year, -1);
            onChange(prev.month, prev.year);
          }}
        >
          ← Previous month
        </Text>
        <Text
          style={styles.stepLink}
          onPress={() => {
            const next = stepPayrollMonth(normalized.month, normalized.year, 1);
            onChange(next.month, next.year);
          }}
        >
          Next month →
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xs,
  },
  periodLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: adminColors.primary,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  field: { flex: 1 },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xxs,
  },
  stepLink: {
    fontSize: 12,
    fontWeight: '600',
    color: adminColors.primary,
  },
});
