import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

type UsageBarProps = {
  usedGb: number;
  limitGb: number;
};

export function UsageBar({ usedGb, limitGb }: UsageBarProps) {
  const styles = useThemedStyles(createStyles);
  const pct = Math.min(100, Math.round((usedGb / limitGb) * 100));

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {usedGb} GB used of {limitGb} GB
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
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
  });
