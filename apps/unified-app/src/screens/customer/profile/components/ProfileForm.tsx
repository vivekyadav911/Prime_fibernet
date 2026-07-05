import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { z } from 'zod';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { CustomerButton, CustomerLockedField, GlassCard } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

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
  addressHint?: string;
  saving?: boolean;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
};

function FieldIcon({
  name,
  fieldIconStyle,
}: {
  name: keyof typeof MaterialCommunityIcons.glyphMap;
  fieldIconStyle: { marginRight: number };
}) {
  const { theme } = useCustomerTheme();
  return <MaterialCommunityIcons name={name} size={20} color={theme.colors.outline} style={fieldIconStyle} />;
}

export function ProfileForm({ defaultValues, email, accountId, addressHint, saving, onSubmit }: ProfileFormProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();
  const addressInputRef = useRef<TextInput>(null);
  const { control, handleSubmit, reset } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <GlassCard padded contentStyle={styles.card}>
      <Text style={styles.sectionTitle}>PERSONAL INFORMATION</Text>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>FULL NAME</Text>
            <View style={styles.inputWrap}>
              <FieldIcon name="account-outline" fieldIconStyle={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={theme.colors.textMuted}
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
              <FieldIcon name="phone-outline" fieldIconStyle={styles.fieldIcon} />
              <TextInput
                style={[styles.input, styles.monoInput]}
                placeholder="Phone number"
                placeholderTextColor={theme.colors.textMuted}
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
              <FieldIcon name="map-marker-outline" fieldIconStyle={styles.fieldIcon} />
              <TextInput
                ref={addressInputRef}
                style={[styles.input, styles.textarea]}
                placeholder="Street, area, city"
                placeholderTextColor={theme.colors.textMuted}
                multiline
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                accessibilityLabel="Installation address"
              />
            </View>
            {error ? <Text style={styles.error}>{error.message}</Text> : null}
            {!value && addressHint ? (
              <View style={styles.hintBlock}>
                <Text style={styles.hint}>{addressHint}</Text>
                <CustomerButton
                  label="Add address"
                  variant="outline"
                  onPress={() => addressInputRef.current?.focus()}
                  style={styles.addAddressBtn}
                />
              </View>
            ) : null}
          </View>
        )}
      />

      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>ACCOUNT DETAILS</Text>

      <CustomerLockedField label="EMAIL ADDRESS" value={email} icon="email-outline" />

      <CustomerLockedField
        label="ACCOUNT ID"
        value={accountId ?? '—'}
        icon="tag-outline"
        mono
      />

      <CustomerButton
        label={saving ? 'Saving…' : 'Save Changes'}
        onPress={handleSubmit(onSubmit)}
        style={styles.btn}
        icon="check-circle-outline"
      />
    </GlassCard>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    card: {
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      ...theme.typography.label,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.bodySemiBold,
      marginBottom: theme.spacing.xs,
    },
    field: { gap: theme.spacing.xs, marginBottom: theme.spacing.sm },
    label: {
      ...theme.typography.label,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.bodySemiBold,
      paddingLeft: 4,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.inputFieldBorder,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.inputFieldBg,
      paddingHorizontal: theme.spacing.sm,
      minHeight: 48,
    },
    textareaWrap: { alignItems: 'flex-start', paddingTop: theme.spacing.sm },
    fieldIcon: { marginRight: theme.spacing.xs },
    input: {
      flex: 1,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.body,
      fontSize: 16,
      paddingVertical: theme.spacing.sm,
    },
    monoInput: { fontFamily: theme.fonts.mono },
    textarea: { minHeight: 64, textAlignVertical: 'top' },
    error: { color: theme.colors.error, fontSize: 12, fontFamily: theme.fonts.body },
    hint: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontFamily: theme.fonts.body,
      lineHeight: 18,
    },
    hintBlock: { gap: theme.spacing.sm, marginTop: theme.spacing.xs },
    addAddressBtn: { alignSelf: 'flex-start' },
    divider: { height: 1, backgroundColor: theme.colors.dividerSubtle, marginVertical: theme.spacing.sm },
    btn: { marginTop: theme.spacing.md },
  });
