import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { AppNotification } from '@/types/notifications';
import { formatAudienceLabel, formatRelativeTime } from '@/utils/notificationUtils';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type DraftCardProps = {
  draft: AppNotification;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function DraftCard({ draft, onPress, onEdit, onDelete }: DraftCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Ionicons name="mail-open-outline" size={24} color="#F59E0B" style={styles.icon} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {draft.title.trim() || 'Untitled Draft'}
        </Text>
        <Text style={styles.audience}>{formatAudienceLabel(draft.audience)}</Text>
        <Text style={styles.edited}>Last edited {formatRelativeTime(draft.updatedAt)}</Text>
      </View>
      <Pressable onPress={onEdit} hitSlop={8}>
        <Text style={styles.editBtn}>Edit</Text>
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={20} color={colors.errorRed} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceWhite,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: spacing.sm,
  },
  icon: { marginRight: spacing.xs },
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  audience: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  edited: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  editBtn: { fontSize: 14, fontWeight: '600', color: adminColors.primary },
  deleteBtn: { padding: spacing.xs },
});
