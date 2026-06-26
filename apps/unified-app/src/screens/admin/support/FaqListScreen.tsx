import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';


import { FaqCard } from '@/components/support';
import { AdminScreenLayout, AdminEmptyState, FilterChips, RoleGuard, SearchBar } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import {
  useDeleteFaqMutation,
  useGetFaqsAdminQuery,
  useGetFaqCategoriesQuery,
  useReorderFaqsMutation,
  useUpsertFaqMutation,
} from '@/services/api/adminSupportApi';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminSupportStackParamList } from '@/types/navigation';
import type { Faq } from '@/types/support';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminSupportStackParamList, 'FaqList'>;

export function FaqListScreen({ navigation }: Props) {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  const { data: categories } = useGetFaqCategoriesQuery();
  const { data: faqs, isLoading, isError, error, refetch } = useGetFaqsAdminQuery();
  const [deleteFaq] = useDeleteFaqMutation();
  const [upsertFaq] = useUpsertFaqMutation();
  const [reorderFaqs] = useReorderFaqsMutation();

  const filtered = useMemo(() => {
    let list = faqs ?? [];
    if (categoryId !== 'all') list = list.filter((f) => f.categoryId === categoryId);
    if (statusFilter === 'published') list = list.filter((f) => f.isPublished);
    if (statusFilter === 'draft') list = list.filter((f) => !f.isPublished);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [faqs, categoryId, statusFilter, search]);

  const handleDelete = useCallback(
    (faq: Faq) => {
      Alert.alert('Delete FAQ', `Delete "${faq.question}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteFaq(faq.id),
        },
      ]);
    },
    [deleteFaq],
  );

  const handleTogglePublished = useCallback(
    async (faq: Faq, published: boolean) => {
      await upsertFaq({
        id: faq.id,
        data: {
          categoryId: faq.categoryId ?? '',
          question: faq.question,
          answer: faq.answer,
          isPublished: published,
          isFeatured: faq.isFeatured,
          tags: faq.tags,
          sortOrder: faq.sortOrder,
        },
      });
    },
    [upsertFaq],
  );

  const handleMove = useCallback(
    (index: number, direction: 'up' | 'down') => {
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= filtered.length) return;
      const next = [...filtered];
      const current = next[index];
      const target = next[swapIndex];
      if (!current || !target) return;
      next[index] = target;
      next[swapIndex] = current;
      void reorderFaqs(next.map((f, i) => ({ id: f.id, sortOrder: i })));
    },
    [filtered, reorderFaqs],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Faq; index: number }) => (
      <FaqCard
        faq={item}
        canMoveUp={index > 0}
        canMoveDown={index < filtered.length - 1}
        onMoveUp={() => handleMove(index, 'up')}
        onMoveDown={() => handleMove(index, 'down')}
        onEdit={() => navigation.navigate('FaqEditor', { faqId: item.id })}
        onDelete={() => handleDelete(item)}
        onTogglePublished={(p) => void handleTogglePublished(item, p)}
      />
    ),
    [navigation, handleDelete, handleTogglePublished, handleMove, filtered.length],
  );

  if (isLoading) {
    return (
      <AdminScreenLayout>
        <SkeletonLoader rows={6} />
      </AdminScreenLayout>
    );
  }

  if (isError) {
    return (
      <AdminScreenLayout>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </AdminScreenLayout>
    );
  }

  return (
    <RoleGuard requiredPermission="settings.view">
      <AdminScreenLayout>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              FAQs
            </Text>
            <Pressable onPress={() => navigation.navigate('FaqEditor', {})}>
              <Text style={styles.addBtn}>+ Add</Text>
            </Pressable>
          </View>

          <View style={styles.filters}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search FAQs…" />
            <FilterChips
              options={[
                { value: 'all', label: 'All' },
                ...(categories ?? []).map((c) => ({ value: c.id, label: c.name })),
              ]}
              selected={categoryId}
              onSelect={(v) => setCategoryId(v)}
            />
            <FilterChips
              options={[
                { value: 'all', label: 'All' },
                { value: 'published', label: 'Published' },
                { value: 'draft', label: 'Draft' },
              ]}
              selected={statusFilter}
              onSelect={(v) => setStatusFilter(v as typeof statusFilter)}
            />
            <Text style={styles.count}>{filtered.length} FAQ(s)</Text>
          </View>

          {filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <AdminEmptyState
                title="No FAQs"
                subtitle="Tap + Add to create one."
                iconName="document-text-outline"
              />
            </View>
          ) : (
            <FlatList
              style={styles.list}
              data={filtered}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  addBtn: { fontSize: 14, fontWeight: '600', color: adminColors.primary, flexShrink: 0 },
  filters: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  count: { fontSize: 12, color: colors.textSecondary },
  list: { flex: 1 },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  emptyWrap: { flex: 1, justifyContent: 'center' },
});
