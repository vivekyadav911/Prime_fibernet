import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Plan } from '@prime/types';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';
import { getPlanDataLabel } from '@/utils/planDisplay';

type PlanFeatureListProps = {
  plan: Plan;
};

type FeatureRow = {
  key: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
};

function buildFeatureRows(plan: Plan): FeatureRow[] {
  const rows: FeatureRow[] = [
    {
      key: 'data',
      icon: 'database',
      label: 'Data',
      value: getPlanDataLabel(plan),
    },
    {
      key: 'validity',
      icon: 'calendar-clock',
      label: 'Validity',
      value: `${plan.validityDays} days per cycle`,
    },
    {
      key: 'router',
      icon: 'router-wireless',
      label: 'Router',
      value: plan.routerType?.trim() ? plan.routerType : 'Bring your own',
    },
    {
      key: 'static-ip',
      icon: 'ip-network',
      label: 'Static IP',
      value: plan.hasStaticIp ? 'Included' : 'Not included',
    },
    {
      key: 'ott',
      icon: 'television-play',
      label: 'OTT apps',
      value: plan.includesOtt ? 'Included' : 'Not included',
    },
  ];

  return rows;
}

function FeatureLine({ icon, label, value }: Omit<FeatureRow, 'key'>) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();

  return (
    <View style={styles.row}>
      <MaterialCommunityIcons name={icon} size={18} color={theme.colors.primary} />
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

export function PlanFeatureList({ plan }: PlanFeatureListProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();
  const rows = buildFeatureRows(plan);

  return (
    <View style={styles.wrap}>
      {rows.map((row) => (
        <FeatureLine key={row.key} icon={row.icon} label={row.label} value={row.value} />
      ))}
      {plan.features.length > 0 ? (
        <View style={styles.extra}>
          <Text style={styles.extraTitle}>Also includes</Text>
          {plan.features.map((feature) => (
            <View key={feature} style={styles.row}>
              <MaterialCommunityIcons name="check-circle-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.feature}>{feature}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    wrap: {
      gap: theme.spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    copy: {
      flex: 1,
      gap: 2,
    },
    label: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.bodyMedium,
      textTransform: 'uppercase',
    },
    value: {
      ...theme.typography.body,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.body,
    },
    extra: {
      marginTop: theme.spacing.xs,
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderSubtle,
    },
    extraTitle: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.bodyMedium,
      textTransform: 'uppercase',
    },
    feature: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      flex: 1,
    },
  });
