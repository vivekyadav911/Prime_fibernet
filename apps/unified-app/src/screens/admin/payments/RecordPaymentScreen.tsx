import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { AdminButton, AdminScreenLayout } from '@/components/admin';
import { SelectCustomerModal } from '@/components/TicketPortal/SelectCustomerModal';
import { DismissKeyboardScrollView } from '@/components/common';
import { useRecordManualPaymentMutation } from '@/services/api/paymentCollectionApi';
import type { AdminUserListItem } from '@/types/api/admin';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { parseAmountInput } from '@/utils/currencyFormat';

const METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'netbanking', label: 'Netbanking' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'other', label: 'Other' },
] as const;

const recordPaymentSchema = z
  .object({
    amount: z.string().min(1, 'Amount is required'),
    method: z.enum(['cash', 'netbanking', 'upi', 'bank_transfer', 'other']),
    reference: z.string().optional(),
    notes: z.string().optional(),
    confirmed: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const parsed = parseAmountInput(data.amount);
    if (!parsed || parsed <= 0) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid amount', path: ['amount'] });
    }
    if (data.method !== 'cash' && !data.reference?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Reference is required for non-cash payments',
        path: ['reference'],
      });
    }
  });

type FormValues = z.infer<typeof recordPaymentSchema>;

type Props = {
  onSuccess?: (paymentId: string) => void;
  onCancel?: () => void;
};

export function RecordPaymentForm({ onSuccess, onCancel }: Props) {
  const [customer, setCustomer] = useState<AdminUserListItem | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [recordPayment, { isLoading }] = useRecordManualPaymentMutation();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      amount: '',
      method: 'upi',
      reference: '',
      notes: '',
      confirmed: false,
    },
  });

  const method = watch('method');

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (!customer) {
        Alert.alert('Select customer', 'Choose the customer this payment is for.');
        return;
      }
      const amount = parseAmountInput(values.amount);
      if (!amount) return;

      try {
        const result = await recordPayment({
          customerId: customer.id,
          amount,
          method: values.method,
          reference: values.reference?.trim() || undefined,
          notes: values.notes?.trim() || undefined,
          confirmed: values.method === 'cash' ? values.confirmed : true,
        }).unwrap();
        Alert.alert(
          'Payment recorded',
          values.method === 'cash' && !values.confirmed
            ? 'Cash payment logged and pending review.'
            : 'Remote payment recorded successfully.',
        );
        onSuccess?.(result.paymentId);
      } catch (e) {
        Alert.alert('Could not record payment', e instanceof Error ? e.message : 'Try again.');
      }
    },
    [customer, onSuccess, recordPayment],
  );

  return (
    <>
      <DismissKeyboardScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>CUSTOMER</Text>
        <AdminButton
          label={customer ? `${customer.name} · ${customer.username ?? customer.phone ?? customer.email}` : 'Search customer'}
          variant="secondary"
          onPress={() => setPickerVisible(true)}
        />

        <Text style={styles.label}>AMOUNT (₹)</Text>
        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, errors.amount ? styles.inputError : null]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
            />
          )}
        />
        {errors.amount ? <Text style={styles.error}>{errors.amount.message}</Text> : null}

        <Text style={styles.label}>METHOD</Text>
        <Controller
          control={control}
          name="method"
          render={({ field: { onChange, value } }) => (
            <View style={styles.methodRow}>
              {METHOD_OPTIONS.map((option) => (
                <AdminButton
                  key={option.value}
                  label={option.label}
                  variant={value === option.value ? 'primary' : 'secondary'}
                  onPress={() => onChange(option.value)}
                />
              ))}
            </View>
          )}
        />

        {method !== 'cash' ? (
          <>
            <Text style={styles.label}>REFERENCE / TRANSACTION ID</Text>
            <Controller
              control={control}
              name="reference"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.reference ? styles.inputError : null]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="UPI / card / bank reference"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                />
              )}
            />
            {errors.reference ? <Text style={styles.error}>{errors.reference.message}</Text> : null}
          </>
        ) : null}

        <Text style={styles.label}>NOTES (OPTIONAL)</Text>
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, styles.notes]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Phone call, walk-in, transfer confirmation…"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
          )}
        />

        {method === 'cash' ? (
          <Controller
            control={control}
            name="confirmed"
            render={({ field: { onChange, value } }) => (
              <AdminButton
                label={value ? 'Confirmed by reviewer' : 'Mark as pending review'}
                variant={value ? 'primary' : 'secondary'}
                onPress={() => onChange(!value)}
              />
            )}
          />
        ) : null}

        <AdminButton label="Record payment" onPress={() => void handleSubmit(onSubmit)()} disabled={isLoading} />
        {onCancel ? <AdminButton label="Cancel" variant="ghost" onPress={onCancel} /> : null}
      </DismissKeyboardScrollView>

      <SelectCustomerModal
        visible={pickerVisible}
        selectedCustomerId={customer?.id ?? null}
        onClose={() => setPickerVisible(false)}
        onSelect={setCustomer}
      />
    </>
  );
}

import type { AdminPaymentsStackParamList } from '@/types/navigation';

type AdminScreenProps = NativeStackScreenProps<AdminPaymentsStackParamList, 'RecordPayment'>;

export function RecordPaymentScreen({ navigation }: AdminScreenProps) {
  return (
    <AdminScreenLayout scroll={false}>
      <RecordPaymentForm
        onSuccess={(paymentId) => navigation.replace('PaymentDetail', { paymentId })}
        onCancel={() => navigation.goBack()}
      />
    </AdminScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm, paddingBottom: spacing.xl },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputError: { borderColor: colors.errorRed },
  notes: { minHeight: 88, textAlignVertical: 'top' },
  error: { fontSize: 12, color: colors.errorRed },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
