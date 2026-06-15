import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { ErrorState, MarkdownText, SkeletonLoader } from '@/components/common';
import {
  useGetFaqsAdminQuery,
  useIncrementFaqViewMutation,
  useVoteFaqHelpfulMutation,
} from '@/services/api/adminSupportApi';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { CustomerStackParamList } from '@/types/navigation';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<CustomerStackParamList, 'CustomerFaqDetail'>;

export function CustomerFaqDetailScreen({ route }: Props) {
  const { faqId } = route.params;
  const { data: faqs, isLoading, isError, error, refetch } = useGetFaqsAdminQuery({ publishedOnly: true });
  const [incrementView] = useIncrementFaqViewMutation();
  const [vote] = useVoteFaqHelpfulMutation();

  const faq = useMemo(() => faqs?.find((f) => f.id === faqId), [faqs, faqId]);

  if (isLoading) return <Screen><SkeletonLoader rows={4} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;
  if (!faq) return <Screen><ErrorState message="FAQ not found" onRetry={refetch} /></Screen>;

  void incrementView(faqId);

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.question}>{faq.question}</Text>
        <MarkdownText>{faq.answer}</MarkdownText>
        <View style={styles.voteRow}>
          <Text style={styles.voteLabel}>Was this helpful?</Text>
          <Pressable style={styles.voteBtn} onPress={() => void vote({ id: faqId, helpful: true })}>
            <Text style={styles.voteText}>👍 Yes</Text>
          </Pressable>
          <Pressable style={styles.voteBtn} onPress={() => void vote({ id: faqId, helpful: false })}>
            <Text style={styles.voteText}>👎 No</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  scroll: { padding: spacing.md },
  question: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  voteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  voteLabel: { fontSize: 14, color: colors.textSecondary },
  voteBtn: { padding: spacing.sm, backgroundColor: colors.surfaceWhite, borderRadius: 8, borderWidth: 1, borderColor: colors.borderDefault },
  voteText: { fontSize: 14, color: colors.textPrimary },
});
