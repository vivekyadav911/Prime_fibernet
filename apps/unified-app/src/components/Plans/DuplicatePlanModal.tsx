import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@prime/ui';

import { FormField } from '@/components/admin';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { Plan } from '@/types/plans';

type DuplicatePlanModalProps = {
  visible: boolean;
  plan: Plan | null;
  onClose: () => void;
  onConfirm: (displayName: string, planTag: string) => Promise<void>;
};

export function DuplicatePlanModal({ visible, plan, onClose, onConfirm }: DuplicatePlanModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [planTag, setPlanTag] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (plan && visible) {
      setDisplayName(`Copy of ${plan.displayName}`);
      setPlanTag(`${plan.planTag || plan.name}_copy`);
    }
  }, [plan, visible]);

  if (!plan) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Duplicate Plan</Text>
          <Text style={styles.subtitle}>{plan.displayName}</Text>

          <FormField label="Display Name" value={displayName} onChangeText={setDisplayName} />
          <FormField label="Plan Tag" value={planTag} onChangeText={setPlanTag} />

          <Text style={styles.note}>
            A new plan will be created with the same speed, pricing, and features. Subscribers will NOT
            be copied.
          </Text>

          <View style={styles.actions}>
            <Button label="Cancel" variant="ghost" onPress={onClose} />
            <Button
              label={loading ? 'Duplicating…' : 'Duplicate'}
              disabled={loading || !displayName.trim()}
              onPress={() => {
                setLoading(true);
                void onConfirm(displayName.trim(), planTag.trim()).finally(() => setLoading(false));
              }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.md },
  note: { fontSize: 13, color: colors.textSecondary, marginVertical: spacing.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.md },
});
