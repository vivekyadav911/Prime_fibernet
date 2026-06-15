import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/spacing';

const STEPS = [
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'working', label: 'Working' },
  { key: 'resolved', label: 'Resolved' },
] as const;

const STATUS_INDEX: Record<string, number> = {
  pending: 0,
  assigned: 0,
  accepted: 1,
  in_transit: 1,
  on_site: 2,
  working: 2,
  resolved: 3,
  closed: 3,
};

type StatusStepperProps = {
  status: string;
};

export function StatusStepper({ status }: StatusStepperProps) {
  const currentIndex = STATUS_INDEX[status] ?? 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        {STEPS.map((step, index) => {
          const filled = index <= currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <View key={step.key} style={styles.stepCol}>
              <View style={styles.dotRow}>
                <View
                  style={[
                    styles.dot,
                    filled && styles.dotFilled,
                    isCurrent && styles.dotCurrent,
                  ]}
                />
                {index < STEPS.length - 1 ? (
                  <View style={[styles.line, index < currentIndex && styles.lineFilled]} />
                ) : null}
              </View>
              <Text style={[styles.label, filled && styles.labelFilled]}>{step.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: spacing.sm },
  track: { flexDirection: 'row', justifyContent: 'space-between' },
  stepCol: { flex: 1, alignItems: 'center' },
  dotRow: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  dotFilled: { borderColor: colors.accentTeal, backgroundColor: colors.accentTeal },
  dotCurrent: { borderColor: colors.emerald, backgroundColor: colors.emerald },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: colors.borderDefault,
    marginHorizontal: 2,
  },
  lineFilled: { backgroundColor: colors.accentTeal },
  label: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
  labelFilled: { color: colors.textPrimary, fontWeight: '600' },
});
