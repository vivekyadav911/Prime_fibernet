import { StyleSheet, Text, View } from 'react-native';

import type { DeliveryStats } from '@/types/notifications';
import { formatDeliveryRate } from '@/utils/notificationUtils';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type DeliveryAnalyticsCardProps = {
  delivery: DeliveryStats;
  onFailedPress?: () => void;
};

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

export function DeliveryAnalyticsCard({ delivery, onFailedPress }: DeliveryAnalyticsCardProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <StatBox label="TARGETED" value={delivery.totalTargeted} color={colors.textPrimary} />
        <StatBox label="SENT" value={delivery.totalSent} color="#3B82F6" />
        <StatBox label="DELIVERED" value={delivery.totalDelivered} color="#10B981" />
        <StatBox label="FAILED" value={delivery.totalFailed} color="#EF4444" />
      </View>
      <View style={styles.rateRow}>
        <View style={styles.rateItem}>
          <Text style={styles.rateLabel}>Delivery rate</Text>
          <Text style={styles.rateValue}>{formatDeliveryRate(delivery.deliveryRate)}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${delivery.deliveryRate * 100}%` }]} />
          </View>
        </View>
        <View style={styles.rateItem}>
          <Text style={styles.rateLabel}>Open rate</Text>
          <Text style={styles.rateValue}>{formatDeliveryRate(delivery.openRate)}</Text>
        </View>
        <View style={styles.rateItem}>
          <Text style={styles.rateLabel}>Processing</Text>
          <Text style={styles.rateValue}>{delivery.processingMs}ms</Text>
        </View>
      </View>
      {delivery.totalFailed > 0 && onFailedPress ? (
        <Text style={styles.failedLink} onPress={onFailedPress}>
          View {delivery.totalFailed} failed deliveries
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.5 },
  statValue: { fontSize: 22, fontWeight: '700', marginTop: 4 },
  rateRow: { flexDirection: 'row', gap: spacing.md },
  rateItem: { flex: 1 },
  rateLabel: { fontSize: 12, color: colors.textSecondary },
  rateValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginTop: 2 },
  progressTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#4F46E5' },
  failedLink: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
});
