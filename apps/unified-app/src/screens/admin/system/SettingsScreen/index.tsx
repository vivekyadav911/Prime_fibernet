import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Button, Screen } from '@prime/ui';
import type { PaymentGateway } from '@prime/types';

import { ToggleSwitch } from '@/components/common';

import { FormField, RoleGuard, SectionCard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { signOut } from '@/hooks/useAuth';
import { useAppDispatch } from '@/store/hooks';
import {
  useGetFullAdminSettingsQuery,
  useTestEmailSettingsMutation,
  useUpdateCompanySettingsMutation,
  useUpdateEmailSettingsMutation,
  useUpdateFeatureFlagsMutation,
  useUpdatePaymentGatewaySettingsMutation,
} from '@/store/api/endpoints';
import { queryErrorMessage } from '@/utils/queryError';
import { spacing } from '@/theme/spacing';

export function AdminSettingsScreenFull() {
  const dispatch = useAppDispatch();
  const { data, isLoading, isError, error, refetch } = useGetFullAdminSettingsQuery();
  const [updateCompany] = useUpdateCompanySettingsMutation();
  const [updateEmail] = useUpdateEmailSettingsMutation();
  const [testEmail] = useTestEmailSettingsMutation();
  const [updateGateways] = useUpdatePaymentGatewaySettingsMutation();
  const [updateFlags] = useUpdateFeatureFlagsMutation();

  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [gateway, setGateway] = useState<PaymentGateway>('easybuzz');
  const [aiChatbot, setAiChatbot] = useState(true);
  const [whatsapp, setWhatsapp] = useState(false);
  const [autoInvoice, setAutoInvoice] = useState(true);

  useEffect(() => {
    if (data) {
      setCompanyName(String(data.company.name ?? ''));
      setCompanyEmail(String(data.company.email ?? ''));
      setAddress(String(data.company.address ?? ''));
      setGstNumber(String(data.company.gstNumber ?? ''));
      setSmtpHost(String(data.email.smtpHost ?? ''));
      setSmtpPort(String(data.email.smtpPort ?? '587'));
      setGateway((data.paymentGateways.activeGateway as PaymentGateway) ?? 'easybuzz');
      setAiChatbot(Boolean(data.featureFlags.aiChatbot));
      setWhatsapp(Boolean(data.featureFlags.whatsapp));
      setAutoInvoice(Boolean(data.featureFlags.autoInvoice));
    }
  }, [data]);

  if (isLoading) return <Screen><SkeletonLoader rows={6} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="settings.view">
      <Screen>
        <ScrollView>
          <SectionCard title="Company Info">
            <FormField label="Name" value={companyName} onChangeText={setCompanyName} />
            <FormField label="Email" value={companyEmail} onChangeText={setCompanyEmail} />
            <FormField label="Address" value={address} onChangeText={setAddress} multiline />
            <FormField label="GST Number" value={gstNumber} onChangeText={setGstNumber} />
            <Button label="Save" onPress={() => updateCompany({ name: companyName, email: companyEmail, address, gstNumber })} />
          </SectionCard>

          <SectionCard title="Email Config">
            <FormField label="SMTP Host" value={smtpHost} onChangeText={setSmtpHost} />
            <FormField label="SMTP Port" value={smtpPort} onChangeText={setSmtpPort} keyboardType="numeric" />
            <Button label="Save email" onPress={() => updateEmail({ smtpHost, smtpPort: Number(smtpPort) })} />
            <Button label="Test email" variant="secondary" onPress={() => testEmail({ to: companyEmail })} />
          </SectionCard>

          <SectionCard title="Payment Gateways">
            <Button label="EasyBuzz" variant={gateway === 'easybuzz' ? 'primary' : 'ghost'} onPress={() => setGateway('easybuzz')} />
            <Button label="Razorpay" variant={gateway === 'razorpay' ? 'primary' : 'ghost'} onPress={() => setGateway('razorpay')} />
            <Button label="Save gateway" onPress={() => updateGateways({ activeGateway: gateway })} />
          </SectionCard>

          <SectionCard title="Feature Flags">
            <Text>AI Chatbot <ToggleSwitch value={aiChatbot} onValueChange={setAiChatbot} /></Text>
            <Text>WhatsApp <ToggleSwitch value={whatsapp} onValueChange={setWhatsapp} /></Text>
            <Text>Auto-Invoice <ToggleSwitch value={autoInvoice} onValueChange={setAutoInvoice} /></Text>
            <Button label="Save flags" onPress={() => updateFlags({ aiChatbot, whatsapp, autoInvoice })} />
          </SectionCard>

          <Button label="Sign out" variant="secondary" onPress={() => signOut(dispatch)} style={styles.signOut} />
        </ScrollView>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({ signOut: { marginTop: spacing.lg } });
