import { StyleSheet, Text, View } from 'react-native';

import { CustomerBadge, CustomerButton, GlassCard } from '@/components/customer/ui';
import { signalGlass } from '@/theme/customer/signalGlass';
import { formatDateIst } from '@/utils/formatDate';

import { UsageBar } from './UsageBar';

type PlanCardProps = {
  planName: string;
  status: 'active' | 'expiring' | 'expired' | 'overdue';
  renewalDate: string;
  daysUntilExpiry: number;
  dataUsedGb?: number;
  dataLimitGb?: number | null;
  isUnlimited?: boolean;
  onPayNow: () => void;
  onUpgrade: () => void;
};

export function PlanCard({
  planName,
  status,
  renewalDate,
  daysUntilExpiry,
  dataUsedGb,
  dataLimitGb,
  isUnlimited,
  onPayNow,
  onUpgrade,
}: PlanCardProps) {
  const badgeTone =
    status === 'overdue' || status === 'expired'
      ? 'danger'
      : status === 'expiring'
        ? 'warning'
        : 'success';
  const badgeLabel =
    status === 'overdue'
      ? 'OVERDUE'
      : status === 'expired'
        ? 'EXPIRED'
        : status === 'expiring'
          ? 'EXPIRING SOON'
          : 'ACTIVE';

  return (
    <GlassCard style={[styles.card, status === 'overdue' && styles.overdueBorder]}>
      <View style={styles.header}>
        <Text style={styles.planName}>{planName}</Text>
        <CustomerBadge label={badgeLabel} tone={badgeTone} />
      </View>
      <Text style={styles.renewal}>Renews on {formatDateIst(renewalDate)}</Text>
      {status === 'expiring' && daysUntilExpiry >= 0 ? (
        <Text style={styles.warningStrip}>Due in {daysUntilExpiry} days</Text>
      ) : null}
      {status === 'overdue' ? (
        <Text style={styles.overdueStrip}>Overdue — Pay Now</Text>
      ) : null}
      {!isUnlimited && dataLimitGb != null && dataUsedGb != null ? (
        <UsageBar usedGb={dataUsedGb} limitGb={dataLimitGb} />
      ) : null}
      <View style={styles.actions}>
        <CustomerButton label="Pay Now" onPress={onPayNow} style={styles.primaryBtn} />
        <CustomerButton label="Upgrade Plan" variant="ghost" onPress={onUpgrade} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: signalGlass.spacing.lg },
  overdueBorder: { borderColor: signalGlass.colors.accentDanger },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: signalGlass.spacing.sm,
  },
  planName: {
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.display,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    flexShrink: 1,
    marginRight: signalGlass.spacing.sm,
  },
  renewal: {
    color: signalGlass.colors.textSecondary,
    fontFamily: signalGlass.fonts.body,
    fontSize: 14,
    marginBottom: signalGlass.spacing.sm,
  },
  warningStrip: {
    color: signalGlass.colors.accentWarning,
    fontFamily: signalGlass.fonts.bodyMedium,
    fontSize: 13,
    marginBottom: signalGlass.spacing.sm,
  },
  overdueStrip: {
    color: signalGlass.colors.accentDanger,
    fontFamily: signalGlass.fonts.bodyMedium,
    fontSize: 13,
    marginBottom: signalGlass.spacing.sm,
  },
  actions: { gap: signalGlass.spacing.sm, marginTop: signalGlass.spacing.md },
  primaryBtn: { width: '100%' },
});
