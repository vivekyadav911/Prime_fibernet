import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export type PaymentMethodOption = 'cash' | 'netbanking' | 'upi';

type PaymentMethodSelectorProps = {
  value: PaymentMethodOption;
  onChange: (method: PaymentMethodOption) => void;
};

const METHODS: { key: PaymentMethodOption; label: string; icon: string }[] = [
  { key: 'cash', label: 'Cash', icon: '💵' },
  { key: 'netbanking', label: 'Netbanking', icon: '🏦' },
  { key: 'upi', label: 'UPI', icon: '📱' },
];

export function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  return (
    <View style={styles.row}>
      {METHODS.map((m) => (
        <Pressable
          key={m.key}
          style={[styles.option, value === m.key && styles.optionActive]}
          onPress={() => onChange(m.key)}
        >
          <Text style={styles.icon}>{m.icon}</Text>
          <Text style={[styles.label, value === m.key && styles.labelActive]}>{m.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
  option: {
    flex: 1,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
    padding: spacing.sm,
  },
  optionActive: { borderColor: colors.accentTeal, backgroundColor: colors.emeraldLight },
  icon: { fontSize: 22 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.xxs },
  labelActive: { color: colors.primaryNavy },
});
