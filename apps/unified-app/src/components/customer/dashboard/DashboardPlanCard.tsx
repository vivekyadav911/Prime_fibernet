import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { CustomerButton, GlassCard } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';
import { formatDateIst } from '@/utils/formatDate';

type DashboardPlanCardProps = {
  planName: string;
  renewalDate: string;
  isUnlimited?: boolean;
  onPayNow: () => void;
};

export function DashboardPlanCard({ planName, renewalDate, isUnlimited, onPayNow }: DashboardPlanCardProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();

  return (
    <GlassCard style={styles.card} padded>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>CURRENT PLAN</Text>
          <Text style={styles.planName} numberOfLines={2}>
            {planName}
          </Text>
        </View>
        <MaterialCommunityIcons name="router-wireless" size={32} color={theme.colors.primary} />
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

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    card: {
      flex: 1,
      borderRadius: theme.radius.lg,
      justifyContent: 'space-between',
      minHeight: 280,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    headerText: { flex: 1, minWidth: 0 },
    kicker: {
      ...theme.typography.label,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.bodyMedium,
      marginBottom: theme.spacing.xs,
    },
    planName: {
      ...theme.typography.displayMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
    },
    details: {
      backgroundColor: theme.colors.surfaceContainerLow,
      borderRadius: theme.radius.sm,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      marginBottom: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    detailLabel: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
    },
    detailValue: {
      ...theme.typography.monoMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.mono,
    },
    payBtn: { width: '100%' },
  });
