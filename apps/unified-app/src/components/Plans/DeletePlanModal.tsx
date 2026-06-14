import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@prime/ui';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { Plan } from '@/types/plans';

type DeletePlanModalProps = {
  visible: boolean;
  plan: Plan | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onMigrate: () => void;
};

export function DeletePlanModal({
  visible,
  plan,
  onClose,
  onConfirm,
  onMigrate,
}: DeletePlanModalProps) {
  const [loading, setLoading] = useState(false);

  if (!plan) return null;

  const hasSubscribers = plan.subscriberCount > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Delete Plan</Text>
          <Ionicons name="warning" size={48} color={adminColors.deleteIcon} style={styles.icon} />
          <Text style={styles.planName}>{plan.displayName}</Text>

          {hasSubscribers ? (
            <>
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ {plan.subscriberCount} customer{plan.subscriberCount === 1 ? '' : 's'} are currently
                  subscribed to this plan. You must migrate them to another plan before deleting.
                </Text>
              </View>
              <Button label="Migrate Subscribers" onPress={onMigrate} />
              <Button label="Cancel" variant="ghost" onPress={onClose} />
            </>
          ) : (
            <>
              <Text style={styles.message}>
                This plan has no subscribers. It will be permanently deleted.
              </Text>
              <View style={styles.actions}>
                <Button label="Cancel" variant="ghost" onPress={onClose} />
                <Button
                  label={loading ? 'Deleting…' : 'Delete Plan'}
                  disabled={loading}
                  onPress={() => {
                    setLoading(true);
                    void onConfirm().finally(() => setLoading(false));
                  }}
                  style={styles.deleteBtn}
                />
              </View>
            </>
          )}
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
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: adminColors.deleteIcon, marginBottom: spacing.sm },
  icon: { marginVertical: spacing.sm },
  planName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  warningBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    width: '100%',
  },
  warningText: { color: '#991B1B', fontSize: 13 },
  message: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
  deleteBtn: { backgroundColor: adminColors.deleteIcon },
});
