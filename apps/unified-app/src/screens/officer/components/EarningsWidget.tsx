import { StyleSheet, Text, View } from 'react-native';

import { useGetPayslipsQuery } from '@/services/api/officersApi';
import { useAppSelector } from '@/store/hooks';
import { formatINR } from '@/utils/currencyFormat';
import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/spacing';

export function EarningsWidget() {
  const user = useAppSelector((s) => s.auth.user);
  const { data } = useGetPayslipsQuery(user?.id ?? '', { skip: !user?.id });

  const latest = data?.[0];
  const net = latest?.netPay ?? 0;
  const gross = net;
  const pct = gross > 0 ? 100 : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.icon}>💰</Text>
      <Text style={styles.title}>Earnings</Text>
      <Text style={styles.value}>
        {formatINR(net)}
        {gross > 0 ? ` / ${formatINR(gross)}` : ''}
      </Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  icon: { fontSize: 20, marginBottom: spacing.xxs },
  title: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' },
  value: { fontSize: 14, fontWeight: '700', color: colors.primaryNavy, marginVertical: spacing.xs },
  barTrack: {
    height: 6,
    backgroundColor: colors.borderDefault,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: colors.accentTeal },
});
