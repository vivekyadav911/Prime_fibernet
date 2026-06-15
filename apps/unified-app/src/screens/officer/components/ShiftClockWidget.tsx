import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@prime/ui';

import { useActiveShift } from '@/hooks/officer';
import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/spacing';

export function ShiftClockWidget() {
  const {
    isActive,
    elapsedLabel,
    handleClockIn,
    handleClockOut,
    clockingIn,
    clockingOut,
  } = useActiveShift();

  return (
    <View style={styles.card}>
      {!isActive ? (
        <>
          <Text style={styles.stateLabel}>NOT CLOCKED IN</Text>
          <Text style={styles.hint}>Tap to start your shift and begin tracking</Text>
          <Button
            label={clockingIn ? 'Clocking in…' : 'Clock In'}
            onPress={() => void handleClockIn()}
            disabled={clockingIn}
            style={styles.cta}
          />
        </>
      ) : (
        <>
          <View style={styles.activeRow}>
            <View style={styles.pulseDot} />
            <Text style={styles.activeLabel}>SHIFT ACTIVE</Text>
            <Text style={styles.elapsed}>{elapsedLabel} elapsed</Text>
          </View>
          <Button
            label={clockingOut ? 'Clocking out…' : 'Clock Out'}
            variant="secondary"
            onPress={() => void handleClockOut()}
            disabled={clockingOut}
            style={styles.cta}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primaryNavy,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  stateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.amber,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  hint: { fontSize: 14, color: colors.white, opacity: 0.85, marginBottom: spacing.md },
  cta: { minHeight: 48 },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.emerald,
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.emerald,
    letterSpacing: 0.5,
  },
  elapsed: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    fontVariant: ['tabular-nums'],
    marginLeft: 'auto',
  },
});
