import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '@prime/ui';
import { Ionicons } from '@expo/vector-icons';

import { ErrorState, ScreenWrapper, SkeletonLoader } from '@/components/common';
import { useOfficerProfile, usePendingContractSignature } from '@/hooks/officer';
import { signOut } from '@/hooks/useAuth';
import { useOfficerId } from '@/hooks/useOfficerId';
import { getSupabase } from '@/services/supabase';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { OfficerProfileStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export function OfficerProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OfficerProfileStackParamList>>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { profile, isLoading: profileLoading, isError: profileError, refetch } = useOfficerProfile();
  const officerId = useOfficerId();
  const { needsSignature, navigateToSign } = usePendingContractSignature();
  const [displayName, setDisplayName] = useState(profile?.name ?? '');
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.name) setDisplayName(profile.name);
  }, [profile?.name]);

  const onSaveName = useCallback(async () => {
    if (!officerId || !displayName.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await getSupabase()
        .from('officers')
        .update({ full_name: displayName.trim() })
        .eq('id', officerId);
      if (error) throw error;
      setEditingName(false);
      refetch();
    } catch (err) {
      setSaveError((err as Error).message ?? 'Failed to save name. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [displayName, officerId, refetch]);

  const onAvatar = useCallback(async () => {
    if (!officerId) return;
    setAvatarError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled || !result.assets[0]) return;

      const uri = result.assets[0].uri;
      const fileName = `avatars/${officerId}_${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await getSupabase().storage
        .from('officer-avatars')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = getSupabase().storage.from('officer-avatars').getPublicUrl(fileName);
      const { error: updateError } = await getSupabase()
        .from('officers')
        .update({ profile_photo_url: urlData.publicUrl })
        .eq('id', officerId);
      if (updateError) throw updateError;
      refetch();
    } catch (err) {
      setAvatarError((err as Error).message ?? 'Photo upload failed. Please try again.');
    }
  }, [officerId, refetch]);

  if (profileLoading) {
    return (
      <ScreenWrapper>
        <SkeletonLoader rows={6} />
      </ScreenWrapper>
    );
  }

  if (profileError) {
    return (
      <ScreenWrapper>
        <ErrorState message="Could not load profile. Please try again." onRetry={refetch} />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.avatarWrap}>
        <Pressable onPress={() => void onAvatar()}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{profile?.name?.charAt(0) ?? 'O'}</Text>
            </View>
          )}
        </Pressable>
        <Text style={styles.name}>{profile?.name ?? user?.name}</Text>
        <Text style={styles.role}>
          {profile?.designation ?? 'Field Technician'}
          {profile?.employeeId ? ` · ${profile.employeeId}` : ''}
        </Text>
        {editingName ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.nameInput}
              value={displayName}
              onChangeText={setDisplayName}
            />
            <Button label={saving ? '…' : 'Save'} onPress={() => void onSaveName()} disabled={saving} />
          </View>
        ) : (
          <Pressable style={styles.editLink} onPress={() => setEditingName(true)}>
            <Text style={styles.editLinkText}>✏️ Edit display name</Text>
          </Pressable>
        )}
        {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
        {avatarError ? <Text style={styles.errorText}>{avatarError}</Text> : null}
      </View>

      <Text style={styles.sectionLabel}>ACCOUNT INFO</Text>
      <View style={styles.card}>
        <InfoRow label="Email" value={profile?.email ?? user?.email ?? '—'} locked />
        <InfoRow label="Phone" value={profile?.phone ?? '—'} locked />
        <InfoRow label="Zone" value={profile?.zone ?? '—'} locked />
        <InfoRow label="Department" value={profile?.department ?? 'Field Operations'} locked />
        <InfoRow label="Joined" value={profile?.joinDate ?? '—'} locked />
      </View>

      <Pressable
        style={styles.linkRow}
        onPress={() =>
          needsSignature ? navigateToSign() : navigation.navigate('EmploymentContract')
        }
      >
        <Ionicons name="document-text-outline" size={20} color={colors.primaryNavy} />
        <Text style={styles.linkText}>Employment Contract</Text>
        {needsSignature ? (
          <View style={styles.signBadge}>
            <Text style={styles.signBadgeText}>Sign required</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </Pressable>

      <Pressable
        style={styles.linkRow}
        onPress={() => navigation.navigate('ChangePassword')}
      >
        <Ionicons name="lock-closed-outline" size={20} color={colors.primaryNavy} />
        <Text style={styles.linkText}>Change Password</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </Pressable>

      <View style={styles.appSection}>
        <Text style={styles.sectionLabel}>APP</Text>
        <Text style={styles.version}>Version 2.1.0</Text>
      </View>

      <Button label="Sign Out" variant="secondary" onPress={() => void signOut(dispatch)} />
    </ScreenWrapper>
  );
}

function InfoRow({ label, value, locked }: { label: string; value: string; locked?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoValueRow}>
        <Text style={styles.infoValue}>{value}</Text>
        {locked ? <Ionicons name="lock-closed" size={14} color={colors.textSecondary} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarWrap: { alignItems: 'center', marginBottom: spacing.lg },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: spacing.sm },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryNavy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarInitial: { fontSize: 32, fontWeight: '700', color: colors.white },
  name: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  role: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xxs },
  editLink: { minHeight: 48, justifyContent: 'center', marginTop: spacing.sm },
  editLinkText: { color: colors.accentTeal, fontWeight: '600' },
  editRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, width: '100%' },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    color: colors.textPrimary,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  infoLabel: { color: colors.textSecondary, fontSize: 14 },
  infoValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  infoValue: { color: colors.textPrimary, fontWeight: '500' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  linkText: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.primaryNavy },
  signBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryNavy,
    marginRight: spacing.xs,
  },
  signBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white, textTransform: 'uppercase' },
  appSection: { marginBottom: spacing.lg },
  version: { color: colors.textSecondary },
  errorText: { color: colors.errorRed, fontSize: 12, marginTop: spacing.xs, textAlign: 'center' },
});
