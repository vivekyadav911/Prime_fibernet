import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  AdminButton,
  AdminScreenLayout,
  FormField,
  SectionCard,
} from '@/components/admin';
import {
  DismissKeyboardScrollView,
  ErrorState,
  FullScreenModalShell,
  KeyboardDismissView,
  SkeletonLoader,
  ToggleSwitch,
} from '@/components/common';
import {
  useGetBankAccountsAdminQuery,
  useUpsertBankAccountMutation,
} from '@/services/api/paymentCollectionApi';
import type { BankAccountRecord } from '@/types/payments';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

export function BankAccountsScreen() {
  const { data, isLoading, isError, error, refetch } = useGetBankAccountsAdminQuery();
  const [upsert, { isLoading: saving }] = useUpsertBankAccountMutation();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccountRecord | null>(null);
  const [nickname, setNickname] = useState('');
  const [upiVpa, setUpiVpa] = useState('');
  const [bankName, setBankName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);

  const resetForm = useCallback(() => {
    setEditing(null);
    setNickname('');
    setUpiVpa('');
    setBankName('');
    setIsActive(true);
    setIsDefault(false);
  }, []);

  const openNew = useCallback(() => {
    resetForm();
    setFormOpen(true);
  }, [resetForm]);

  const openEdit = useCallback((account: BankAccountRecord) => {
    setEditing(account);
    setNickname(account.nickname);
    setUpiVpa(account.upi_vpa);
    setBankName(account.bank_name ?? '');
    setIsActive(account.is_active);
    setIsDefault(account.is_default);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    resetForm();
  }, [resetForm]);

  const onSave = useCallback(async () => {
    if (!nickname.trim() || !upiVpa.trim()) {
      Alert.alert('Missing fields', 'Nickname and UPI VPA are required.');
      return;
    }
    try {
      await upsert({
        id: editing?.id,
        nickname: nickname.trim(),
        upi_vpa: upiVpa.trim(),
        bank_name: bankName.trim() || undefined,
        is_active: isActive,
        is_default: isDefault,
      }).unwrap();
      Alert.alert('Saved', 'Bank account updated.');
      closeForm();
      refetch();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Save failed');
    }
  }, [
    bankName,
    closeForm,
    editing?.id,
    isActive,
    isDefault,
    nickname,
    refetch,
    upiVpa,
    upsert,
  ]);

  if (isLoading) {
    return (
      <AdminScreenLayout scroll={false}>
        <SkeletonLoader rows={4} />
      </AdminScreenLayout>
    );
  }

  if (isError) {
    return (
      <AdminScreenLayout scroll={false}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </AdminScreenLayout>
    );
  }

  const accounts = data ?? [];

  return (
    <AdminScreenLayout scroll={false}>
      <DismissKeyboardScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Company bank accounts used for officer UPI QR collections. Each account generates a
          per-transaction QR from its VPA.
        </Text>
        <AdminButton label="Add bank account" onPress={openNew} />

        {accounts.length === 0 ? (
          <Text style={styles.empty}>No bank accounts configured yet.</Text>
        ) : (
          accounts.map((account) => (
            <SectionCard key={account.id} title={account.nickname}>
              <Text style={styles.meta}>UPI: {account.upi_vpa}</Text>
              {account.bank_name ? <Text style={styles.meta}>{account.bank_name}</Text> : null}
              <Text style={styles.meta}>
                {account.is_active ? 'Active' : 'Inactive'}
                {account.is_default ? ' · Default' : ''}
              </Text>
              <AdminButton label="Edit" variant="secondary" onPress={() => openEdit(account)} />
            </SectionCard>
          ))
        )}
      </DismissKeyboardScrollView>

      <FullScreenModalShell
        visible={formOpen}
        onRequestClose={closeForm}
        onCancel={closeForm}
        title={editing ? 'Edit bank account' : 'Add bank account'}
      >
        <KeyboardDismissView style={styles.modalBody}>
          <FormField label="Nickname" value={nickname} onChangeText={setNickname} />
          <FormField label="UPI VPA" value={upiVpa} onChangeText={setUpiVpa} autoCapitalize="none" />
          <FormField label="Bank name (optional)" value={bankName} onChangeText={setBankName} />
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Active</Text>
            <ToggleSwitch value={isActive} onValueChange={setIsActive} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Default for officers</Text>
            <ToggleSwitch value={isDefault} onValueChange={setIsDefault} />
          </View>
          <AdminButton label="Save" onPress={() => void onSave()} disabled={saving} />
        </KeyboardDismissView>
      </FullScreenModalShell>
    </AdminScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  intro: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  empty: { fontSize: 14, color: colors.textSecondary, fontStyle: 'italic' },
  meta: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.xs },
  modalBody: { padding: spacing.md, gap: spacing.sm },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.xs,
  },
  toggleLabel: { fontSize: 14, color: colors.textPrimary, fontWeight: '600' },
});
