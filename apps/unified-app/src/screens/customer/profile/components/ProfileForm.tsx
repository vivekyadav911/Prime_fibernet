import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { CustomerButton } from '@/components/customer/ui';
import { signalGlass } from '@/theme/customer/signalGlass';

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
            <Text style={styles.label}>FULL NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor={signalGlass.colors.textMuted}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              accessibilityLabel="Full name"
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
            <Text style={styles.label}>PHONE</Text>
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              placeholderTextColor={signalGlass.colors.textMuted}
              keyboardType="phone-pad"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              accessibilityLabel="Phone number"
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
            <Text style={styles.label}>SERVICE ADDRESS</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Address"
              placeholderTextColor={signalGlass.colors.textMuted}
              multiline
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              accessibilityLabel="Service address"
            />
            {error ? <Text style={styles.error}>{error.message}</Text> : null}
          </View>
        )}
      />

      <CustomerButton
        label={saving ? 'Saving…' : 'Save changes'}
        onPress={handleSubmit(onSubmit)}
        style={styles.btn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: signalGlass.colors.bgSurface,
    borderRadius: signalGlass.radius.md,
    padding: signalGlass.spacing.lg,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
    gap: signalGlass.spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.display,
    marginBottom: signalGlass.spacing.xs,
  },
  field: { gap: signalGlass.spacing.xs },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: signalGlass.colors.textSecondary,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
    borderRadius: signalGlass.radius.sm,
    padding: signalGlass.spacing.md,
    backgroundColor: signalGlass.colors.bgDeep,
    color: signalGlass.colors.textPrimary,
    minHeight: 44,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  error: { color: signalGlass.colors.accentDanger, fontSize: 12 },
  btn: { marginTop: signalGlass.spacing.xs },
});
