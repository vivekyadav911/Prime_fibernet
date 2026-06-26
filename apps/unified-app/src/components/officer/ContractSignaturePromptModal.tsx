import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type Props = {
  visible: boolean;
  onSignNow: () => void;
  onRemindLater: () => void;
};

export function ContractSignaturePromptModal({ visible, onSignNow, onRemindLater }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRemindLater}>
      <Pressable style={styles.backdrop} onPress={onRemindLater}>
        <Pressable
          style={[styles.sheet, { marginBottom: insets.bottom + spacing.md }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.title}>Sign your employment contract</Text>
          <Text style={styles.body}>
            HR has sent a request for your electronic signature. Please review and sign your
            employment contract to complete onboarding.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={onSignNow}>
            <Text style={styles.primaryText}>Sign now</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={onRemindLater}>
            <Text style={styles.secondaryText}>Remind me later</Text>
          </Pressable>
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
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  body: { fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  primaryBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primaryNavy,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  primaryText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  secondaryText: { color: colors.textSecondary, fontWeight: '600', fontSize: 15 },
});
