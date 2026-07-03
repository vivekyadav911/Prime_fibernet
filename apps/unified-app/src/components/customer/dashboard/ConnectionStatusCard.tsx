import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { CustomerButton, GlassCard } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';
import { formatCurrencyInr, formatCurrencyInrPrecise } from '@/utils/formatCurrency';
import { formatDateIst } from '@/utils/formatDate';

type ConnectionStatusCardProps = {
  isActive: boolean;
  planName?: string;
  speedMbps?: number;
  planPrice?: number;
  nextDueDate?: string | null;
  outstandingAmount?: number;
  onPayNow: () => void;
  onViewInvoice?: () => void;
  onContactSupport: () => void;
};

export function ConnectionStatusCard({
  isActive,
  planName,
  speedMbps,
  planPrice = 0,
  nextDueDate,
  outstandingAmount = 0,
  onPayNow,
  onViewInvoice,
  onContactSupport,
}: ConnectionStatusCardProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();

  if (isActive && planName) {
    const planLabel = speedMbps ? `${planName} ${speedMbps} Mbps` : planName;
    return (
      <GlassCard style={styles.card} glow padded>
        <View style={styles.headerRow}>
          <View style={styles.statusRow}>
            <MaterialCommunityIcons name="wifi" size={20} color={theme.colors.secondary} />
            <Text style={styles.statusTitle}>Connected</Text>
          </View>
          <Text style={styles.planLabel} numberOfLines={2}>
            Plan: {planLabel}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            Next due: {nextDueDate ? formatDateIst(nextDueDate) : '—'}
          </Text>
          <Text style={styles.priceText}>{formatCurrencyInr(planPrice)}/mo</Text>
        </View>

        <View style={styles.actions}>
          <CustomerButton label="Pay Now" onPress={onPayNow} style={styles.actionBtn} icon="credit-card-outline" />
          <CustomerButton
            label="View Invoice"
            variant="outline"
            onPress={onViewInvoice ?? onPayNow}
            style={styles.actionBtn}
            icon="file-document-outline"
          />
        </View>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={[styles.card, styles.inactiveCard]} padded>
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
      ...theme.typography.body,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.body,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    metaText: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      flex: 1,
    },
    priceText: {
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
