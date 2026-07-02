import { StyleSheet, Text } from 'react-native';

import { PAYMENT_METHOD_CONFIG, type PaymentMethod } from '@/types/payments';

type Props = { method: PaymentMethod | string };

export function MethodIcon({ method }: Props) {
  const cfg = PAYMENT_METHOD_CONFIG[method as PaymentMethod] ?? {
    label: String(method),
    icon: '💳',
    color: '#64748B',
  };
  return (
    <Text style={styles.row}>
      <Text style={styles.icon}>{cfg.icon}</Text>
      <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  icon: { fontSize: 14 },
  label: { fontSize: 12, fontWeight: '600' },
});
