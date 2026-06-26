import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { z } from 'zod';

import { CustomerButton, GlassCard } from '@/components/customer/ui';
import { signalGlass } from '@/theme/customer/signalGlass';

import type { ProfileFormValues } from '../hooks/useProfile';

const profileSchema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  phone: z.string().min(10, 'Enter a valid phone number'),
  address: z.string().min(5, 'Enter your service address'),
});

type ProfileFormProps = {
  defaultValues: ProfileFormValues;
  email: string;
  accountId?: string;
  saving?: boolean;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
};

function FieldIcon({ name }: { name: keyof typeof MaterialCommunityIcons.glyphMap }) {
  return <MaterialCommunityIcons name={name} size={20} color={signalGlass.colors.outline} style={styles.fieldIcon} />;
}

export function ProfileForm({ defaultValues, email, accountId, saving, onSubmit }: ProfileFormProps) {
  const { control, handleSubmit, reset } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <GlassCard style={styles.card} padded>
      <Text style={styles.sectionTitle}>PERSONAL INFORMATION</Text>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>FULL NAME</Text>
            <View style={styles.inputWrap}>
              <FieldIcon name="account-outline" />
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={signalGlass.colors.textMuted}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                accessibilityLabel="Full name"
              />
            </View>
            {error ? <Text style={styles.error}>{error.message}</Text> : null}
          </View>
        )}
      />

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>PHONE NUMBER</Text>
            <View style={styles.inputWrap}>
              <FieldIcon name="phone-outline" />
              <TextInput
                style={[styles.input, styles.monoInput]}
                placeholder="Phone number"
                placeholderTextColor={signalGlass.colors.textMuted}
                keyboardType="phone-pad"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                accessibilityLabel="Phone number"
              />
            </View>
            {error ? <Text style={styles.error}>{error.message}</Text> : null}
          </View>
        )}
      />

      <Controller
        control={control}
        name="address"
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>INSTALLATION ADDRESS</Text>
            <View style={[styles.inputWrap, styles.textareaWrap]}>
              <FieldIcon name="map-marker-outline" />
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Address"
                placeholderTextColor={signalGlass.colors.textMuted}
                multiline
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                accessibilityLabel="Installation address"
              />
            </View>
            {error ? <Text style={styles.error}>{error.message}</Text> : null}
          </View>
        )}
      />

      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>ACCOUNT DETAILS</Text>

      <View style={styles.field}>
        <Text style={styles.label}>EMAIL ADDRESS</Text>
        <View style={[styles.inputWrap, styles.readOnly]}>
          <FieldIcon name="email-outline" />
          <TextInput style={styles.input} value={email} editable={false} />
          <MaterialCommunityIcons name="lock-outline" size={18} color={signalGlass.colors.outline} />
        </View>
      </View>

      {accountId ? (
        <View style={styles.field}>
          <Text style={styles.label}>ACCOUNT ID</Text>
          <View style={[styles.inputWrap, styles.readOnly]}>
            <FieldIcon name="tag-outline" />
            <TextInput style={[styles.input, styles.monoInput]} value={accountId} editable={false} />
            <MaterialCommunityIcons name="lock-outline" size={18} color={signalGlass.colors.outline} />
          </View>
        </View>
      ) : null}

      <CustomerButton
        label={saving ? 'Saving…' : 'Save Changes'}
        onPress={handleSubmit(onSubmit)}
        style={styles.btn}
        icon="check-circle-outline"
      />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: signalGlass.radius.lg,
    gap: signalGlass.spacing.sm,
  },
  sectionTitle: {
    ...signalGlass.typography.label,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.bodySemiBold,
    marginBottom: signalGlass.spacing.xs,
  },
  field: { gap: signalGlass.spacing.xs, marginBottom: signalGlass.spacing.sm },
  label: {
    ...signalGlass.typography.label,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.bodySemiBold,
    paddingLeft: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(66,71,84,0.3)',
    borderRadius: signalGlass.radius.sm,
    backgroundColor: 'rgba(29,32,39,0.5)',
    paddingHorizontal: signalGlass.spacing.sm,
    minHeight: 48,
  },
  textareaWrap: { alignItems: 'flex-start', paddingTop: signalGlass.spacing.sm },
  fieldIcon: { marginRight: signalGlass.spacing.xs },
  input: {
    flex: 1,
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.body,
    fontSize: 16,
    paddingVertical: signalGlass.spacing.sm,
  },
  monoInput: { fontFamily: signalGlass.fonts.mono },
  textarea: { minHeight: 64, textAlignVertical: 'top' },
  readOnly: { opacity: 0.5, borderStyle: 'dashed' },
  error: { color: signalGlass.colors.error, fontSize: 12, fontFamily: signalGlass.fonts.body },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: signalGlass.spacing.sm },
  btn: { marginTop: signalGlass.spacing.md },
});
