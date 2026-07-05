import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { CustomerButton, GlassCard } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';
import { formatCurrencyInr, formatCurrencyInrPrecise } from '@/utils/formatCurrency';
import { formatDateIst } from '@/utils/formatDate';

import { UsageBar } from './UsageBar';

type ConnectionStatusCardProps = {
  isActive: boolean;
  planName?: string;
  speedMbps?: number;
  planPrice?: number;
  nextDueDate?: string | null;
  outstandingAmount?: number;
  daysUntilExpiry?: number;
  isExpiringSoon?: boolean;
  isUnlimited?: boolean;
  dataLimitGb?: number | null;
  onPayNow: () => void;
  onViewInvoice?: () => void;
  onContactSupport: () => void;
};

function renewalCountdownLabel(daysUntilExpiry: number, isOverdue: boolean): string {
  if (isOverdue || daysUntilExpiry < 0) return 'Renewal overdue';
  if (daysUntilExpiry === 0) return 'Renews today';
  if (daysUntilExpiry === 1) return 'Renews in 1 day';
  return `Renews in ${daysUntilExpiry} days`;
}

export function ConnectionStatusCard({
  isActive,
  planName,
  speedMbps,
  planPrice = 0,
  nextDueDate,
  outstandingAmount = 0,
  daysUntilExpiry = 0,
  isExpiringSoon = false,
  isUnlimited = true,
  dataLimitGb = null,
  onPayNow,
  onViewInvoice,
  onContactSupport,
}: ConnectionStatusCardProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();

  if (isActive && planName) {
    const planLabel = speedMbps ? `${planName} · ${speedMbps} Mbps` : planName;
    const hasOutstanding = outstandingAmount > 0;
    const renewalLabel = renewalCountdownLabel(daysUntilExpiry, daysUntilExpiry < 0);

    return (
      <GlassCard style={styles.card} glow padded contentStyle={styles.cardContent}>
        <View style={styles.headerRow}>
          <View style={styles.statusRow}>
            <MaterialCommunityIcons name="wifi" size={20} color={theme.colors.secondary} />
            <Text style={styles.statusTitle}>Connected</Text>
          </View>
          <Text style={styles.planLabel} numberOfLines={2}>
            {planLabel}
          </Text>
        </View>

        <UsageBar isUnlimited={isUnlimited} limitGb={dataLimitGb} />

        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={[styles.renewalText, isExpiringSoon && styles.renewalSoon]}>{renewalLabel}</Text>
            <Text style={styles.metaText}>
              Due {nextDueDate ? formatDateIst(nextDueDate) : '—'}
            </Text>
          </View>
          <Text style={styles.priceText}>{formatCurrencyInr(planPrice)}/mo</Text>
        </View>

        {hasOutstanding ? (
          <View style={styles.outstandingRow}>
            <Text style={styles.outstandingLabel}>Outstanding</Text>
            <Text style={styles.outstandingAmount}>{formatCurrencyInrPrecise(outstandingAmount)}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          {hasOutstanding ? (
            <CustomerButton
              label={`Pay Bill · ${formatCurrencyInrPrecise(outstandingAmount)}`}
              onPress={onPayNow}
              style={styles.actionBtn}
              icon="credit-card-outline"
            />
          ) : null}
          <CustomerButton
            label="View Invoice"
            variant={hasOutstanding ? 'outline' : 'primary'}
            onPress={onViewInvoice ?? onPayNow}
            style={styles.actionBtn}
            icon="file-document-outline"
          />
        </View>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={[styles.card, styles.inactiveCard]} padded contentStyle={styles.cardContent}>
      <View style={styles.statusRow}>
        <MaterialCommunityIcons name="alert-circle-outline" size={22} color={theme.colors.accentWarning} />
        <Text style={styles.inactiveTitle}>Service Inactive</Text>
      </View>
      <Text style={styles.inactiveBody}>Contact support or pay outstanding balance</Text>
      <View style={styles.actions}>
        <CustomerButton
          label={outstandingAmount > 0 ? `Pay ${formatCurrencyInrPrecise(outstandingAmount)}` : 'Pay Now'}
          onPress={onPayNow}
          style={styles.actionBtn}
          icon="credit-card-outline"
        />
        <CustomerButton
          label="Contact Support"
          variant="outline"
          onPress={onContactSupport}
          style={styles.actionBtn}
          icon="headset"
        />
      </View>
    </GlassCard>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    card: {
      borderRadius: theme.radius.lg,
    },
    cardContent: {
      gap: theme.spacing.md,
    },
    inactiveCard: {
      borderColor: theme.colors.accentWarning,
    },
    headerRow: {
      gap: theme.spacing.xs,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    statusTitle: {
      ...theme.typography.bodyLg,
      color: theme.colors.secondary,
      fontFamily: theme.fonts.bodySemiBold,
      fontWeight: '700',
    },
    planLabel: {
      ...theme.typography.bodyLg,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
      fontWeight: '600',
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: theme.spacing.sm,
    },
    metaCol: {
      flex: 1,
      gap: 2,
    },
    renewalText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodyMedium,
      fontWeight: '600',
    },
    renewalSoon: {
      color: theme.colors.accentWarning,
    },
    metaText: {
      ...theme.typography.caption,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
    },
    priceText: {
      ...theme.typography.monoMd,
      color: theme.colors.primary,
      fontFamily: theme.fonts.monoBold,
    },
    outstandingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.accentPrimaryMuted,
    },
    outstandingLabel: {
      ...theme.typography.caption,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.bodyMedium,
      textTransform: 'uppercase',
    },
    outstandingAmount: {
      ...theme.typography.monoMd,
      color: theme.colors.primary,
      fontFamily: theme.fonts.monoBold,
    },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    actionBtn: {
      flex: 1,
    },
    inactiveTitle: {
      ...theme.typography.bodyLg,
      color: theme.colors.accentWarning,
      fontFamily: theme.fonts.bodySemiBold,
      fontWeight: '700',
    },
    inactiveBody: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
    },
  });
