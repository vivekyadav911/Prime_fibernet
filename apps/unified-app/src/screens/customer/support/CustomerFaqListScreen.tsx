import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetFaqsAdminQuery, useGetFaqCategoriesQuery } from '@/services/api/adminSupportApi';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { CustomerStackParamList } from '@/types/navigation';
import type { Faq } from '@/types/support';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<CustomerStackParamList, 'CustomerFaqList'>;

export function CustomerFaqListScreen({ navigation }: Props) {
  const { data: faqs, isLoading, isError, error, refetch } = useGetFaqsAdminQuery({ publishedOnly: true });
  const { data: categories } = useGetFaqCategoriesQuery();

  const renderItem = useCallback(
    ({ item }: { item: Faq }) => {
      const category = categories?.find((c) => c.id === item.categoryId);
      return (
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate('CustomerFaqDetail', { faqId: item.id })}
        >
          {category ? <Text style={styles.category}>{category.name}</Text> : null}
          <Text style={styles.question}>{item.question}</Text>
        </Pressable>
      );
    },
    [navigation, categories],
  );

  if (isLoading) return <Screen><SkeletonLoader rows={5} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <Screen style={styles.screen}>
      <FlatList
        data={faqs ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No FAQs available</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  list: { padding: spacing.md },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  category: { fontSize: 11, fontWeight: '700', color: colors.primaryNavy, marginBottom: 4 },
  question: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  empty: { textAlign: 'center', color: colors.textSecondary, padding: spacing.xl },
});
