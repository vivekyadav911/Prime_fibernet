import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { FormField, RoleGuard, SectionCard } from '@/components/admin';
import { DismissKeyboardScrollView, ErrorState, SkeletonLoader } from '@/components/common';
import {
  useGetFullAdminSettingsQuery,
  useGetInvoiceSettingsQuery,
  useUpdateCompanySettingsMutation,
  useUpdateInvoiceSettingsMutation,
} from '@/store/api/endpoints';
import type { AdminInvoicesStackParamList } from '@/types/navigation';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminInvoicesStackParamList, 'InvoiceSettings'>;

export function InvoiceSettingsScreen(_props: Props) {
  const { data: company, isLoading, isError, error, refetch } = useGetFullAdminSettingsQuery();
  const { data: invoiceSettings } = useGetInvoiceSettingsQuery();
  const [updateCompany] = useUpdateCompanySettingsMutation();
  const [updateInvoiceSetting] = useUpdateInvoiceSettingsMutation();

  const [gstin, setGstin] = useState('');
  const [defaultHsn, setDefaultHsn] = useState('998422');
  const [footerNote, setFooterNote] = useState('This is a computer-generated invoice.');

  useEffect(() => {
    if (company) {
      setGstin(String(company.company.gstNumber ?? ''));
    }
    if (invoiceSettings) {
      setDefaultHsn(String(invoiceSettings.default_hsn_sac ?? '998422'));
      if (invoiceSettings.footer_note) {
        setFooterNote(String(invoiceSettings.footer_note));
      }
    }
  }, [company, invoiceSettings]);

  const onSave = async () => {
    try {
      await updateCompany({ gstNumber: gstin }).unwrap();
      await updateInvoiceSetting({ key: 'default_hsn_sac', value: defaultHsn }).unwrap();
      await updateInvoiceSetting({ key: 'footer_note', value: footerNote }).unwrap();
      Alert.alert('Saved', 'Invoice template settings updated.');
    } catch (e) {
      Alert.alert('Error', queryErrorMessage(e));
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={6} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <RoleGuard requiredPermission="invoices.edit">
      <Screen keyboardDismiss={false}>
          <DismissKeyboardScrollView contentContainerStyle={styles.scroll}>
          <SectionCard title="Company tax details">
            <FormField label="Company GSTIN" value={gstin} onChangeText={setGstin} />
          </SectionCard>
          <SectionCard title="Invoice defaults">
            <FormField label="Default HSN / SAC" value={defaultHsn} onChangeText={setDefaultHsn} />
            <FormField label="Footer note" value={footerNote} onChangeText={setFooterNote} multiline />
          </SectionCard>
          <Button label="Save settings" onPress={() => void onSave()} />
          </DismissKeyboardScrollView>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: spacing.xl },
});
