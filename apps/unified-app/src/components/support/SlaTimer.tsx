import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/theme/spacing';
import { formatSLARemaining, getSLAColor } from '@/utils/slaUtils';

type SlaTimerProps = {
  deadline: Date;
  totalMs?: number;
  compact?: boolean;
};

export function SlaTimer({ deadline, totalMs = 24 * 60 * 60 * 1000, compact }: SlaTimerProps) {
  const [remainingMs, setRemainingMs] = useState(deadline.getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setRemainingMs(deadline.getTime() - Date.now()), 60000);
    setRemainingMs(deadline.getTime() - Date.now());
    return () => clearInterval(id);
  }, [deadline]);

  const color = getSLAColor(remainingMs, totalMs);

  if (compact) {
    return (
      <View style={styles.compact}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.text, { color }]}>{formatSLARemaining(remainingMs)}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.full, { borderColor: color }]}>
      <Text style={[styles.label, { color }]}>SLA</Text>
      <Text style={[styles.value, { color }]}>{formatSLARemaining(remainingMs)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  compact: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 11, fontWeight: '600' },
  full: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  label: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  value: { fontSize: 14, fontWeight: '700' },
});
