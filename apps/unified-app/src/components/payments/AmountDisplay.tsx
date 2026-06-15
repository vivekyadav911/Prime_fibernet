import { StyleSheet, Text } from 'react-native';

import { formatINR } from '@/utils/currencyFormat';
import { colors } from '@/theme/colors';

type Props = { amount: number; large?: boolean; muted?: boolean };

export function AmountDisplay({ amount, large, muted }: Props) {
  return (
    <Text style={[large ? styles.large : styles.normal, muted && styles.muted]}>
      {formatINR(amount)}
    </Text>
  );
}

const styles = StyleSheet.create({
  large: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  normal: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  muted: { color: colors.textSecondary },
});
