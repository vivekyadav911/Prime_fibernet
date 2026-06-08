import { useCallback, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import type { DrawerScreenProps } from '@react-navigation/drawer';
import * as Sharing from 'expo-sharing';
import { Button, Screen } from '@prime/ui';

import { useLocation } from '@/hooks/useLocation';
import { useAppSelector } from '@/store/hooks';
import { useRecordPaymentMutation } from '@/store/api/endpoints';
import type { OfficerDrawerParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type Props = DrawerScreenProps<OfficerDrawerParamList, 'CollectPayment'>;

type PaymentMethod = 'cash' | 'upi' | 'credit_card';

const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'cash', label: 'Cash' },
  { id: 'upi', label: 'UPI' },
  { id: 'credit_card', label: 'Card' },
];

export function CollectPaymentScreen({ navigation, route }: Props) {
  const user = useAppSelector((s) => s.auth.user);
  const { coords } = useLocation();
  const [recordPayment, { isLoading }] = useRecordPaymentMutation();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [customerName, setCustomerName] = useState(route.params?.customerName ?? '');
  const [customerId, setCustomerId] = useState(route.params?.userId ?? '');
  const [receipt, setReceipt] = useState<{ paymentId: string; amount: number; method: string } | null>(null);

  const onSubmit = useCallback(async () => {
    if (!user) return;
    const parsedAmount = Number(amount);
    if (!customerId.trim() || !customerName.trim()) {
      Alert.alert('Missing customer', 'Enter customer name and user ID.');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid payment amount.');
      return;
    }
    if (method !== 'cash' && !referenceNumber.trim()) {
      Alert.alert('Reference required', 'Enter UPI or card reference number.');
      return;
    }

    try {
      const result = await recordPayment({
        officerUserId: user.id,
        userId: customerId.trim(),
        customerName: customerName.trim(),
        amount: parsedAmount,
        paymentMethod: method,
        referenceNumber: referenceNumber.trim() || undefined,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      }).unwrap();
      setReceipt({ paymentId: result.paymentId, amount: parsedAmount, method });
    } catch (e) {
      Alert.alert('Payment failed', e instanceof Error ? e.message : 'Could not record payment');
    }
  }, [amount, coords?.latitude, coords?.longitude, customerId, customerName, method, recordPayment, referenceNumber, user]);

  const onShareReceipt = useCallback(async () => {
    if (!receipt) return;
    const message = `Prime Fibernet receipt\nAmount: ₹${receipt.amount}\nMethod: ${receipt.method}\nPayment ID: ${receipt.paymentId}`;
    if (await Sharing.isAvailableAsync()) {
      await Share.share({ message });
    } else {
      await Share.share({ message });
    }
  }, [receipt]);

  if (receipt) {
    return (
      <Screen style={styles.screen}>
        <View style={styles.receiptCard}>
          <Text style={styles.receiptTitle}>Payment recorded</Text>
          <Text style={styles.receiptLine}>Amount: ₹{receipt.amount.toFixed(2)}</Text>
          <Text style={styles.receiptLine}>Method: {receipt.method}</Text>
          <Text style={styles.receiptLine}>ID: {receipt.paymentId}</Text>
          <Button label="Share receipt" onPress={() => void onShareReceipt()} style={styles.button} />
          <Button
            label="View invoice"
            variant="secondary"
            onPress={() => navigation.navigate('Invoice', { invoiceId: receipt.paymentId })}
          />
          <Button label="Collect another" variant="ghost" onPress={() => setReceipt(null)} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Collect payment</Text>
      <Text style={styles.subtitle}>Record on-site cash, UPI, or card collection</Text>

      <TextInput
        style={styles.input}
        placeholder="Customer name"
        value={customerName}
        onChangeText={setCustomerName}
      />
      <TextInput
        style={styles.input}
        placeholder="Customer user ID"
        autoCapitalize="none"
        value={customerId}
        onChangeText={setCustomerId}
      />
      <TextInput
        style={styles.input}
        placeholder="Amount (₹)"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />

      <Text style={styles.label}>Payment method</Text>
      <View style={styles.methodRow}>
        {METHODS.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.methodChip, method === item.id && styles.methodChipActive]}
            onPress={() => setMethod(item.id)}
          >
            <Text style={[styles.methodText, method === item.id && styles.methodTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {method !== 'cash' ? (
        <TextInput
          style={styles.input}
          placeholder="Reference / transaction number"
          value={referenceNumber}
          onChangeText={setReferenceNumber}
        />
      ) : null}

      <Button label={isLoading ? 'Recording…' : 'Record payment'} onPress={() => void onSubmit()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.sm },
  title: { fontSize: 22, fontWeight: '700', color: colors.primaryNavy },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.sm },
  label: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    color: colors.textPrimary,
  },
  methodRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  methodChip: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  methodChipActive: { borderColor: colors.accentTeal, backgroundColor: `${colors.accentTeal}18` },
  methodText: { color: colors.textSecondary, fontWeight: '600' },
  methodTextActive: { color: colors.accentTeal },
  button: { marginTop: spacing.sm },
  receiptCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  receiptTitle: { fontSize: 20, fontWeight: '700', color: colors.successGreen },
  receiptLine: { color: colors.textPrimary, fontSize: 15 },
});
