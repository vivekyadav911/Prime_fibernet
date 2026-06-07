import { useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Button, Screen, colors } from '@prime/ui';

import { signOut } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useUpdateProfileMutation } from '@/store/api/endpoints';

export function ProfileScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const [updateProfile] = useUpdateProfileMutation();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState('');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [saved, setSaved] = useState(false);
  const isDev = user?.email?.endsWith('@prime.local');

  const onSave = async () => {
    if (!user) return;
    await updateProfile({
      userId: user.id,
      name,
      phone: phone || undefined,
      notificationPrefs: { push: pushEnabled, email: emailEnabled },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Screen>
      <Text style={styles.title}>{user?.name}</Text>
      <Text style={styles.meta}>{user?.email}</Text>
      <Text style={styles.meta}>Role: {user?.role}</Text>
      {isDev ? <Text style={styles.devBadge}>Dev account</Text> : null}

      <Text style={styles.sectionTitle}>Edit profile</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" />
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" />

      <Text style={styles.sectionTitle}>Notifications</Text>
      <View style={styles.toggleRow}>
        <Text>Push notifications</Text>
        <Switch value={pushEnabled} onValueChange={setPushEnabled} />
      </View>
      <View style={styles.toggleRow}>
        <Text>Email notifications</Text>
        <Switch value={emailEnabled} onValueChange={setEmailEnabled} />
      </View>

      <Button label={saved ? 'Saved!' : 'Save changes'} onPress={onSave} style={styles.btn} />
      <Button label="Sign out" variant="secondary" onPress={() => signOut(dispatch)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600', color: colors.textPrimary },
  meta: { color: colors.textSecondary, marginTop: 4 },
  devBadge: { color: colors.warningAmber, marginTop: 8, fontSize: 13 },
  sectionTitle: { fontWeight: '600', marginTop: 20, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.surfaceWhite,
  },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  btn: { marginTop: 8, marginBottom: 12 },
});
