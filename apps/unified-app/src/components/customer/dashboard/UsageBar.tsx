import { StyleSheet, Text, View } from 'react-native';

import { signalGlass } from '@/theme/customer/signalGlass';

type UsageBarProps = {
  usedGb: number;
  limitGb: number;
};

export function UsageBar({ usedGb, limitGb }: UsageBarProps) {
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

const styles = StyleSheet.create({
  wrap: { marginVertical: signalGlass.spacing.sm },
  label: {
    color: signalGlass.colors.textSecondary,
    fontFamily: signalGlass.fonts.body,
    fontSize: 12,
    marginBottom: signalGlass.spacing.xs,
  },
  track: {
    height: 8,
    borderRadius: signalGlass.radius.pill,
    backgroundColor: signalGlass.colors.borderSubtle,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: signalGlass.colors.accentPrimary,
    borderRadius: signalGlass.radius.pill,
  },
});
