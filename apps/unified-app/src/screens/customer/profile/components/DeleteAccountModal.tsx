import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button } from '@prime/ui';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type DeleteAccountModalProps = {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function DeleteAccountModal({ visible, loading, onClose, onConfirm }: DeleteAccountModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Delete account?</Text>
          <Text style={styles.body}>
            Your account will be scheduled for deletion. Personal data is retained for up to 90 days per
            our retention policy, then permanently removed.
          </Text>
          <Button
            label={loading ? 'Processing…' : 'Delete my account'}
            onPress={onConfirm}
            style={styles.danger}
          />
          <Button label="Keep account" variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: `${colors.textPrimary}88`,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.errorRed },
  body: { color: colors.textSecondary, lineHeight: 22 },
  danger: { backgroundColor: colors.errorRed },
});
