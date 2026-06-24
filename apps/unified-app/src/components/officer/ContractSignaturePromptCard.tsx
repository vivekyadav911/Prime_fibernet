import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { EmploymentContract } from '@/types/contract';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type Props = {
  contract: EmploymentContract;
  onSignNow: () => void;
  onViewPdf: () => void;
};

export function ContractSignaturePromptCard({ contract, onSignNow, onViewPdf }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Signature required</Text>
      <Text style={styles.title}>Employment contract</Text>
      <Text style={styles.body}>
        HR has requested your signature on your employment contract
        {contract.employeeDesignation ? ` (${contract.employeeDesignation})` : ''}.
      </Text>
      <View style={styles.actions}>
        <Pressable style={styles.primaryBtn} onPress={onSignNow}>
          <Text style={styles.primaryText}>Sign now</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={onViewPdf}>
          <Text style={styles.secondaryText}>View PDF</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primaryNavy,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
    opacity: 0.85,
    textTransform: 'uppercase',
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.white },
  body: { fontSize: 14, color: colors.white, opacity: 0.92, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  primaryText: { color: colors.primaryNavy, fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    flex: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.white,
  },
  secondaryText: { color: colors.white, fontWeight: '600', fontSize: 15 },
});
