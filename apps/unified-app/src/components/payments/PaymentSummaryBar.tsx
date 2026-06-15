import { StyleSheet, View } from 'react-native';

import { AdminKPICard } from '@/components/admin';
import { formatINR } from '@/utils/currencyFormat';
import { spacing } from '@/theme/spacing';

type Props = {
  total: number;
  confirmedSum: number;
  pendingSum: number;
  reviewCount?: number;
};

export function PaymentSummaryBar({ total, confirmedSum, pendingSum, reviewCount = 0 }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <AdminKPICard label="Total" value={String(total)} icon="📋" surface="purple" />
        <AdminKPICard label="Collected" value={formatINR(confirmedSum)} icon="✅" surface="teal" status="healthy" />
      </View>
      <View style={styles.row}>
        <AdminKPICard label="Pending" value={formatINR(pendingSum)} icon="⏳" surface="amber" status="attention" />
        <AdminKPICard
          label="Needs review"
          value={String(reviewCount)}
          icon="🔍"
          surface="blue"
          status={reviewCount > 0 ? 'attention' : 'neutral'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
});
