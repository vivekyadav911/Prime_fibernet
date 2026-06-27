import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { PayrollWarningCode } from '@/types/payslip';

const WARNING_META: Record<
  PayrollWarningCode,
  { label: string; tone: 'error' | 'warning' }
> = {
  zero_pay: { label: 'Zero pay', tone: 'error' },
  missing_officer_data: { label: 'Missing profile', tone: 'error' },
  incomplete_attendance: { label: 'Incomplete', tone: 'warning' },
  unresolved_attendance: { label: 'Unresolved days', tone: 'warning' },
  no_shift_assigned: { label: 'No shift assigned', tone: 'error' },
  snapshot_invalid: { label: 'Invalid snapshot', tone: 'error' },
  no_compensation: { label: 'No salary', tone: 'error' },
};

type Props = {
  codes: PayrollWarningCode[];
};

export function PayrollWarningBadges({ codes }: Props) {
  if (!codes.length) return null;

  return (
    <View style={styles.row}>
      {codes.map((code) => {
        const meta = WARNING_META[code];
        const isError = meta.tone === 'error';
        return (
          <View
            key={code}
            style={[styles.badge, isError ? styles.badgeError : styles.badgeWarning]}
          >
            <Text style={[styles.text, isError ? styles.textError : styles.textWarning]}>
              {meta.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs },
  badge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderWidth: 1,
  },
  badgeError: {
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderColor: colors.errorRed,
  },
  badgeWarning: {
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
    borderColor: colors.warningAmber,
  },
  text: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  textError: { color: colors.errorRed },
  textWarning: { color: colors.warningAmber },
});
