import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DateRangePicker } from '@/components/admin';
import type { PaymentChannel, PaymentMethod, PaymentStatus } from '@/types/payments';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export type PaymentFilterState = {
  status: PaymentStatus | 'all';
  method: PaymentMethod | 'all';
  channel: PaymentChannel | 'all';
  search: string;
  dateFrom: string;
  dateTo: string;
};

type Props = {
  value: PaymentFilterState;
  onChange: (next: PaymentFilterState) => void;
  statusCounts?: Partial<Record<PaymentStatus | 'all', number>>;
};

const STATUS_CHIPS: { id: PaymentStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending_review', label: 'Pending Review' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'cash_collected', label: 'Cash' },
  { id: 'failed', label: 'Failed' },
];

export function PaymentFilterBar({ value, onChange, statusCounts }: Props) {
  const [showDates, setShowDates] = useState(false);

  const setStatus = useCallback(
    (status: PaymentStatus | 'all') => onChange({ ...value, status }),
    [onChange, value],
  );

  const chips = useMemo(
    () =>
      STATUS_CHIPS.map((c) => ({
        ...c,
        count: statusCounts?.[c.id],
      })),
    [statusCounts],
  );

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {chips.map((chip) => (
          <Pressable
            key={chip.id}
            style={[styles.chip, value.status === chip.id && styles.chipActive]}
            onPress={() => setStatus(chip.id)}
          >
            <Text style={[styles.chipText, value.status === chip.id && styles.chipTextActive]}>
              {chip.label}
              {chip.count != null ? ` (${chip.count})` : ''}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable onPress={() => setShowDates((v) => !v)}>
        <Text style={styles.dateToggle}>Date range {showDates ? '▴' : '▾'}</Text>
      </Pressable>
      {showDates ? (
        <DateRangePicker
          from={value.dateFrom}
          to={value.dateTo}
          onFromChange={(dateFrom) => onChange({ ...value, dateFrom })}
          onToChange={(dateTo) => onChange({ ...value, dateTo })}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginBottom: spacing.sm },
  chips: { flexGrow: 0 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: adminColors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: adminColors.primaryTint, borderColor: adminColors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: adminColors.primary },
  dateToggle: { fontSize: 12, fontWeight: '600', color: adminColors.primary },
});
