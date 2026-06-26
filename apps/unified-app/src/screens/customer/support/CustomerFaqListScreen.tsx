import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  CustomerEmptyState,
  CustomerErrorState,
  CustomerSkeletonLoader,
  GlassCard,
  PressableScale,
} from '@/components/customer/ui';
import { useGetFaqsAdminQuery, useGetFaqCategoriesQuery } from '@/services/api/adminSupportApi';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerStackParamList } from '@/types/navigation';
import type { Faq } from '@/types/support';
import type { CustomerTheme } from '@/theme/customer';
import { queryErrorMessage } from '@/utils/queryError';
import { DismissKeyboardFlatList } from '@/components/common';

type Props = NativeStackScreenProps<CustomerStackParamList, 'CustomerFaqList'>;

export function CustomerFaqListScreen({ navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const { data: faqs, isLoading, isError, error, refetch } = useGetFaqsAdminQuery({ publishedOnly: true });
  const { data: categories } = useGetFaqCategoriesQuery();

  const renderItem = useCallback(
    ({ item }: { item: Faq }) => {
      const category = categories?.find((c) => c.id === item.categoryId);
      return (
        <PressableScale
          style={styles.cardWrap}
          onPress={() => navigation.navigate('CustomerFaqDetail', { faqId: item.id })}
          accessibilityLabel={item.question}
        >
          <GlassCard style={styles.card}>
            {category ? <Text style={styles.category}>{category.name}</Text> : null}
            <Text style={styles.question}>{item.question}</Text>
          </GlassCard>
        </PressableScale>
      );
    },
    [navigation, categories, styles],
  );

  if (isLoading) {
    return (
      <View style={styles.canvas}>
        <CustomerSkeletonLoader rows={5} rowHeight={72} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.canvas}>
        <CustomerErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={styles.canvas}>
      <DismissKeyboardFlatList
        data={faqs ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <CustomerEmptyState title="No FAQs available" subtitle="Check back later for help articles" icon="❓" />
        }
      />
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    canvas: { flex: 1, backgroundColor: theme.colors.bgDeep },
    list: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl },
    cardWrap: { marginBottom: theme.spacing.sm },
    card: { gap: theme.spacing.xs },
    category: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.accentGlow,
      textTransform: 'uppercase',
    },
    question: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.bodyMedium,
    },
  });
