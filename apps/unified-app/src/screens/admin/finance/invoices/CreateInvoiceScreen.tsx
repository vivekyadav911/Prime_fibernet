import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { FormField, RoleGuard, SectionCard, SelectField } from '@/components/admin';
import { DismissKeyboardScrollView, KeyboardDismissView, ToggleSwitch } from '@/components/common';
import {
  InvoiceDeliverySection,
  InvoiceLineItemsEditor,
  SelectCustomerModal,
} from '@/components/invoices';
import { useInvoicePDF } from '@/hooks/useInvoicePDF';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import {
  useCreateInvoiceMutation,
  useGetInvoiceSettingsQuery,
  useSendInvoiceMutation,
} from '@/store/api/endpoints';
import type { AdminInvoicesStackParamList } from '@/types/navigation';
import type { InvoiceDeliveryChannel, InvoiceLineItem, InvoiceType } from '@/types/invoice';
import { INDIAN_STATES } from '@/types/invoice';
import type { AdminUserListItem } from '@/types/api/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminInvoicesStackParamList, 'CreateInvoice'>;

const DEFAULT_LINE: InvoiceLineItem = {
  description: 'Internet service',
  hsnSac: '998422',
  quantity: 1,
  unit: 'Nos',
  unitPrice: 0,
  gstRate: 18,
};

export function CreateInvoiceScreen({ navigation, route }: Props) {
  const dispatch = useAppDispatch();
  const invoiceType: InvoiceType = route.params?.invoiceType ?? 'gst';
  const { data: settings } = useGetInvoiceSettingsQuery();
  const [createInvoice, { isLoading: creating }] = useCreateInvoiceMutation();
  const [sendInvoice, { isLoading: sending }] = useSendInvoiceMutation();
  const { generateAndUploadPDF } = useInvoicePDF();

  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<AdminUserListItem | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [customerState, setCustomerState] = useState('Uttar Pradesh (09)');
  const [customerGstin, setCustomerGstin] = useState('');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([DEFAULT_LINE]);
  const [notes, setNotes] = useState('');
  const [deliveryChannel, setDeliveryChannel] = useState<InvoiceDeliveryChannel>('email');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientCustomer, setRecipientCustomer] = useState<AdminUserListItem | null>(null);
  const [emailError, setEmailError] = useState<string | undefined>();

  const defaultHsn = String(settings?.default_hsn_sac ?? '998422');

  useLayoutEffect(() => {
    const title =
      invoiceType === 'non_gst'
        ? 'Create non-GST invoice'
        : invoiceType === 'custom_gst'
          ? 'Create custom GST invoice'
          : 'Create GST invoice';
    navigation.setOptions({ title });
  }, [invoiceType, navigation]);

  useEffect(() => {
    if (selectedCustomer && !manualEntry) {
      setCustomerName(selectedCustomer.name);
      setCustomerEmail(selectedCustomer.email);
      setCustomerPhone(selectedCustomer.phone ?? '');
      setRecipientEmail(selectedCustomer.email);
      setRecipientCustomer(selectedCustomer);
    }
  }, [manualEntry, selectedCustomer]);

  const validate = useCallback(() => {
    if (!customerName.trim()) {
      Alert.alert('Missing data', 'Customer name is required.');
      return false;
    }
    if (!lineItems.some((l) => l.description.trim() && l.unitPrice > 0)) {
      Alert.alert('Missing data', 'Add at least one line item with a price.');
      return false;
    }
    if (deliveryChannel === 'email' && !recipientEmail.trim()) {
      setEmailError('Recipient email is required');
      return false;
    }
    setEmailError(undefined);
    return true;
  }, [customerName, deliveryChannel, lineItems, recipientEmail]);

  const buildPayload = useCallback(
    (saveAsDraft: boolean) => ({
      invoiceType,
      userId: selectedCustomer?.id ?? null,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim() || null,
      customerPhone: customerPhone.trim() || null,
      billingAddress: billingAddress.trim() || null,
      customerState: customerState || null,
      customerGstin: customerGstin.trim() || null,
      recipientEmail: recipientEmail.trim() || null,
      recipientPhone: recipientPhone.trim() || null,
      lineItems: lineItems.filter((l) => l.description.trim()),
      notes: notes.trim() || null,
      deliveryChannel,
      saveAsDraft,
    }),
    [
      billingAddress,
      customerEmail,
      customerGstin,
      customerName,
      customerPhone,
      customerState,
      deliveryChannel,
      invoiceType,
      lineItems,
      notes,
      recipientEmail,
      recipientPhone,
      selectedCustomer?.id,
    ],
  );

  const onSaveDraft = async () => {
    if (!validate()) return;
    try {
      await createInvoice(buildPayload(true)).unwrap();
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'Draft saved' }));
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', queryErrorMessage(e));
    }
  };

  const onSend = async () => {
    if (!validate()) return;
    try {
      const { invoice } = await createInvoice(buildPayload(false)).unwrap();
      await generateAndUploadPDF(invoice);
      if (deliveryChannel === 'email' || deliveryChannel === 'whatsapp') {
        await sendInvoice({
          invoiceId: invoice.id,
          channel: deliveryChannel,
          recipientEmail: recipientEmail.trim() || undefined,
          recipientPhone: recipientPhone.trim() || undefined,
        }).unwrap();
      }
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'Invoice sent' }));
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', queryErrorMessage(e));
    }
  };

  const onDownloadOnly = async () => {
    if (!validate()) return;
    try {
      const { invoice } = await createInvoice({ ...buildPayload(true), deliveryChannel: 'manual' }).unwrap();
      const path = await generateAndUploadPDF(invoice);
      navigation.navigate('InvoicePdfViewer', {
        storagePath: path,
        title: `Invoice ${invoice.invoiceNumber}`,
        fileName: `${invoice.invoiceNumber}.pdf`,
      });
    } catch (e) {
      Alert.alert('Error', queryErrorMessage(e));
    }
  };

  return (
    <RoleGuard requiredPermission="invoices.create">
      <Screen>
        <KeyboardDismissView>
          <DismissKeyboardScrollView contentContainerStyle={styles.scroll}>
          <SectionCard title="Customer details">
            <Button
              label={selectedCustomer ? `Selected: ${selectedCustomer.name}` : 'Select customer'}
              variant="secondary"
              onPress={() => setCustomerModalVisible(true)}
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Enter details manually</Text>
              <ToggleSwitch value={manualEntry} onValueChange={setManualEntry} />
            </View>
            {(manualEntry || selectedCustomer) && (
              <>
                <FormField label="Customer name" value={customerName} onChangeText={setCustomerName} />
                <FormField
                  label="Email"
                  value={customerEmail}
                  onChangeText={setCustomerEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <FormField label="Phone" value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" />
                <FormField label="Billing address" value={billingAddress} onChangeText={setBillingAddress} multiline />
                <SelectField
                  label="State / UT"
                  value={customerState}
                  options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
                  onSelect={setCustomerState}
                />
                {invoiceType !== 'non_gst' ? (
                  <FormField label="GSTIN" value={customerGstin} onChangeText={setCustomerGstin} />
                ) : null}
              </>
            )}
          </SectionCard>

          <InvoiceLineItemsEditor
            invoiceType={invoiceType}
            lineItems={lineItems}
            onChange={setLineItems}
            defaultHsn={defaultHsn}
          />

          <InvoiceDeliverySection
            channel={deliveryChannel}
            onChannelChange={setDeliveryChannel}
            recipientEmail={recipientEmail}
            recipientPhone={recipientPhone}
            onRecipientEmailChange={setRecipientEmail}
            onRecipientPhoneChange={setRecipientPhone}
            emailError={emailError}
            selectedRecipientCustomer={recipientCustomer}
            onRecipientCustomerChange={setRecipientCustomer}
          />

          <FormField label="Notes" value={notes} onChangeText={setNotes} multiline />

          <View style={styles.actions}>
            <Button label="Save draft" variant="secondary" onPress={() => void onSaveDraft()} disabled={creating} />
            <Button label="Download PDF" variant="secondary" onPress={() => void onDownloadOnly()} disabled={creating} />
            <Button label="Send invoice" onPress={() => void onSend()} disabled={creating || sending} />
          </View>
          </DismissKeyboardScrollView>
        </KeyboardDismissView>

        <SelectCustomerModal
          visible={customerModalVisible}
          selectedCustomerId={selectedCustomer?.id ?? null}
          onClose={() => setCustomerModalVisible(false)}
          onSelect={(c) => {
            setSelectedCustomer(c);
            setManualEntry(false);
          }}
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: spacing.xl },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.sm,
  },
  switchLabel: { fontSize: 13, color: colors.textSecondary },
  actions: { gap: spacing.sm },
});
