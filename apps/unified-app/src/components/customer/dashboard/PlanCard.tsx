import { StyleSheet, Text, View } from 'react-native';

import { CustomerBadge, CustomerButton, GlassCard } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';
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
  const styles = useThemedStyles(createStyles);
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

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    card: { marginBottom: theme.spacing.lg },
    overdueBorder: { borderColor: theme.colors.accentDanger },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    planName: {
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.display,
      fontSize: 18,
      fontWeight: '700',
      flex: 1,
      flexShrink: 1,
      marginRight: theme.spacing.sm,
    },
    renewal: {
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.body,
      fontSize: 14,
      marginBottom: theme.spacing.sm,
    },
    warningStrip: {
      color: theme.colors.accentWarning,
      fontFamily: theme.fonts.bodyMedium,
      fontSize: 13,
      marginBottom: theme.spacing.sm,
    },
    overdueStrip: {
      color: theme.colors.accentDanger,
      fontFamily: theme.fonts.bodyMedium,
      fontSize: 13,
      marginBottom: theme.spacing.sm,
    },
    actions: { gap: theme.spacing.sm, marginTop: theme.spacing.md },
    primaryBtn: { width: '100%' },
  });
