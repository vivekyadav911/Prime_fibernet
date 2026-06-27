import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import type { PaymentGateway } from '@prime/types';

import { ToggleSwitch } from '@/components/common';

import { AdminButton, AdminScreenLayout, AdminStateShell, FormField, RoleGuard, SectionCard } from '@/components/admin';
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

  return (
    <RoleGuard requiredPermission="settings.view">
      <AdminStateShell
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        loadingRows={6}
      >
      <AdminScreenLayout>
        <ScrollView>
          <SectionCard title="Company Info">
            <FormField label="Name" value={companyName} onChangeText={setCompanyName} />
            <FormField label="Email" value={companyEmail} onChangeText={setCompanyEmail} />
            <FormField label="Address" value={address} onChangeText={setAddress} multiline />
            <FormField label="GST Number" value={gstNumber} onChangeText={setGstNumber} />
            <AdminButton label="Save" onPress={() => updateCompany({ name: companyName, email: companyEmail, address, gstNumber })} />
          </SectionCard>

          <SectionCard title="Email Config">
            <FormField label="SMTP Host" value={smtpHost} onChangeText={setSmtpHost} />
            <FormField label="SMTP Port" value={smtpPort} onChangeText={setSmtpPort} keyboardType="numeric" />
            <AdminButton label="Save email" onPress={() => updateEmail({ smtpHost, smtpPort: Number(smtpPort) })} />
            <AdminButton label="Test email" variant="secondary" onPress={() => testEmail({ to: companyEmail })} />
          </SectionCard>

          <SectionCard title="Payment Gateways">
            <AdminButton label="EasyBuzz" variant={gateway === 'easybuzz' ? 'primary' : 'ghost'} onPress={() => setGateway('easybuzz')} />
            <AdminButton label="Razorpay" variant={gateway === 'razorpay' ? 'primary' : 'ghost'} onPress={() => setGateway('razorpay')} />
            <AdminButton label="Save gateway" onPress={() => updateGateways({ activeGateway: gateway })} />
          </SectionCard>

          <SectionCard title="Feature Flags">
            <Text>AI Chatbot <ToggleSwitch value={aiChatbot} onValueChange={setAiChatbot} /></Text>
            <Text>WhatsApp <ToggleSwitch value={whatsapp} onValueChange={setWhatsapp} /></Text>
            <Text>Auto-Invoice <ToggleSwitch value={autoInvoice} onValueChange={setAutoInvoice} /></Text>
            <AdminButton label="Save flags" onPress={() => updateFlags({ aiChatbot, whatsapp, autoInvoice })} />
          </SectionCard>

          <AdminButton label="Sign out" variant="secondary" onPress={() => signOut(dispatch)} style={styles.signOut} />
        </ScrollView>
      </AdminScreenLayout>
      </AdminStateShell>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({ signOut: { marginTop: spacing.lg } });
