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
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerStackParamList } from '@/types/navigation';
import type { CustomerTheme } from '@/theme/customer';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<CustomerStackParamList, 'CustomerFaqDetail'>;

export function CustomerFaqDetailScreen({ route }: Props) {
  const styles = useThemedStyles(createStyles);
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

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    canvas: { flex: 1, backgroundColor: theme.colors.bgDeep },
    scroll: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl },
    question: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.display,
      marginBottom: theme.spacing.md,
    },
    answerCard: { marginBottom: theme.spacing.lg },
    voteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      marginTop: theme.spacing.lg,
      flexWrap: 'wrap',
    },
    voteLabel: { fontSize: 14, color: theme.colors.textSecondary },
    voteBtn: {
      minHeight: 44,
      minWidth: 44,
      paddingHorizontal: theme.spacing.md,
      justifyContent: 'center',
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
    },
    voteText: { fontSize: 14, color: theme.colors.textPrimary, fontWeight: '600', textAlign: 'center' },
  });
