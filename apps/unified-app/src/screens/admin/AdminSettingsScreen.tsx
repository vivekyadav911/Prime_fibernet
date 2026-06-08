import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Screen, colors } from '@prime/ui';
import type { PaymentGateway } from '@prime/types';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { signOut } from '@/hooks/useAuth';
import { useAppDispatch } from '@/store/hooks';
import { useGetAdminSettingsQuery, useUpdateAdminSettingsMutation } from '@/store/api/endpoints';
import { queryErrorMessage } from '@/utils/queryError';

export function AdminSettingsScreen() {
  const dispatch = useAppDispatch();
  const { data: settings, isLoading, isError, error, refetch } = useGetAdminSettingsQuery();
  const [updateSettings] = useUpdateAdminSettingsMutation();
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [gateway, setGateway] = useState<PaymentGateway>('easybuzz');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setCompanyName(String(settings.company_name ?? ''));
      setCompanyEmail(String(settings.company_email ?? ''));
      setGateway((settings.payment_gateway as PaymentGateway) ?? 'easybuzz');
    }
  }, [settings]);

  const onSave = async () => {
    await updateSettings({
      company_name: companyName,
      company_email: companyEmail,
      payment_gateway: gateway,
    });
    setSaved(true);
    refetch();
    setTimeout(() => setSaved(false), 2000);
  };

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={4} />
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

  if (!settings) {
    return (
      <Screen>
        <EmptyState title="Settings unavailable" subtitle="Could not load company settings" icon="⚙️" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.section}>Company branding</Text>
      <TextInput style={styles.input} placeholder="Company name" value={companyName} onChangeText={setCompanyName} />
      <TextInput style={styles.input} placeholder="Support email" value={companyEmail} onChangeText={setCompanyEmail} autoCapitalize="none" />

      <Text style={styles.section}>Payment gateway</Text>
      <Text style={styles.hint}>Switch between EasyBuzz and Razorpay. Changes apply to all new payments immediately.</Text>
      <View style={styles.gatewayRow}>
        {(['easybuzz', 'razorpay'] as PaymentGateway[]).map((g) => (
          <Pressable
            key={g}
            style={[styles.gatewayChip, gateway === g && styles.gatewayActive]}
            onPress={() => setGateway(g)}
          >
            <Text style={[styles.gatewayText, gateway === g && styles.gatewayTextActive]}>
              {g === 'easybuzz' ? 'EasyBuzz' : 'Razorpay'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Button label={saved ? 'Saved!' : 'Save settings'} onPress={onSave} style={styles.btn} />
      <Button label="Sign out" variant="secondary" onPress={() => signOut(dispatch)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  section: { fontWeight: '600', marginTop: 16, marginBottom: 8 },
  hint: { color: colors.textSecondary, fontSize: 13, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.surfaceWhite,
  },
  gatewayRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  gatewayChip: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderDefault,
    alignItems: 'center',
  },
  gatewayActive: { borderColor: colors.primaryNavy, backgroundColor: colors.background },
  gatewayText: { fontWeight: '600', color: colors.textSecondary },
  gatewayTextActive: { color: colors.primaryNavy },
  btn: { marginTop: 8, marginBottom: 12 },
});
