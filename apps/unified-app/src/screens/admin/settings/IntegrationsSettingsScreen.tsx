import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ToggleSwitch } from '@/components/common';
import type { PaymentGateway } from '@prime/types';

import { AdminButton, AdminScreenLayout, FormField, RoleGuard } from '@/components/admin';
import { SaveButton, SettingsHubLayout, SettingsSection } from '@/components/admin/settings';
import { ErrorState, SkeletonLoader } from '@/components/common';
import {
  useGetFullAdminSettingsQuery,
  useTestEmailSettingsMutation,
  useUpdateEmailSettingsMutation,
  useUpdateFeatureFlagsMutation,
  useUpdatePaymentGatewaySettingsMutation,
  useUpdateSmsSettingsMutation,
} from '@/store/api/endpoints';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminSettingsStackParamList } from '@/types/navigation';
import { queryErrorMessage } from '@/utils/queryError';

export function IntegrationsSettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminSettingsStackParamList>>();
  const dispatch = useAppDispatch();
  const { data, isLoading, isError, error, refetch } = useGetFullAdminSettingsQuery();
  const [updateEmail] = useUpdateEmailSettingsMutation();
  const [testEmail] = useTestEmailSettingsMutation();
  const [updateGateways] = useUpdatePaymentGatewaySettingsMutation();
  const [updateSms] = useUpdateSmsSettingsMutation();
  const [updateFlags] = useUpdateFeatureFlagsMutation();

  const [companyEmail, setCompanyEmail] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [smsProvider, setSmsProvider] = useState('');
  const [smsApiKey, setSmsApiKey] = useState('');
  const [smsSenderId, setSmsSenderId] = useState('');
  const [gateway, setGateway] = useState<PaymentGateway>('easybuzz');
  const [aiChatbot, setAiChatbot] = useState(true);
  const [whatsapp, setWhatsapp] = useState(false);
  const [autoInvoice, setAutoInvoice] = useState(true);

  useEffect(() => {
    if (data) {
      setCompanyEmail(String(data.company.email ?? ''));
      setSmtpHost(String(data.email.smtpHost ?? ''));
      setSmtpPort(String(data.email.smtpPort ?? '587'));
      setSmtpUser(String(data.email.smtpUser ?? ''));
      setFromAddress(String(data.email.fromAddress ?? ''));
      setSmsProvider(String(data.sms.provider ?? ''));
      setSmsApiKey(String(data.sms.apiKey ?? ''));
      setSmsSenderId(String(data.sms.senderId ?? ''));
      setGateway((data.paymentGateways.activeGateway as PaymentGateway) ?? 'easybuzz');
      setAiChatbot(Boolean(data.featureFlags.aiChatbot));
      setWhatsapp(Boolean(data.featureFlags.whatsapp));
      setAutoInvoice(Boolean(data.featureFlags.autoInvoice));
    }
  }, [data]);

  const toastError = (e: unknown) => {
    dispatch(enqueueToast({ id: Date.now().toString(), type: 'error', message: queryErrorMessage(e) }));
  };

  const body = isLoading ? (
    <SkeletonLoader rows={8} />
  ) : isError ? (
    <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
  ) : (
    <>
      <SettingsSection title="Email Config (SMTP)">
        <FormField label="SMTP Host" value={smtpHost} onChangeText={setSmtpHost} />
        <FormField label="SMTP Port" value={smtpPort} onChangeText={setSmtpPort} keyboardType="numeric" />
        <FormField label="SMTP User" value={smtpUser} onChangeText={setSmtpUser} />
        <FormField label="From Address" value={fromAddress} onChangeText={setFromAddress} />
        <SaveButton
          label="Save Email Config"
          onPress={async () => {
            try {
              await updateEmail({ smtpHost, smtpPort: Number(smtpPort), smtpUser, fromAddress }).unwrap();
              dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'Email config saved' }));
            } catch (e) {
              toastError(e);
            }
          }}
        />
        <AdminButton
          label="Test email"
          variant="secondary"
          onPress={async () => {
            try {
              await testEmail({ to: companyEmail || fromAddress }).unwrap();
              dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'Test email sent' }));
            } catch (e) {
              toastError(e);
            }
          }}
        />
      </SettingsSection>

      <SettingsSection title="SMS Integration">
        <FormField label="Provider" value={smsProvider} onChangeText={setSmsProvider} />
        <FormField label="API Key" value={smsApiKey} onChangeText={setSmsApiKey} />
        <FormField label="Sender ID" value={smsSenderId} onChangeText={setSmsSenderId} />
        <SaveButton
          label="Save SMS Config"
          onPress={async () => {
            try {
              await updateSms({ provider: smsProvider, apiKey: smsApiKey, senderId: smsSenderId }).unwrap();
              dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'SMS config saved' }));
            } catch (e) {
              toastError(e);
            }
          }}
        />
      </SettingsSection>

      <SettingsSection title="Payment Gateways">
        <AdminButton
          label="Configure payment gateways"
          variant="secondary"
          onPress={() => navigation.navigate('GatewayConfig')}
        />
        <AdminButton label="EasyBuzz" variant={gateway === 'easybuzz' ? 'primary' : 'ghost'} onPress={() => setGateway('easybuzz')} />
        <AdminButton label="Razorpay" variant={gateway === 'razorpay' ? 'primary' : 'ghost'} onPress={() => setGateway('razorpay')} />
        <SaveButton
          label="Save Gateway"
          onPress={async () => {
            try {
              await updateGateways({ activeGateway: gateway }).unwrap();
              dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'Payment gateway saved' }));
            } catch (e) {
              toastError(e);
            }
          }}
        />
      </SettingsSection>

      <SettingsSection title="Feature Flags">
        <Text style={styles.flagRow}>AI Chatbot <ToggleSwitch value={aiChatbot} onValueChange={setAiChatbot} /></Text>
        <Text style={styles.flagRow}>WhatsApp <ToggleSwitch value={whatsapp} onValueChange={setWhatsapp} /></Text>
        <Text style={styles.flagRow}>Auto-Invoice <ToggleSwitch value={autoInvoice} onValueChange={setAutoInvoice} /></Text>
        <SaveButton
          label="Save Feature Flags"
          onPress={async () => {
            try {
              await updateFlags({ aiChatbot, whatsapp, autoInvoice }).unwrap();
              dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'Feature flags saved' }));
            } catch (e) {
              toastError(e);
            }
          }}
        />
      </SettingsSection>
    </>
  );

  return (
    <RoleGuard requiredPermission="settings.view">
      <AdminScreenLayout>
        <SettingsHubLayout activeRoute="Integrations">
          <ScrollView contentContainerStyle={styles.content}>{body}</ScrollView>
        </SettingsHubLayout>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  flagRow: { fontSize: 15, color: colors.textPrimary, marginVertical: spacing.xs },
});
