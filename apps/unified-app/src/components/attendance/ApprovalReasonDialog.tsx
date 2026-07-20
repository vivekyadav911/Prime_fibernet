import { useEffect, useState } from 'react';
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
import { Button } from '@prime/ui';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  submitLabel?: string;
  minReasonLength?: number;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
};

/** Centered dialog (not bottom sheet) for out-of-zone approval reason. */
export function ApprovalReasonDialog({
  visible,
  title,
  message,
  submitLabel = 'Submit request',
  minReasonLength = 0,
  loading,
  onCancel,
  onSubmit,
}: Props) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!visible) setReason('');
  }, [visible]);

  const trimmed = reason.trim();
  const canSubmit =
    !loading && (minReasonLength <= 0 ? true : trimmed.length >= minReasonLength);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        style={[styles.backdrop, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        onPress={() => {
          Keyboard.dismiss();
          onCancel();
        }}
      >
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TextInput
            style={styles.input}
            placeholder={
              minReasonLength > 0
                ? `Reason (required, min ${minReasonLength} characters)`
                : 'Reason (optional)'
            }
            value={reason}
            onChangeText={setReason}
            multiline
            placeholderTextColor={colors.textSecondary}
            editable={!loading}
          />
          {minReasonLength > 0 && trimmed.length > 0 && trimmed.length < minReasonLength ? (
            <Text style={styles.hint}>{minReasonLength - trimmed.length} more characters needed</Text>
          ) : null}
          <View style={styles.actions}>
            <Button label="Cancel" variant="ghost" onPress={onCancel} disabled={loading} />
            <Button
              label={loading ? 'Submitting…' : submitLabel}
              onPress={() => {
                onSubmit(trimmed);
              }}
              disabled={!canSubmit}
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
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    gap: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  message: { color: colors.textSecondary, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    minHeight: 88,
    textAlignVertical: 'top',
    backgroundColor: colors.surfaceWhite,
    color: colors.textPrimary,
  },
  hint: { fontSize: 12, color: colors.red },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
