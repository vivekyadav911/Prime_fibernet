import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { MarkdownText } from '@/components/common';
import { DismissKeyboardScrollView } from '@/components/common';
import {
  CustomerErrorState,
  CustomerSkeletonLoader,
  GlassCard,
} from '@/components/customer/ui';
import {
  useGetFaqsAdminQuery,
  useIncrementFaqViewMutation,
  useVoteFaqHelpfulMutation,
} from '@/services/api/adminSupportApi';
import { signalGlass } from '@/theme/customer/signalGlass';
import type { CustomerStackParamList } from '@/types/navigation';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<CustomerStackParamList, 'CustomerFaqDetail'>;

export function CustomerFaqDetailScreen({ route }: Props) {
  const { faqId } = route.params;
  const { data: faqs, isLoading, isError, error, refetch } = useGetFaqsAdminQuery({ publishedOnly: true });
  const [incrementView] = useIncrementFaqViewMutation();
  const [vote] = useVoteFaqHelpfulMutation();

  const faq = useMemo(() => faqs?.find((f) => f.id === faqId), [faqs, faqId]);

  if (isLoading) {
    return (
      <View style={styles.canvas}>
        <CustomerSkeletonLoader rows={4} />
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

  if (!faq) {
    return (
      <View style={styles.canvas}>
        <CustomerErrorState message="This FAQ could not be found." onRetry={refetch} />
      </View>
    );
  }

  void incrementView(faqId);

  return (
    <View style={styles.canvas}>
      <DismissKeyboardScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.question}>{faq.question}</Text>
        <GlassCard style={styles.answerCard}>
          <MarkdownText>{faq.answer}</MarkdownText>
        </GlassCard>
        <View style={styles.voteRow}>
          <Text style={styles.voteLabel}>Was this helpful?</Text>
          <Pressable
            style={styles.voteBtn}
            onPress={() => void vote({ id: faqId, helpful: true })}
            accessibilityLabel="Yes, helpful"
          >
            <Text style={styles.voteText}>Yes</Text>
          </Pressable>
          <Pressable
            style={styles.voteBtn}
            onPress={() => void vote({ id: faqId, helpful: false })}
            accessibilityLabel="No, not helpful"
          >
            <Text style={styles.voteText}>No</Text>
          </Pressable>
        </View>
      </DismissKeyboardScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: signalGlass.colors.bgDeep },
  scroll: { padding: signalGlass.spacing.lg, paddingBottom: signalGlass.spacing.xxxl },
  question: {
    fontSize: 20,
    fontWeight: '700',
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.display,
    marginBottom: signalGlass.spacing.md,
  },
  answerCard: { marginBottom: signalGlass.spacing.lg },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: signalGlass.spacing.md,
    marginTop: signalGlass.spacing.lg,
    flexWrap: 'wrap',
  },
  voteLabel: { fontSize: 14, color: signalGlass.colors.textSecondary },
  voteBtn: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: signalGlass.spacing.md,
    justifyContent: 'center',
    backgroundColor: signalGlass.colors.bgSurface,
    borderRadius: signalGlass.radius.sm,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
  },
  voteText: { fontSize: 14, color: signalGlass.colors.textPrimary, fontWeight: '600', textAlign: 'center' },
});
