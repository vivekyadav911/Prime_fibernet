import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type StockProgressBarProps = {
  available: number;
  total: number;
};

function fillColor(pct: number): string {
  if (pct < 5) return '#EF4444';
  if (pct <= 20) return '#F59E0B';
  return '#10B981';
}

export function StockProgressBar({ available, total }: StockProgressBarProps) {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
  const width = `${Math.min(100, Math.max(0, pct))}%`;

  return (
    <View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: width as `${number}%`, backgroundColor: fillColor(pct) }]} />
      </View>
      <Text style={styles.label}>{pct}% available</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.full },
  label: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xxs },
});
