import { useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardDismissView } from '@/components/common';
import { colors } from '@/theme/colors';
import { adminColors } from '@/theme/admin';
import { radius, spacing } from '@/theme/spacing';

type DocumentLabelModalProps = {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (label: string) => void;
};

export function DocumentLabelModal({ visible, onCancel, onSubmit }: DocumentLabelModalProps) {
  const insets = useSafeAreaInsets();
  const [label, setLabel] = useState('');

  const handleSubmit = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setLabel('');
  };

  const handleCancel = () => {
    setLabel('');
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <Pressable
        style={[styles.backdrop, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        onPress={() => {
          Keyboard.dismiss();
          handleCancel();
        }}
      >
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <KeyboardDismissView>
            <Text style={styles.title}>Document label</Text>
            <Text style={styles.subtitle}>Enter a name for this document (e.g. Police verification)</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Document name"
              placeholderTextColor={colors.textSecondary}
              autoFocus
              onSubmitEditing={handleSubmit}
            />
            <View style={styles.actions}>
              <Pressable onPress={handleCancel} style={styles.cancelBtn} hitSlop={16}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                style={[styles.doneBtn, !label.trim() && styles.doneBtnDisabled]}
                disabled={!label.trim()}
                hitSlop={16}
              >
                <Text style={styles.doneText}>Continue</Text>
              </Pressable>
            </View>
          </KeyboardDismissView>
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
    padding: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceWhite,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  cancelBtn: { padding: spacing.xs },
  cancelText: { fontSize: 15, color: colors.textSecondary, fontWeight: '600' },
  doneBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: adminColors.primary,
  },
  doneBtnDisabled: { opacity: 0.5 },
  doneText: { fontSize: 15, color: colors.surfaceWhite, fontWeight: '700' },
});
