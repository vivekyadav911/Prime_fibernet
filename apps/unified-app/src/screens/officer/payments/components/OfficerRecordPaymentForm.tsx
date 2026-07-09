import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { SelectCustomerModal } from '@/components/TicketPortal/SelectCustomerModal';
import { Button } from '@prime/ui';
import { DismissKeyboardScrollView } from '@/components/common';
import {
  useGetBankAccountsQuery,
  useRecordManualPaymentMutation,
} from '@/services/api/paymentCollectionApi';
import type { AdminUserListItem } from '@/types/api/admin';
import type { BankAccountRecord } from '@/types/payments';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { parseAmountInput } from '@/utils/currencyFormat';

import { OfficerDigitalUpiFields, type DigitalSubMode } from './OfficerDigitalUpiFields';

type CollectionMode = 'cash' | 'digital';

const formSchema = z.object({
  amount: z.string().min(1, 'Amount is required'),
  notes: z.string().optional(),
  upiReference: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  onSuccess?: (paymentId: string) => void;
  onCancel?: () => void;
};

function paymentErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'Could not record payment. Try again.';
}

export function OfficerRecordPaymentForm({ onSuccess, onCancel }: Props) {
  const [customer, setCustomer] = useState<AdminUserListItem | null>(null);
  const [mode, setMode] = useState<CollectionMode>('cash');
  const [digitalSubMode, setDigitalSubMode] = useState<DigitalSubMode>('qr');
  const [bankAccountId, setBankAccountId] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  const { data: bankAccounts = [] } = useGetBankAccountsQuery();
  const [recordPayment, { isLoading }] = useRecordManualPaymentMutation();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: '', notes: '', upiReference: '' },
  });

  const amountStr = watch('amount');
  const parsedAmount = parseAmountInput(amountStr) ?? 0;

  const defaultBank = useMemo(
    () => bankAccounts.find((b) => b.is_default) ?? bankAccounts[0] ?? null,
    [bankAccounts],
  );

  const selectedBank: BankAccountRecord | null = useMemo(() => {
    if (bankAccountId) {
      return bankAccounts.find((b) => b.id === bankAccountId) ?? defaultBank;
    }
    return defaultBank;
  }, [bankAccountId, bankAccounts, defaultBank]);

  const onSubmitCash = useCallback(
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
          method: 'cash',
          notes: values.notes?.trim() || undefined,
          confirmed: false,
          verificationMethod: 'manual',
        }).unwrap();
        Alert.alert('Submitted', 'Cash collection sent for admin verification.');
        onSuccess?.(result.paymentId);
      } catch (e) {
        console.error('[OfficerRecordPayment] cash collection failed', e);
        Alert.alert('Could not record payment', paymentErrorMessage(e));
      }
    },
    [customer, onSuccess, recordPayment],
  );

  const onShowQr = useCallback(() => {
    if (!customer) {
      Alert.alert('Select customer', 'Choose the customer first.');
      return;
    }
    if (!selectedBank) {
      Alert.alert('No bank account', 'Admin must configure an active bank account with UPI VPA.');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid amount before showing the QR.');
      return;
    }
    setShowQr(true);
  }, [customer, parsedAmount, selectedBank]);

  const onConfirmDigital = useCallback(
    async (values: FormValues) => {
      if (!customer) return;

      const amount = parseAmountInput(values.amount);
      if (!amount) return;

      const reference = values.upiReference?.trim() ?? '';
      if (reference.length < 4) {
        Alert.alert(
          'UPI reference required',
          'Enter the UPI transaction reference / UTR from the customer’s payment confirmation.',
        );
        return;
      }

      const verificationMethod = digitalSubMode === 'qr' ? 'qr' : 'manual';
      const bankId = digitalSubMode === 'qr' ? selectedBank?.id : undefined;

      // #region agent log
      fetch('http://127.0.0.1:7333/ingest/e1cbfe88-dbfa-476e-aa64-46550e18bd51',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'bad3ec'},body:JSON.stringify({sessionId:'bad3ec',location:'OfficerRecordPaymentForm.tsx:onConfirmDigital',message:'confirm digital collection',data:{method:'upi',verificationMethod,hasReference:reference.length>=4,hasBankAccount:Boolean(bankId),amount},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
      // #endregion

      try {
        const result = await recordPayment({
          customerId: customer.id,
          amount,
          method: 'upi',
          reference,
          notes: values.notes?.trim() || undefined,
          confirmed: false,
          bankAccountId: bankId,
          verificationMethod,
        }).unwrap();

        // #region agent log
        fetch('http://127.0.0.1:7333/ingest/e1cbfe88-dbfa-476e-aa64-46550e18bd51',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'bad3ec'},body:JSON.stringify({sessionId:'bad3ec',location:'OfficerRecordPaymentForm.tsx:onConfirmDigital:success',message:'payment recorded',data:{paymentId:result.paymentId,status:result.status},timestamp:Date.now(),hypothesisId:'H5',runId:'post-fix'})}).catch(()=>{});
        // #endregion

        Alert.alert(
          'Submitted',
          'UPI collection sent for admin verification. You can track status in collection history.',
        );
        onSuccess?.(result.paymentId);
      } catch (e) {
        // #region agent log
        fetch('http://127.0.0.1:7333/ingest/e1cbfe88-dbfa-476e-aa64-46550e18bd51',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'bad3ec'},body:JSON.stringify({sessionId:'bad3ec',location:'OfficerRecordPaymentForm.tsx:onConfirmDigital:error',message:'payment failed',data:{errorMessage:paymentErrorMessage(e)},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
        console.error('[OfficerRecordPayment] digital collection failed', e);
        Alert.alert('Could not record payment', paymentErrorMessage(e));
      }
    },
    [customer, digitalSubMode, onSuccess, recordPayment, selectedBank?.id],
  );

  const onSubmitManualUpi = useCallback(
    async (values: FormValues) => {
      if (!customer) return;
      const amount = parseAmountInput(values.amount);
      if (!amount) return;

      const reference = values.upiReference?.trim() ?? '';
      if (reference.length < 4) {
        Alert.alert('UPI reference required', 'Enter the UPI transaction reference / UTR.');
        return;
      }

      try {
        const result = await recordPayment({
          customerId: customer.id,
          amount,
          method: 'upi',
          reference,
          notes: values.notes?.trim() || undefined,
          confirmed: false,
          verificationMethod: 'manual',
        }).unwrap();
        Alert.alert('Submitted', 'Manual UPI collection sent for admin verification.');
        onSuccess?.(result.paymentId);
      } catch (e) {
        console.error('[OfficerRecordPayment] manual UPI failed', e);
        Alert.alert('Could not record payment', paymentErrorMessage(e));
      }
    },
    [customer, onSuccess, recordPayment],
  );

  return (
    <>
      <DismissKeyboardScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Customer</Text>
        <Button
          label={
            customer
              ? `${customer.name} · ${customer.username ?? customer.phone ?? customer.email}`
              : 'Search customer'
          }
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

        <Text style={styles.sectionTitle}>Collection method</Text>
        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeChip, mode === 'cash' ? styles.modeChipActive : null]}
            onPress={() => {
              setMode('cash');
              setShowQr(false);
            }}
          >
            <Text style={[styles.modeLabel, mode === 'cash' ? styles.modeLabelActive : null]}>
              Cash
            </Text>
            <Text style={styles.modeHint}>Submitted for admin verification</Text>
          </Pressable>
          <Pressable
            style={[styles.modeChip, mode === 'digital' ? styles.modeChipActive : null]}
            onPress={() => setMode('digital')}
          >
            <Text style={[styles.modeLabel, mode === 'digital' ? styles.modeLabelActive : null]}>
              Digital (UPI QR)
            </Text>
            <Text style={styles.modeHint}>QR or manual UPI entry</Text>
          </Pressable>
        </View>

        {mode === 'digital' ? (
          <OfficerDigitalUpiFields
            amount={parsedAmount}
            upiReference={watch('upiReference') ?? ''}
            onUpiReferenceChange={(value) => setValue('upiReference', value)}
            digitalSubMode={digitalSubMode}
            onDigitalSubModeChange={(next) => {
              setDigitalSubMode(next);
              if (next === 'manual') setShowQr(false);
            }}
            showQr={showQr}
            onShowQr={onShowQr}
            bankAccounts={bankAccounts}
            selectedBank={selectedBank}
            onBankAccountSelect={setBankAccountId}
            onConfirmManual={() => void handleSubmit(onSubmitManualUpi)()}
            onConfirmDigital={() => void handleSubmit(onConfirmDigital)()}
            isLoading={isLoading}
          />
        ) : (
          <Button
            label="Record cash payment"
            onPress={() => void handleSubmit(onSubmitCash)()}
            disabled={isLoading}
          />
        )}

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
              placeholder="Field notes…"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
          )}
        />

        {onCancel ? <Button label="Cancel" variant="secondary" onPress={onCancel} /> : null}
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

const styles = StyleSheet.create({
  content: { gap: spacing.sm, paddingBottom: spacing.xl },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryNavy,
    marginTop: spacing.sm,
  },
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
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  modeChip: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  modeChipActive: {
    borderColor: colors.primaryNavy,
    backgroundColor: colors.background,
  },
  modeLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  modeLabelActive: { color: colors.primaryNavy },
  modeHint: { fontSize: 11, color: colors.textSecondary, marginTop: spacing.xs },
});
