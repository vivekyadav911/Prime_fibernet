import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@prime/ui';

import { signOut } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export function WebUnsupportedScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Mobile app required</Text>
        <Text style={styles.body}>
          Prime Fibernet web is for admin staff only. Please use the iOS or Android app for customer and
          officer accounts.
        </Text>
        {user?.email ? (
          <Text style={styles.email}>
            Signed in as {user.email} ({user.role})
          </Text>
        ) : null}
        <Button label="Sign out" onPress={() => signOut(dispatch)} style={styles.button} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: adminColors.canvasBg,
    padding: spacing.lg,
  },
  card: {
    maxWidth: 480,
    width: '100%',
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  email: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  button: {
    alignSelf: 'flex-start',
  },
});
