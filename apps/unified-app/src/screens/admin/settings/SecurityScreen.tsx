import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdminScreenLayout, RoleGuard, SearchBar, StatusBadge } from '@/components/admin';
import { SaveButton, SettingsHubLayout, SettingsRow, SettingsSection } from '@/components/admin/settings';
import { MfaEnrollModal } from '@/components/auth/MfaEnrollModal';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useMfaGate } from '@/hooks/useMfaGate';
import {
  useForceOfficerLogoutMutation,
  useGetAdminOfficersQuery,
  useProvisionUserAuthBatchMutation,
  useResetOfficerPasswordMutation,
} from '@/store/api/endpoints';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminOfficerDetail } from '@/types/api/admin';
import { queryErrorMessage } from '@/utils/queryError';

function passwordLabel(officer: AdminOfficerDetail): string {
  if (officer.accountStatus === 'inactive') return 'inactive';
  if (officer.isBlocked) return 'blocked';
  return 'active';
}

export function SecurityScreen() {
  const dispatch = useAppDispatch();
  const mfa = useMfaGate();
  const [mfaOpen, setMfaOpen] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error, refetch } = useGetAdminOfficersQuery({
    accountStatus: includeInactive ? 'all' : 'active',
  });
  const [resetPassword] = useResetOfficerPasswordMutation();
  const [forceLogout] = useForceOfficerLogoutMutation();
  const [provisionBatch] = useProvisionUserAuthBatchMutation();
  const [provisioning, setProvisioning] = useState(false);
  const [provisionMsg, setProvisionMsg] = useState<string | null>(null);
  // Action menu state. Alert.alert with buttons is a no-op on react-native-web,
  // so the officer actions run through an in-app modal that works everywhere.
  const [menuOfficer, setMenuOfficer] = useState<AdminOfficerDetail | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);

  const runProvisioning = useCallback(async () => {
    setProvisioning(true);
    setProvisionMsg('Starting…');
    let created = 0;
    let linked = 0;
    let failed = 0;
    let remaining = -1;
    let guard = 0;
    try {
      do {
        const res = await provisionBatch({ batchSize: 200 }).unwrap();
        created += res.created;
        linked += res.linkedExisting;
        failed += res.failed;
        remaining = res.remaining;
        setProvisionMsg(`Provisioned ${created + linked}, ${remaining} remaining…`);
        guard += 1;
        // Stop if a full batch made no progress (all failing) to avoid a hot loop.
        if (res.created === 0 && res.linkedExisting === 0) break;
      } while (remaining > 0 && guard < 100);
      setProvisionMsg(`Done. Created ${created}, linked ${linked}, failed ${failed}, ${remaining} remaining.`);
      dispatch(
        enqueueToast({
          id: Date.now().toString(),
          type: failed > 0 ? 'error' : 'success',
          message: `Provisioning: +${created} created, ${remaining} remaining`,
        }),
      );
    } catch (e) {
      setProvisionMsg(null);
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'error', message: queryErrorMessage(e) }));
    } finally {
      setProvisioning(false);
    }
  }, [provisionBatch, dispatch]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q),
    );
  }, [data, search]);

  const onMenu = useCallback((officer: AdminOfficerDetail) => {
    setResetResult(null);
    setMenuOfficer(officer);
  }, []);

  const closeMenu = useCallback(() => {
    if (actionBusy) return;
    setMenuOfficer(null);
    setResetResult(null);
  }, [actionBusy]);

  const handleReset = useCallback(async () => {
    if (!menuOfficer) return;
    setActionBusy(true);
    try {
      const result = await resetPassword({ officerId: menuOfficer.id }).unwrap();
      setResetResult({ email: result.loginEmail || menuOfficer.email, password: result.password });
    } catch (e) {
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'error', message: queryErrorMessage(e) }));
    } finally {
      setActionBusy(false);
    }
  }, [menuOfficer, resetPassword, dispatch]);

  const handleForceLogout = useCallback(async () => {
    if (!menuOfficer) return;
    setActionBusy(true);
    try {
      await forceLogout({ officerId: menuOfficer.id }).unwrap();
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'Logout recorded for officer' }));
      setMenuOfficer(null);
    } catch (e) {
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'error', message: queryErrorMessage(e) }));
    } finally {
      setActionBusy(false);
    }
  }, [menuOfficer, forceLogout, dispatch]);

  const renderItem = useCallback(
    ({ item }: { item: AdminOfficerDetail }) => (
        <View style={styles.row}>
          <View style={styles.rowMain}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <StatusBadge status={passwordLabel(item)} />
          </View>
          <Pressable
            onPress={() => {
              onMenu(item);
            }}
            style={styles.menuBtn}
          >
            <Text style={styles.menuIcon}>···</Text>
          </Pressable>
        </View>
      ),
    [onMenu],
  );

  const body = isLoading ? (
    <SkeletonLoader rows={6} />
  ) : isError ? (
    <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
  ) : (
    <>
      <SettingsSection title="Your Account Security">
        <Pressable style={styles.mfaRow} onPress={() => setMfaOpen(true)}>
          <View style={styles.rowMain}>
            <Text style={styles.name}>Two-factor authentication</Text>
            <Text style={styles.email}>
              {mfa.loading
                ? 'Checking status…'
                : mfa.enrolled
                  ? 'Enabled for your account'
                  : 'Not set up — tap to enable'}
            </Text>
          </View>
          <StatusBadge status={mfa.enrolled ? 'active' : 'inactive'} />
        </Pressable>
      </SettingsSection>
      <SettingsSection title="Account Provisioning (one-time)">
        <Text style={styles.provisionHint}>
          Creates login accounts for legacy customers/officers so they can claim access via email
          code. Safe to re-run; only unprovisioned accounts are affected.
        </Text>
        <Pressable
          style={[styles.provisionBtn, provisioning && styles.provisionBtnDisabled]}
          onPress={runProvisioning}
          disabled={provisioning}
        >
          <Text style={styles.provisionBtnText}>
            {provisioning ? 'Provisioning…' : 'Provision customer/officer logins'}
          </Text>
        </Pressable>
        {provisionMsg ? <Text style={styles.provisionStatus}>{provisionMsg}</Text> : null}
      </SettingsSection>
      <SettingsSection title="Officer Password Management">
        <SettingsRow
          label="Include inactive / resigned officers"
          value={includeInactive}
          onValueChange={setIncludeInactive}
        />
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, email, or ID" />
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.empty}>No officers found</Text>}
        />
      </SettingsSection>
      <SaveButton label="Save Security Settings" onPress={() => dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'Security settings saved' }))} />
    </>
  );

  return (
    <RoleGuard requiredPermission="settings.view">
      <AdminScreenLayout>
        <SettingsHubLayout activeRoute="Security">
          <ScrollView contentContainerStyle={styles.content}>{body}</ScrollView>
          <MfaEnrollModal
            visible={mfaOpen}
            onClose={() => setMfaOpen(false)}
            onEnrolled={() => void mfa.refresh()}
          />
          <Modal
            visible={menuOfficer != null}
            transparent
            animationType="fade"
            onRequestClose={closeMenu}
          >
            <Pressable style={styles.backdrop} onPress={closeMenu}>
              <Pressable style={styles.sheet} onPress={() => undefined}>
                {resetResult ? (
                  <>
                    <Text style={styles.sheetTitle}>Password reset</Text>
                    <Text style={styles.sheetSub}>
                      Share these credentials with the officer now — the password is shown only once.
                    </Text>
                    <Text style={styles.credLabel}>Login email</Text>
                    <Text selectable style={styles.credValue}>{resetResult.email}</Text>
                    <Text style={styles.credLabel}>Temporary password</Text>
                    <Text selectable style={styles.credValue}>{resetResult.password}</Text>
                    <Pressable style={styles.primaryBtn} onPress={closeMenu}>
                      <Text style={styles.primaryBtnText}>Done</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={styles.sheetTitle}>{menuOfficer?.name}</Text>
                    <Text style={styles.sheetSub}>{menuOfficer?.email}</Text>
                    <Pressable
                      style={[styles.primaryBtn, actionBusy && styles.btnDisabled]}
                      onPress={handleReset}
                      disabled={actionBusy}
                    >
                      {actionBusy ? (
                        <ActivityIndicator color={colors.surfaceWhite} />
                      ) : (
                        <Text style={styles.primaryBtnText}>Reset password</Text>
                      )}
                    </Pressable>
                    <Pressable
                      style={[styles.secondaryBtn, actionBusy && styles.btnDisabled]}
                      onPress={handleForceLogout}
                      disabled={actionBusy}
                    >
                      <Text style={styles.secondaryBtnText}>Force logout</Text>
                    </Pressable>
                    <Pressable style={styles.cancelBtn} onPress={closeMenu} disabled={actionBusy}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </Pressable>
                  </>
                )}
              </Pressable>
            </Pressable>
          </Modal>
        </SettingsHubLayout>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderDefault,
  },
  rowMain: { flex: 1, gap: 4 },
  name: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  email: { fontSize: 13, color: colors.textSecondary },
  mfaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  provisionHint: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm },
  provisionBtn: {
    backgroundColor: colors.primaryNavy,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  provisionBtnDisabled: { opacity: 0.6 },
  provisionBtnText: { color: colors.surfaceWhite, fontWeight: '600', fontSize: 15 },
  provisionStatus: { marginTop: spacing.sm, fontSize: 13, color: colors.textSecondary },
  menuBtn: { padding: spacing.sm },
  menuIcon: { fontSize: 20, fontWeight: '700', color: colors.textSecondary },
  empty: { padding: spacing.md, color: colors.textSecondary, textAlign: 'center' },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surfaceWhite,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  sheetSub: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm },
  credLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  credValue: {
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  primaryBtn: {
    backgroundColor: colors.primaryNavy,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  primaryBtnText: { color: colors.surfaceWhite, fontWeight: '600', fontSize: 15 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryBtnText: { color: colors.textPrimary, fontWeight: '600', fontSize: 15 },
  btnDisabled: { opacity: 0.6 },
  cancelBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
  cancelBtnText: { color: colors.textSecondary, fontSize: 15 },
});
