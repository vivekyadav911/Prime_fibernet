import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@prime/ui';
import { z } from 'zod';

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
      <View style={styles.overlay}>
        <View style={styles.sheet}>
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: `${colors.textPrimary}88`,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
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
