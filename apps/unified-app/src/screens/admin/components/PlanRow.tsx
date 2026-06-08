import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Plan } from '@prime/types';
import { Button } from '@prime/ui';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type PlanRowProps = {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  onDelete: (planId: string) => void;
};

export const PlanRow = React.memo(function PlanRow({ plan, onEdit, onDelete }: PlanRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name}>{plan.name}</Text>
        <Text style={styles.meta}>{plan.speedMbps} Mbps · ₹{plan.price}</Text>
      </View>
      <Button label="Edit" variant="ghost" onPress={() => onEdit(plan)} />
      <Button label="Delete" variant="ghost" onPress={() => onDelete(plan.id)} />
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault, gap: spacing.xs },
  info: { flex: 1 },
  name: { fontWeight: '600' },
  meta: { color: colors.textSecondary, fontSize: 12 },
});
