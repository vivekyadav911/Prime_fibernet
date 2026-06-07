import { StyleSheet, Text } from 'react-native';
import { Button, Screen, colors } from '@prime/ui';

import { signOut } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

export function ProfileScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();

  return (
    <Screen>
      <Text style={styles.title}>{user?.name}</Text>
      <Text style={styles.meta}>{user?.email}</Text>
      <Text style={styles.meta}>Role: {user?.role}</Text>
      <Button label="Sign out" variant="secondary" onPress={() => signOut(dispatch)} style={styles.btn} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '600', color: colors.textPrimary },
  meta: { color: colors.textSecondary, marginTop: 4 },
  btn: { marginTop: 24 },
});
