import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Screen } from '@prime/ui';

import { FormField } from '@/components/admin';
import { GatewayCard } from '@/components/payments';
import { DismissKeyboardScrollView, ErrorState, FullScreenModalShell, KeyboardDismissView, SkeletonLoader } from '@/components/common';
import { useGateways } from '@/hooks/usePayments';
import type { GatewaySlug, PaymentGatewayRecord } from '@/types/payments';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

const CREDENTIAL_FIELDS: Record<GatewaySlug, { key: string; label: string; secret?: boolean }[]> = {
  razorpay: [
    { key: 'key_id', label: 'Key ID' },
    { key: 'key_secret', label: 'Key Secret', secret: true },
    { key: 'webhook_secret', label: 'Webhook Secret', secret: true },
  ],
  easebuzz: [
    { key: 'merchant_key', label: 'Merchant Key' },
    { key: 'salt', label: 'Salt', secret: true },
    { key: 'env', label: 'Environment (production/test)' },
  ],
  payu: [
    { key: 'merchant_key', label: 'Merchant Key' },
    { key: 'salt', label: 'Salt', secret: true },
    { key: 'auth_header', label: 'Auth Header', secret: true },
    { key: 'env', label: 'Environment (production/test)' },
  ],
  cashfree: [
    { key: 'app_id', label: 'App ID' },
    { key: 'secret_key', label: 'Secret Key', secret: true },
    { key: 'env', label: 'Environment (production/sandbox)' },
  ],
  paytm: [
    { key: 'merchant_id', label: 'Merchant ID' },
    { key: 'merchant_key', label: 'Merchant Key', secret: true },
    { key: 'website', label: 'Website' },
    { key: 'channel_id', label: 'Channel ID' },
    { key: 'env', label: 'Environment (production/staging)' },
  ],
};

export function GatewayConfigScreen() {
  const { data, isLoading, isError, error, refetch, saveCredentials } = useGateways();
  const [editing, setEditing] = useState<PaymentGatewayRecord | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [testMode, setTestMode] = useState(false);
  const [busy, setBusy] = useState(false);

  const openEdit = useCallback((gateway: PaymentGatewayRecord) => {
    setEditing(gateway);
    setTestMode(gateway.test_mode);
    setForm({});
  }, []);

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const runSave = async (opts: { testOnly?: boolean; activate?: boolean; setDefault?: boolean }) => {
    if (!editing) return;
    setBusy(true);
    try {
      const result = await saveCredentials({
        gatewayId: editing.id,
        credentials: form,
        testMode,
        testOnly: opts.testOnly,
        activate: opts.activate,
        setDefault: opts.setDefault,
      }).unwrap();
      if (opts.testOnly) {
        Alert.alert(result.success ? 'Connection OK' : 'Test failed', JSON.stringify(result));
      } else {
        Alert.alert('Saved', 'Gateway credentials saved.');
        setEditing(null);
        refetch();
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const onToggleActive = async (gateway: PaymentGatewayRecord, active: boolean) => {
    try {
      await saveCredentials({ gatewayId: gateway.id, activate: active }).unwrap();
      refetch();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Update failed');
    }
  };

  if (isLoading) return <Screen><SkeletonLoader rows={5} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Payment Gateways</Text>
      <Text style={styles.sub}>Configure your payment providers</Text>
      <DismissKeyboardScrollView>
        {(data ?? []).map((gw) => (
          <GatewayCard
            key={gw.id}
            gateway={gw}
            onConfigure={() => openEdit(gw)}
            onToggleActive={(active) => onToggleActive(gw, active)}
          />
        ))}
      </DismissKeyboardScrollView>

      <FullScreenModalShell
        visible={!!editing}
        onRequestClose={() => setEditing(null)}
        title={editing?.name ?? 'Gateway'}
        onCancel={() => setEditing(null)}
      >
        <KeyboardDismissView style={styles.modalBody}>
          <DismissKeyboardScrollView contentContainerStyle={styles.modalScroll}>
            {editing
              ? CREDENTIAL_FIELDS[editing.slug].map((field) => (
                  <FormField
                    key={field.key}
                    label={field.label}
                    value={form[field.key] ?? ''}
                    onChangeText={(v) => setField(field.key, v)}
                    secureTextEntry={field.secret}
                  />
                ))
              : null}
            <View style={styles.row}>
              <Text style={styles.label}>Test mode</Text>
              <Switch value={testMode} onValueChange={setTestMode} />
            </View>
            {editing?.webhook_url ? (
              <Text style={styles.webhook}>Webhook: {editing.webhook_url}</Text>
            ) : null}
            <Button label="Test connection" variant="secondary" onPress={() => runSave({ testOnly: true })} disabled={busy} />
            <Button label="Save & activate" onPress={() => runSave({ activate: true })} disabled={busy} />
            <Button label="Set as default" variant="ghost" onPress={() => runSave({ activate: true, setDefault: true })} />
          </DismissKeyboardScrollView>
        </KeyboardDismissView>
      </FullScreenModalShell>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: adminColors.canvasBg, padding: spacing.md },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  sub: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md },
  modalBody: { flex: 1 },
  modalScroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: spacing.sm },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  webhook: { fontSize: 11, color: colors.textSecondary, marginVertical: spacing.sm },
});
