import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

type UsageBarProps = {
  usedGb?: number | null;
  limitGb?: number | null;
  isUnlimited?: boolean;
};

export function UsageBar({ usedGb, limitGb, isUnlimited = false }: UsageBarProps) {
  const styles = useThemedStyles(createStyles);

  if (isUnlimited) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>Unlimited data</Text>
        <View style={styles.track}>
          <View style={[styles.fill, styles.fillFull]} />
        </View>
      </View>
    );
  }

  if (limitGb == null || limitGb <= 0) {
    return null;
  }

  const hasUsage = usedGb != null && usedGb >= 0;
  const pct = hasUsage ? Math.min(100, Math.round((usedGb / limitGb) * 100)) : 0;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {hasUsage ? `${usedGb} GB used of ${limitGb} GB` : `Data cap: ${limitGb} GB`}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: hasUsage ? `${pct}%` : '0%' }]} />
      </View>
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    wrap: { marginVertical: theme.spacing.sm },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.body,
      fontSize: 12,
      marginBottom: theme.spacing.xs,
    },
    track: {
      height: 8,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.borderSubtle,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      backgroundColor: theme.colors.accentPrimary,
      borderRadius: theme.radius.pill,
    },
    fillFull: {
      width: '100%',
    },
  });
