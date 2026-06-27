import React from 'react';

import { AdminButton } from '@/components/admin';
import { StyleSheet, Text, View } from 'react-native';
import type { UserProfile } from '@prime/types';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type UserRowProps = {
  user: UserProfile;
  canBlock: boolean;
  onBlock: (userId: string) => void;
  onUnblock: (userId: string) => void;
};

export const UserRow = React.memo(function UserRow({ user, canBlock, onBlock, onUnblock }: UserRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.meta}>{user.email} · {user.role}</Text>
        {user.isBlocked ? <Text style={styles.blocked}>Blocked</Text> : null}
      </View>
      {user.isBlocked ? (
        <AdminButton label="Unblock" variant="secondary" onPress={() => onUnblock(user.id)} />
      ) : (
        <AdminButton label="Block" variant="ghost" onPress={() => onBlock(user.id)} disabled={!canBlock} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault },
  info: { flex: 1 },
  name: { fontWeight: '600' },
  meta: { color: colors.textSecondary, fontSize: 12 },
  blocked: { color: colors.errorRed, fontSize: 12 },
});
