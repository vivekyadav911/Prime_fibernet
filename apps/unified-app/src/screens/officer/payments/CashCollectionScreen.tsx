import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '@prime/ui';

import { AmountDisplay, DenominationInput } from '@/components/payments';
import { ScreenWrapper } from '@/components/common';
import { useLocation } from '@/hooks/useLocation';
import { useRecordCashCollectionMutation } from '@/services/api/paymentCollectionApi';
import { SyncManager } from '@/services/offline/syncManager';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { parseAmountInput } from '@/utils/currencyFormat';
import type { OfficerCollectionsStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import {
  PaymentMethodSelector,
  type PaymentMethodOption,
} from './components/PaymentMethodSelector';

type Props = NativeStackScreenProps<OfficerCollectionsStackParamList, 'CashCollection'>;

export function CashCollectionScreen({ navigation, route }: Props) {
  const { customerId, customerName, accountNumber, amount: defaultAmount, dueDate, planName } =
    route.params;
  const dispatch = useAppDispatch();
  const { coords } = useLocation();
  const [recordCollection, { isLoading }] = useRecordCashCollectionMutation();

  const [method, setMethod] = useState<PaymentMethodOption>('cash');
  const [amount, setAmount] = useState(String(defaultAmount));
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [denominations, setDenominations] = useState<Record<string, number>>({
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    '20': 0,
    '10': 0,
  });

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
    const payload = {
      customerId,
      customerName,
      accountNumber,
      planName,
      amount: parsed,
      notes: notes.trim() || undefined,
      denominations,
      dueDate,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      photoUri,
    };
    try {
      await recordCollection(payload).unwrap();
      Alert.alert('Recorded', 'Cash collection recorded. Pending admin confirmation.');
      navigation.goBack();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not record this collection. Try again.';
      if (
        message.includes('not assigned') ||
        message.includes('another officer') ||
        message.includes('policy') ||
        message.includes('permission')
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
    navigation,
    notes,
    photoUri,
    planName,
    recordCollection,
  ]);

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Collect — {customerName}</Text>
        <Text style={styles.sub}>
          {accountNumber}
          {planName ? ` · ${planName}` : ''}
        </Text>
        <Text style={styles.dueLabel}>Amount Due</Text>
        <AmountDisplay amount={defaultAmount} />

        <Text style={styles.label}>PAYMENT METHOD</Text>
        <PaymentMethodSelector value={method} onChange={setMethod} />

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
            <Text style={styles.label}>DENOMINATION BREAKDOWN</Text>
            <DenominationInput
              denominations={denominations}
              expectedAmount={parseAmountInput(amount)}
              onChange={setDenominations}
            />
          </>
        ) : null}

        <Text style={styles.label}>NOTES</Text>
        <TextInput
          style={[styles.input, styles.notes]}
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="Customer paid at door"
          placeholderTextColor={colors.textSecondary}
        />

        {coords ? (
          <Text style={styles.gps}>
            📍 {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)} · Captured
          </Text>
        ) : (
          <Text style={styles.gps}>📍 Waiting for GPS…</Text>
        )}

        <Button
          label={photoUri ? 'Photo captured ✓' : 'Take evidence photo (optional)'}
          variant="secondary"
          onPress={pickPhoto}
        />
        <Button label="Confirm Collection" onPress={() => void onSubmit()} disabled={isLoading} />
        <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
      </ScrollView>
    </ScreenWrapper>
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
