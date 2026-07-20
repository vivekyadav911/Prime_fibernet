import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '@prime/ui';

import { AmountDisplay, DenominationInput } from '@/components/payments';
import {DismissKeyboardScrollView} from '@/components/common';
import { OfficerScreenWrapper } from '@/components/officer';
import { useOfficerPullToRefresh } from '@/hooks/officer';
import { useLocation } from '@/hooks/useLocation';
import {
  useGetBankAccountsQuery,
  useRecordCashCollectionMutation,
  useRecordManualPaymentMutation,
} from '@/services/api/paymentCollectionApi';
import { SyncManager } from '@/services/offline/syncManager';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { parseAmountInput } from '@/utils/currencyFormat';
import { formatSupabaseRpcError } from '@/utils/supabaseRpcError';
import type { OfficerCollectionsStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import {
  OfficerDigitalUpiFields,
  type DigitalSubMode,
} from './components/OfficerDigitalUpiFields';
import {
  PaymentMethodSelector,
  type PaymentMethodOption,
} from './components/PaymentMethodSelector';

type Props = NativeStackScreenProps<OfficerCollectionsStackParamList, 'CashCollection'>;

const GPS_TIMEOUT_MS = 8000;

export function CashCollectionScreen({ navigation, route }: Props) {
  const { customerId, customerName, accountNumber, amount: defaultAmount, dueDate, planName } =
    route.params;
  const dispatch = useAppDispatch();
  const { coords, error: locationError, startTracking, stopTracking } = useLocation();
  const [recordCollection, { isLoading: cashSaving }] = useRecordCashCollectionMutation();
  const [recordManualPayment, { isLoading: upiSaving }] = useRecordManualPaymentMutation();
  const { data: bankAccounts = [] } = useGetBankAccountsQuery();

  const [method, setMethod] = useState<PaymentMethodOption>('cash');
  const [digitalSubMode, setDigitalSubMode] = useState<DigitalSubMode>('qr');
  const [bankAccountId, setBankAccountId] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [amount, setAmount] = useState(String(defaultAmount));
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [gpsTimedOut, setGpsTimedOut] = useState(false);
  const [denominations, setDenominations] = useState<Record<string, number>>({
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    '20': 0,
    '10': 0,
  });

  useEffect(() => {
    const timer = setTimeout(() => setGpsTimedOut(true), GPS_TIMEOUT_MS);
    void startTracking();
    return () => {
      clearTimeout(timer);
      stopTracking();
    };
  }, [startTracking, stopTracking]);

  useEffect(() => {
    if (method !== 'upi') {
      setShowQr(false);
    }
  }, [method]);

  const parsedAmount = parseAmountInput(amount) ?? 0;
  const isLoading = cashSaving || upiSaving;

  const defaultBank = useMemo(
    () => bankAccounts.find((b) => b.is_default) ?? bankAccounts[0] ?? null,
    [bankAccounts],
  );

  const selectedBank = useMemo(() => {
    if (bankAccountId) {
      return bankAccounts.find((b) => b.id === bankAccountId) ?? defaultBank;
    }
    return defaultBank;
  }, [bankAccountId, bankAccounts, defaultBank]);

  const onShowQr = useCallback(() => {
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid amount before showing the QR.');
      return;
    }
    if (!selectedBank) {
      Alert.alert('No bank account', 'Admin must configure an active bank account with UPI VPA.');
      return;
    }
    setShowQr(true);
  }, [parsedAmount, selectedBank]);

  const onSubmitUpi = useCallback(
    async (verificationMethod: 'manual' | 'qr') => {
      if (!parsedAmount || parsedAmount <= 0) {
        Alert.alert('Invalid amount', 'Enter a valid collection amount.');
        return;
      }
      if (paymentReference.trim().length < 4) {
        Alert.alert(
          'UPI reference required',
          'Enter the UPI transaction reference / UTR from the customer’s payment confirmation.',
        );
        return;
      }

      try {
        await recordManualPayment({
          customerId,
          amount: parsedAmount,
          method: 'upi',
          reference: paymentReference.trim(),
          notes: notes.trim() || undefined,
          confirmed: false,
          bankAccountId: verificationMethod === 'qr' ? selectedBank?.id : undefined,
          verificationMethod,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          photoUri,
        }).unwrap();
        Alert.alert('Submitted', 'UPI collection sent for admin verification.');
        navigation.goBack();
      } catch (err) {
        Alert.alert(
          'Could not record payment',
          formatSupabaseRpcError(
            err,
            err instanceof Error ? err.message : 'Could not record this collection. Try again.',
          ),
        );
      }
    },
    [
      customerId,
      navigation,
      notes,
      parsedAmount,
      paymentReference,
      recordManualPayment,
      selectedBank?.id,
      photoUri,
      coords?.latitude,
      coords?.longitude,
    ],
  );

  const pickPhoto = useCallback(async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const onSubmit = useCallback(async () => {
    const parsed = parseAmountInput(amount);
    if (!parsed || parsed <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid collection amount.');
      return;
    }
    if (method === 'netbanking' && paymentReference.trim().length < 4) {
      Alert.alert('Invalid reference', 'Enter the bank reference / UTR number.');
      return;
    }
    const payload = {
      customerId,
      customerName,
      accountNumber,
      planName,
      amount: parsed,
      method,
      paymentReference: paymentReference.trim() || undefined,
      notes: notes.trim() || undefined,
      denominations,
      dueDate,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      photoUri,
    };
    try {
      await recordCollection(payload).unwrap();
      Alert.alert('Recorded', 'Collection submitted for admin verification.');
      navigation.goBack();
    } catch (err) {
      const message = formatSupabaseRpcError(
        err,
        err instanceof Error ? err.message : 'Could not record this collection. Try again.',
      );
      if (
        message.includes('not assigned') ||
        message.includes('another officer') ||
        message.includes('policy') ||
        message.includes('permission') ||
        message.includes('not authorized')
      ) {
        Alert.alert('Cannot collect', message);
        return;
      }
      await SyncManager.enqueue({
        id: `collection-${customerId}-${Date.now()}`,
        operation: 'recordCashCollection',
        endpoint: 'recordCashCollection',
        payload,
      });
      dispatch(
        enqueueToast({
          id: 'coll-offline',
          type: 'info',
          message: 'Saved offline — will sync when connected',
        }),
      );
      navigation.goBack();
    }
  }, [
    accountNumber,
    amount,
    coords?.latitude,
    coords?.longitude,
    customerId,
    customerName,
    denominations,
    dispatch,
    dueDate,
    method,
    navigation,
    notes,
    paymentReference,
    photoUri,
    planName,
    recordCollection,
  ]);

  const gpsLabel = coords
    ? `📍 ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)} · Captured`
    : locationError
      ? `📍 Location unavailable — collection can still proceed (${locationError})`
      : gpsTimedOut
        ? '📍 GPS timed out — collection can still proceed without location'
        : '📍 Waiting for GPS…';

  const { refreshControl } = useOfficerPullToRefresh();

  return (
    <OfficerScreenWrapper scrollable={false} padded={false}>
      <DismissKeyboardScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
        <Text style={styles.title}>Collect — {customerName}</Text>
        <Text style={styles.sub}>
          {accountNumber}
          {planName ? ` · ${planName}` : ''}
        </Text>
        <Text style={styles.dueLabel}>Amount Due</Text>
        <AmountDisplay amount={defaultAmount} />

        <Text style={styles.label}>PAYMENT METHOD</Text>
        <PaymentMethodSelector
          value={method}
          onChange={(next) => {
            setMethod(next);
            if (next !== 'upi') setShowQr(false);
          }}
        />

        {method === 'cash' ? (
          <>
            <Text style={styles.label}>AMOUNT COLLECTED</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={styles.label}>DENOMINATION BREAKDOWN (OPTIONAL)</Text>
            <DenominationInput
              denominations={denominations}
              expectedAmount={parseAmountInput(amount) ?? 0}
              onChange={setDenominations}
            />
          </>
        ) : method === 'upi' ? (
          <>
            <Text style={styles.label}>AMOUNT COLLECTED</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              placeholderTextColor={colors.textSecondary}
            />
            <OfficerDigitalUpiFields
              amount={parsedAmount}
              upiReference={paymentReference}
              onUpiReferenceChange={setPaymentReference}
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
              onConfirmManual={() => void onSubmitUpi('manual')}
              onConfirmDigital={() => void onSubmitUpi('qr')}
              isLoading={isLoading}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>AMOUNT COLLECTED</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={styles.label}>BANK REFERENCE / UTR NUMBER</Text>
            <TextInput
              style={styles.input}
              keyboardType="default"
              value={paymentReference}
              onChangeText={setPaymentReference}
              maxLength={64}
              placeholder="UTR or bank reference"
              placeholderTextColor={colors.textSecondary}
            />
          </>
        )}

        <Text style={styles.label}>NOTES</Text>
        <TextInput
          style={[styles.input, styles.notes]}
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="Customer paid at door"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.gps}>{gpsLabel}</Text>

        <Button
          label={photoUri ? 'Photo captured ✓' : 'Take evidence photo (optional)'}
          variant="secondary"
          onPress={pickPhoto}
        />
        {method !== 'upi' ? (
          <Button label="Confirm Collection" onPress={() => void onSubmit()} disabled={isLoading} />
        ) : null}
        <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
      </DismissKeyboardScrollView>
    </OfficerScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.sm },
  title: { fontSize: 20, fontWeight: '700', color: colors.primaryNavy },
  sub: { color: colors.textSecondary, marginBottom: spacing.sm },
  dueLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    color: colors.textPrimary,
    minHeight: 48,
  },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  gps: { fontSize: 13, color: colors.textSecondary },
});
