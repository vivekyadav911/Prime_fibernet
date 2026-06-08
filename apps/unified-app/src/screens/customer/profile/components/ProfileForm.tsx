import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@prime/ui';
import { z } from 'zod';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import type { ProfileFormValues } from '../hooks/useProfile';

const profileSchema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  phone: z.string().min(10, 'Enter a valid phone number'),
  address: z.string().min(5, 'Enter your service address'),
});

type ProfileFormProps = {
  defaultValues: ProfileFormValues;
  saving?: boolean;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
};

export function ProfileForm({ defaultValues, saving, onSubmit }: ProfileFormProps) {
  const { control, handleSubmit, reset } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Personal information</Text>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <View style={styles.field}>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor={colors.textSecondary}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
            {error ? <Text style={styles.error}>{error.message}</Text> : null}
          </View>
        )}
      />

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <View style={styles.field}>
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
            {error ? <Text style={styles.error}>{error.message}</Text> : null}
          </View>
        )}
      />

      <Controller
        control={control}
        name="address"
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <View style={styles.field}>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Address"
              placeholderTextColor={colors.textSecondary}
              multiline
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
            {error ? <Text style={styles.error}>{error.message}</Text> : null}
          </View>
        )}
      />

      <Button
        label={saving ? 'Saving…' : 'Save changes'}
        onPress={handleSubmit(onSubmit)}
        style={styles.btn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  field: { gap: spacing.xxs },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    color: colors.textPrimary,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  error: { color: colors.errorRed, fontSize: 12 },
  btn: { marginTop: spacing.xs },
});
