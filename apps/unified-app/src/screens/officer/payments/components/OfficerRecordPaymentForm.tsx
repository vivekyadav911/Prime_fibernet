import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { SelectCustomerModal } from '@/components/TicketPortal/SelectCustomerModal';
import { Button } from '@prime/ui';
import { DismissKeyboardScrollView } from '@/components/common';
import { useOfficerAssignedTickets } from '@/hooks/officer';
import {
  useGetBankAccountsQuery,
  useRecordManualPaymentMutation,
} from '@/services/api/paymentCollectionApi';
import { useAppSelector } from '@/store/hooks';
import type { AdminUserListItem } from '@/types/api/admin';
import type { BankAccountRecord } from '@/types/payments';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { parseAmountInput } from '@/utils/currencyFormat';

import { UpiQrDisplay } from './UpiQrDisplay';

type CollectionMode = 'cash' | 'digital';

const formSchema = z.object({
  amount: z.string().min(1, 'Amount is required'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  onSuccess?: (paymentId: string) => void;
  onCancel?: () => void;
};

export function OfficerRecordPaymentForm({ onSuccess, onCancel }: Props) {
  const user = useAppSelector((s) => s.auth.user);
  const [customer, setCustomer] = useState<AdminUserListItem | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [mode, setMode] = useState<CollectionMode>('cash');
  const [bankAccountId, setBankAccountId] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  const { data: bankAccounts = [] } = useGetBankAccountsQuery();
  const { items: tickets } = useOfficerAssignedTickets(user?.id);
  const [recordPayment, { isLoading }] = useRecordManualPaymentMutation();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: '', notes: '' },
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

  const customerTickets = useMemo(() => {
    if (!customer) return tickets;
    return tickets.filter(
      (t) => t.kind === 'ticket' && t.ticket?.customerId === customer.id,
    );
  }, [customer, tickets]);

  const onSubmitCash = useCallback(
    async (values: FormValues) => {
      if (!customer) {
        Alert.alert('Select customer', 'Choose the customer this payment is for.');
        return;
      }
      if (!ticketId) {
        Alert.alert('Select ticket', 'Link this payment to an assigned ticket.');
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
          confirmed: true,
          ticketId,
          verificationMethod: 'manual',
        }).unwrap();
        Alert.alert('Cash recorded', 'Payment confirmed.');
        onSuccess?.(result.paymentId);
      } catch (e) {
        Alert.alert('Could not record payment', e instanceof Error ? e.message : 'Try again.');
      }
    },
    [customer, onSuccess, recordPayment, ticketId],
  );

  const onShowQr = useCallback(() => {
    if (!customer) {
      Alert.alert('Select customer', 'Choose the customer first.');
      return;
    }
    if (!ticketId) {
      Alert.alert('Select ticket', 'Link this payment to an assigned ticket.');
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
  }, [customer, parsedAmount, selectedBank, ticketId]);

  const onConfirmDigital = useCallback(
    async (values: FormValues) => {
      if (!customer || !ticketId || !selectedBank) return;
      const amount = parseAmountInput(values.amount);
      if (!amount) return;

      try {
        const result = await recordPayment({
          customerId: customer.id,
          amount,
          method: 'upi',
          notes: values.notes?.trim() || undefined,
          confirmed: true,
          ticketId,
          bankAccountId: selectedBank.id,
          verificationMethod: 'manual',
        }).unwrap();
        Alert.alert('Payment recorded', 'Manual UPI collection logged for reconciliation.');
        onSuccess?.(result.paymentId);
      } catch (e) {
        Alert.alert('Could not record payment', e instanceof Error ? e.message : 'Try again.');
      }
    },
    [customer, onSuccess, recordPayment, selectedBank, ticketId],
  );

  return (
    <>
      <DismissKeyboardScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Customer & ticket</Text>
        <Button
          label={
            customer
              ? `${customer.name} · ${customer.username ?? customer.phone ?? customer.email}`
              : 'Search customer'
          }
          variant="secondary"
          onPress={() => setPickerVisible(true)}
        />

        {customerTickets.length > 0 ? (
          <>
            <Text style={styles.label}>TICKET (REQUIRED)</Text>
            <View style={styles.ticketRow}>
              {customerTickets.map((item) => {
                if (item.kind !== 'ticket' || !item.ticket) return null;
                const active = ticketId === item.ticket.id;
                return (
                  <Pressable
                    key={item.ticket.id}
                    style={[styles.ticketChip, active ? styles.ticketChipActive : null]}
                    onPress={() => setTicketId(item.ticket!.id)}
                  >
                    <Text style={[styles.ticketLabel, active ? styles.ticketLabelActive : null]}>
                      {item.ticket.ticketNumber}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : customer ? (
          <Text style={styles.error}>No assigned tickets for this customer.</Text>
        ) : null}

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
            <Text style={styles.modeHint}>Officer confirms immediately</Text>
          </Pressable>
          <Pressable
            style={[styles.modeChip, mode === 'digital' ? styles.modeChipActive : null]}
            onPress={() => setMode('digital')}
          >
            <Text style={[styles.modeLabel, mode === 'digital' ? styles.modeLabelActive : null]}>
              Digital (UPI QR)
            </Text>
            <Text style={styles.modeHint}>Show QR, confirm after payment</Text>
          </Pressable>
        </View>

        {mode === 'digital' ? (
          <>
            <Text style={styles.label}>BANK ACCOUNT</Text>
            <View style={styles.ticketRow}>
              {bankAccounts.map((account) => {
                const active = (selectedBank?.id ?? '') === account.id;
                return (
                  <Pressable
                    key={account.id}
                    style={[styles.ticketChip, active ? styles.ticketChipActive : null]}
                    onPress={() => setBankAccountId(account.id)}
                  >
                    <Text style={[styles.ticketLabel, active ? styles.ticketLabelActive : null]}>
                      {account.nickname}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {!showQr ? (
              <Button label="Show payment QR" onPress={onShowQr} />
            ) : selectedBank ? (
              <UpiQrDisplay
                vpa={selectedBank.upi_vpa}
                amount={parsedAmount}
                payeeName={selectedBank.nickname}
              />
            ) : null}
            {showQr ? (
              <Button
                label="Customer paid — confirm collection"
                onPress={() => void handleSubmit(onConfirmDigital)()}
                disabled={isLoading}
              />
            ) : null}
          </>
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
        onSelect={(c) => {
          setCustomer(c);
          setTicketId(null);
        }}
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
  ticketRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  ticketChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  ticketChipActive: {
    borderColor: colors.primaryNavy,
    backgroundColor: colors.background,
  },
  ticketLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  ticketLabelActive: { color: colors.primaryNavy },
});
