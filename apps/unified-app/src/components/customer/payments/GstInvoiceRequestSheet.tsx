import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { CustomerButton } from '@/components/customer/ui';
import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

const gstSchema = z.object({
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Enter a valid 15-character GSTIN'),
  businessName: z.string().trim().min(2, 'Business name is required').max(120),
  billingAddress: z.string().trim().min(10, 'Enter a complete billing address').max(300),
});

export type GstInvoiceFormValues = z.infer<typeof gstSchema>;

type GstInvoiceRequestSheetProps = {
  visible: boolean;
  loading?: boolean;
  onSubmit: (values: GstInvoiceFormValues) => void;
  onClose: () => void;
};

export function GstInvoiceRequestSheet({ visible, loading, onSubmit, onClose }: GstInvoiceRequestSheetProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useCustomerTheme();
  const styles = useThemedStyles(createStyles);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GstInvoiceFormValues>({
    resolver: zodResolver(gstSchema),
    defaultValues: { gstin: '', businessName: '', billingAddress: '' },
  });

  const onDismiss = () => {
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityLabel="Dismiss" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Request GST invoice</Text>
        <Text style={styles.subtitle}>We will email your GST invoice within 2 business days.</Text>

        <Text style={styles.label}>GSTIN</Text>
        <Controller
          control={control}
          name="gstin"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, errors.gstin && styles.inputError]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="characters"
              maxLength={15}
              placeholder="22AAAAA0000A1Z5"
              placeholderTextColor={theme.colors.textMuted}
            />
          )}
        />
        {errors.gstin ? <Text style={styles.error}>{errors.gstin.message}</Text> : null}

        <Text style={styles.label}>Business name</Text>
        <Controller
          control={control}
          name="businessName"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, errors.businessName && styles.inputError]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Registered business name"
              placeholderTextColor={theme.colors.textMuted}
            />
          )}
        />
        {errors.businessName ? <Text style={styles.error}>{errors.businessName.message}</Text> : null}

        <Text style={styles.label}>Billing address</Text>
        <Controller
          control={control}
          name="billingAddress"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, styles.textArea, errors.billingAddress && styles.inputError]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              numberOfLines={3}
              placeholder="Full address for the GST invoice"
              placeholderTextColor={theme.colors.textMuted}
            />
          )}
        />
        {errors.billingAddress ? <Text style={styles.error}>{errors.billingAddress.message}</Text> : null}

        <CustomerButton
          label={loading ? 'Submitting…' : 'Submit request'}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
        />
        <CustomerButton label="Cancel" variant="ghost" onPress={onDismiss} disabled={loading} />
      </View>
    </Modal>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
    },
    sheet: {
      backgroundColor: theme.colors.bgSurface,
      borderTopLeftRadius: theme.radius.lg,
      borderTopRightRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      gap: theme.spacing.xs,
      borderTopWidth: 1,
      borderColor: theme.colors.borderSubtle,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.textMuted,
      marginBottom: theme.spacing.sm,
    },
    title: {
      ...theme.typography.displayMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      marginBottom: theme.spacing.sm,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      marginTop: theme.spacing.xs,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      borderRadius: theme.radius.sm,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceContainerLow,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.body,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    inputError: {
      borderColor: theme.colors.error,
    },
    error: {
      ...theme.typography.caption,
      color: theme.colors.error,
      fontFamily: theme.fonts.body,
    },
  });
