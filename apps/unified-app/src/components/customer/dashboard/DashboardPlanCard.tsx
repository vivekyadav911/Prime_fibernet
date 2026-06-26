import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { CustomerButton, GlassCard } from '@/components/customer/ui';
import { signalGlass } from '@/theme/customer/signalGlass';
import { formatDateIst } from '@/utils/formatDate';

type DashboardPlanCardProps = {
  planName: string;
  renewalDate: string;
  isUnlimited?: boolean;
  onPayNow: () => void;
};

export function DashboardPlanCard({ planName, renewalDate, isUnlimited, onPayNow }: DashboardPlanCardProps) {
  return (
    <GlassCard style={styles.card} padded>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>CURRENT PLAN</Text>
          <Text style={styles.planName} numberOfLines={2}>
            {planName}
          </Text>
        </View>
        <MaterialCommunityIcons name="router-wireless" size={32} color={signalGlass.colors.primary} />
      </View>
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Data Usage</Text>
          <Text style={styles.detailValue}>{isUnlimited ? 'Unlimited' : '—'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Renewal Date</Text>
          <Text style={styles.detailValue}>{formatDateIst(renewalDate)}</Text>
        </View>
      </View>
      <CustomerButton label="Pay Now" onPress={onPayNow} style={styles.payBtn} icon="credit-card-outline" />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: signalGlass.radius.lg,
    justifyContent: 'space-between',
    minHeight: 280,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: signalGlass.spacing.md,
    gap: signalGlass.spacing.sm,
  },
  headerText: { flex: 1, minWidth: 0 },
  kicker: {
    ...signalGlass.typography.label,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.bodyMedium,
    marginBottom: signalGlass.spacing.xs,
  },
  planName: {
    ...signalGlass.typography.displayMd,
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.bodySemiBold,
  },
  details: {
    backgroundColor: signalGlass.colors.surfaceContainerLow,
    borderRadius: signalGlass.radius.sm,
    padding: signalGlass.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: signalGlass.spacing.md,
    gap: signalGlass.spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    ...signalGlass.typography.body,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.body,
  },
  detailValue: {
    ...signalGlass.typography.monoMd,
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.mono,
  },
  payBtn: { width: '100%' },
});
