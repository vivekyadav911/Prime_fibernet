import { StyleSheet, Text, TextInput, View } from 'react-native';

import { DENOMINATION_NOTES } from '@/types/payments';
import { validateDenominationTotal } from '@/utils/nextDueDate';
import { formatINR } from '@/utils/currencyFormat';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type Props = {
  denominations: Record<string, number>;
  expectedAmount: number;
  onChange: (denominations: Record<string, number>) => void;
};

export function DenominationInput({ denominations, expectedAmount, onChange }: Props) {
  const { total, difference, valid } = validateDenominationTotal(denominations, expectedAmount);

  const setCount = (note: number, count: string) => {
    const parsed = Math.max(0, parseInt(count || '0', 10) || 0);
    onChange({ ...denominations, [String(note)]: parsed });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {DENOMINATION_NOTES.map((note) => (
          <View key={note} style={styles.cell}>
            <Text style={styles.noteLabel}>₹{note}</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={String(denominations[String(note)] ?? 0)}
              onChangeText={(v) => setCount(note, v)}
            />
          </View>
        ))}
      </View>
      <Text style={styles.summary}>
        Total: {formatINR(total)} · Expected: {formatINR(expectedAmount)}
      </Text>
      {difference !== 0 ? (
        <Text style={[styles.diff, valid ? styles.diffOk : styles.diffBad]}>
          Difference: {formatINR(Math.abs(difference))} {difference > 0 ? '(overpay)' : '(short)'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { width: '30%', minWidth: 96 },
  noteLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    textAlign: 'center',
  },
  summary: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  diff: { fontSize: 12 },
  diffOk: { color: colors.accentTeal },
  diffBad: { color: colors.errorRed },
});
