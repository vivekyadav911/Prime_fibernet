import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import type { DrawerScreenProps } from '@react-navigation/drawer';
import * as ImagePicker from 'expo-image-picker';
import { Button, Screen } from '@prime/ui';

import { AmountDisplay, DenominationInput } from '@/components/payments';
import { useLocation } from '@/hooks/useLocation';
import { useRecordCashCollectionMutation } from '@/services/api/paymentCollectionApi';
import { parseAmountInput } from '@/utils/currencyFormat';
import type { OfficerDrawerParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type Props = DrawerScreenProps<OfficerDrawerParamList, 'CashCollection'>;

export function CashCollectionScreen({ navigation, route }: Props) {
  const { customerId, customerName, accountNumber, amount: defaultAmount, dueDate, planName } = route.params;
  const { coords } = useLocation();
  const [recordCollection, { isLoading }] = useRecordCashCollectionMutation();

  const [amount, setAmount] = useState(String(defaultAmount));
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [denominations, setDenominations] = useState<Record<string, number>>({
    '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0,
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
    try {
      await recordCollection({
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
      }).unwrap();
      Alert.alert('Recorded', 'Cash collection recorded. Pending admin confirmation.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not record collection');
    }
  }, [accountNumber, amount, coords?.latitude, coords?.longitude, customerId, customerName, denominations, dueDate, navigation, notes, photoUri, planName, recordCollection]);

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Collect — {customerName}</Text>
      <Text style={styles.sub}>{accountNumber}{planName ? ` · ${planName}` : ''}</Text>
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
      <Text style={styles.label}>COLLECTION NOTES</Text>
      <TextInput
        style={[styles.input, styles.notes]}
        multiline
        value={notes}
        onChangeText={setNotes}
        placeholderTextColor={colors.textSecondary}
      />
      {coords ? (
        <Text style={styles.gps}>📍 {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)} · Captured</Text>
      ) : (
        <Text style={styles.gps}>📍 Waiting for GPS…</Text>
      )}
      <Button label={photoUri ? 'Photo captured ✓' : 'Take photo (optional)'} variant="secondary" onPress={pickPhoto} />
      <Button label="Confirm cash collected" onPress={onSubmit} loading={isLoading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.md, backgroundColor: colors.background },
  title: { fontSize: 18, fontWeight: '700', color: colors.primaryNavy },
  sub: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    color: colors.textPrimary,
  },
  notes: { minHeight: 72, textAlignVertical: 'top' },
  gps: { fontSize: 12, color: colors.textSecondary, marginVertical: spacing.sm },
});
