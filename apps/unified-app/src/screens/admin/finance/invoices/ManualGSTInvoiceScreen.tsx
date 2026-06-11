import { useMemo, useState } from 'react';
import { Alert, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { FormField, RoleGuard, SectionCard } from '@/components/admin';
import { useCreateManualGstInvoiceMutation, useGetAdminUsersQuery } from '@/store/api/endpoints';
import type { AdminInvoicesStackParamList } from '@/types/navigation';
import type { ManualGstLineItem } from '@/services/api/adminFinanceApi';

type Props = NativeStackScreenProps<AdminInvoicesStackParamList, 'ManualGstInvoice'>;

export function ManualGSTInvoiceScreen({ navigation }: Props) {
  const { data: usersData } = useGetAdminUsersQuery({ limit: 1 });
  const users = usersData?.items;
  const [create] = useCreateManualGstInvoiceMutation();
  const [customerId, setCustomerId] = useState('');
  const [desc, setDesc] = useState('');
  const [qty, setQty] = useState('1');
  const [rate, setRate] = useState('0');
  const [gst, setGst] = useState('18');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<ManualGstLineItem[]>([]);

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.rate, 0);
    const gstTotal = lineItems.reduce((s, i) => s + i.quantity * i.rate * (i.gstPercent / 100), 0);
    return { subtotal, gstTotal, total: subtotal + gstTotal };
  }, [lineItems]);

  const addLine = () => {
    if (!desc) return;
    setLineItems((prev) => [
      ...prev,
      { description: desc, quantity: Number(qty), rate: Number(rate), gstPercent: Number(gst) },
    ]);
    setDesc('');
  };

  const onGenerate = async () => {
    if (!customerId || !lineItems.length) {
      Alert.alert('Missing data', 'Select customer and add line items.');
      return;
    }
    try {
      await create({ customerId, lineItems, notes }).unwrap();
      Alert.alert('Created', 'Manual GST invoice generated.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not generate');
    }
  };

  return (
    <RoleGuard requiredPermission="invoices.create">
      <Screen>
        <FormField
          label="Customer ID"
          value={customerId}
          onChangeText={setCustomerId}
          placeholder={users?.[0]?.id ?? 'user-uuid'}
        />
        <SectionCard title="Line items">
          <FormField label="Description" value={desc} onChangeText={setDesc} />
          <FormField label="Qty" value={qty} onChangeText={setQty} keyboardType="numeric" />
          <FormField label="Rate (₹)" value={rate} onChangeText={setRate} keyboardType="numeric" />
          <FormField label="GST %" value={gst} onChangeText={setGst} keyboardType="numeric" />
          <Button label="Add line" variant="secondary" onPress={addLine} />
          {lineItems.map((l, i) => (
            <Text key={i}>{l.description} ×{l.quantity} @ ₹{l.rate} ({l.gstPercent}% GST)</Text>
          ))}
        </SectionCard>
        <Text>Subtotal: ₹{totals.subtotal.toFixed(2)}</Text>
        <Text>GST: ₹{totals.gstTotal.toFixed(2)}</Text>
        <Text>Total: ₹{totals.total.toFixed(2)}</Text>
        <FormField label="Notes" value={notes} onChangeText={setNotes} multiline />
        <Button label="Generate PDF + Send" onPress={() => void onGenerate()} />
      </Screen>
    </RoleGuard>
  );
}
