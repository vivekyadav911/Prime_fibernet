import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { Faq } from '@/types/support';

type FaqCardProps = {
  faq: Faq;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublished: (published: boolean) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

export function FaqCard({
  faq,
  onEdit,
  onDelete,
  onTogglePublished,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: FaqCardProps) {
  const categoryColor = faq.category?.color ?? adminColors.primary;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}22` }]}>
          <Text style={[styles.categoryText, { color: categoryColor }]}>
            {faq.category?.name ?? 'Uncategorized'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.order}>Order: {faq.sortOrder}</Text>
          <View style={[styles.statusBadge, faq.isPublished ? styles.published : styles.draft]}>
            <Text style={[styles.statusText, faq.isPublished ? styles.publishedText : styles.draftText]}>
              {faq.isPublished ? 'Published' : 'Draft'}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.question} numberOfLines={2}>
        {faq.question}
      </Text>
      <Text style={styles.answer} numberOfLines={2}>
        {faq.answer}
      </Text>

      <View style={styles.footer}>
        <View style={styles.actions}>
          {(canMoveUp || canMoveDown) ? (
            <View style={styles.reorder}>
              {canMoveUp ? (
                <Pressable onPress={onMoveUp} hitSlop={8}>
                  <Ionicons name="chevron-up" size={18} color={adminColors.primary} />
                </Pressable>
              ) : null}
              {canMoveDown ? (
                <Pressable onPress={onMoveDown} hitSlop={8}>
                  <Ionicons name="chevron-down" size={18} color={adminColors.primary} />
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <Pressable onPress={onEdit} hitSlop={8}>
            <Ionicons name="pencil" size={18} color={adminColors.primary} />
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash" size={18} color={adminColors.deleteIcon} />
          </Pressable>
        </View>
        <Pressable
          style={[styles.toggle, faq.isPublished && styles.toggleOn]}
          onPress={() => onTogglePublished(!faq.isPublished)}
        >
          <Text style={[styles.toggleText, faq.isPublished && styles.toggleTextOn]}>
            {faq.isPublished ? 'Published' : 'Draft'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  categoryBadge: {
    flexShrink: 1,
    maxWidth: '55%',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 999,
  },
  categoryText: { fontSize: 11, fontWeight: '700' },
  headerRight: { flex: 1, alignItems: 'flex-end', gap: spacing.xxs },
  order: { fontSize: 10, color: colors.textSecondary },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999 },
  published: { backgroundColor: '#D1FAE5' },
  draft: { backgroundColor: colors.borderDefault },
  statusText: { fontSize: 10, fontWeight: '700' },
  publishedText: { color: '#047857' },
  draftText: { color: colors.textSecondary },
  question: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  answer: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', flexShrink: 0 },
  reorder: { flexDirection: 'row', gap: spacing.xs, marginRight: spacing.xs },
  toggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.borderDefault,
  },
  toggleOn: { backgroundColor: adminColors.primary },
  toggleText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  toggleTextOn: { color: colors.white },
});
