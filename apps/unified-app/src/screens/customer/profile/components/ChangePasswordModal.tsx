import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@prime/ui';
import { z } from 'zod';

import { DismissKeyboardScrollView } from '@/components/common';
import { useKeyboardBottomInset } from '@/hooks/useKeyboardBottomInset';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

const schema = z
  .object({
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

type ChangePasswordModalProps = {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (newPassword: string) => Promise<void>;
};

export function ChangePasswordModal({ visible, loading, onClose, onSubmit }: ChangePasswordModalProps) {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardBottomInset(spacing.md);
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const submit = handleSubmit(async (values) => {
    await onSubmit(values.newPassword);
    reset();
    onClose();
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable
          style={[styles.overlay, { paddingTop: insets.top }]}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        >
          <Pressable
            style={[
              styles.sheet,
              {
                paddingBottom: Math.max(insets.bottom + spacing.lg, keyboardInset),
                maxHeight: keyboardInset > 0 ? '78%' : '88%',
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <DismissKeyboardScrollView contentContainerStyle={styles.sheetContent}>
              <Text style={styles.title}>Change password</Text>
              <Controller
                control={control}
                name="newPassword"
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <View>
                    <TextInput
                      style={styles.input}
                      placeholder="New password"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry
                      value={value}
                      onChangeText={onChange}
                    />
                    {error ? <Text style={styles.error}>{error.message}</Text> : null}
                  </View>
                )}
              />
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <View>
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm password"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry
                      value={value}
                      onChangeText={onChange}
                    />
                    {error ? <Text style={styles.error}>{error.message}</Text> : null}
                  </View>
                )}
              />
              <Button label={loading ? 'Updating…' : 'Update password'} onPress={submit} />
              <Button label="Cancel" variant="secondary" onPress={onClose} style={styles.cancel} />
            </DismissKeyboardScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: `${colors.textPrimary}88`,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sheetContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  error: { color: colors.errorRed, fontSize: 12, marginTop: spacing.xxs },
  cancel: { marginTop: spacing.xs },
});
