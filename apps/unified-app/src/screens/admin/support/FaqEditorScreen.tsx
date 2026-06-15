import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, Button } from '@prime/ui';

import { RoleGuard, SelectField } from '@/components/admin';
import { MarkdownText, SkeletonLoader } from '@/components/common';
import {
  useGetFaqsAdminQuery,
  useGetFaqCategoriesQuery,
  useUpsertFaqMutation,
} from '@/services/api/adminSupportApi';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminSupportStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<AdminSupportStackParamList, 'FaqEditor'>;
type Tab = 'edit' | 'preview';

export function FaqEditorScreen({ route, navigation }: Props) {
  const faqId = route.params?.faqId;
  const [tab, setTab] = useState<Tab>('edit');
  const [categoryId, setCategoryId] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [tags, setTags] = useState('');

  const { data: categories } = useGetFaqCategoriesQuery();
  const { data: faqs } = useGetFaqsAdminQuery();
  const [upsertFaq, { isLoading }] = useUpsertFaqMutation();

  useEffect(() => {
    if (!faqId || !faqs) return;
    const faq = faqs.find((f) => f.id === faqId);
    if (!faq) return;
    setCategoryId(faq.categoryId ?? '');
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setIsPublished(faq.isPublished);
    setIsFeatured(faq.isFeatured);
    setTags(faq.tags.join(', '));
  }, [faqId, faqs]);

  const onSave = async () => {
    if (!categoryId || !question.trim() || !answer.trim()) {
      Alert.alert('Validation', 'Category, question, and answer are required.');
      return;
    }
    try {
      await upsertFaq({
        id: faqId,
        data: {
          categoryId,
          question: question.trim(),
          answer: answer.trim(),
          isPublished,
          isFeatured,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          sortOrder: faqs?.length ?? 0,
        },
      }).unwrap();
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
    }
  };

  if (!categories) return <Screen><SkeletonLoader rows={4} /></Screen>;

  return (
    <RoleGuard requiredPermission="settings.view">
      <Screen style={styles.screen} safeAreaTop={false}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <SelectField
              label="Category"
              value={categoryId}
              options={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
              onSelect={setCategoryId}
            />

            <Text style={styles.label}>Question</Text>
            <TextInput style={styles.input} value={question} onChangeText={setQuestion} />

            <View style={styles.tabs}>
              <Pressable style={[styles.tab, tab === 'edit' && styles.tabActive]} onPress={() => setTab('edit')}>
                <Text style={styles.tabText}>Edit</Text>
              </Pressable>
              <Pressable style={[styles.tab, tab === 'preview' && styles.tabActive]} onPress={() => setTab('preview')}>
                <Text style={styles.tabText}>Preview</Text>
              </Pressable>
            </View>

            {tab === 'edit' ? (
              <TextInput
                style={[styles.input, styles.answer]}
                value={answer}
                onChangeText={setAnswer}
                multiline
                placeholder="Markdown answer…"
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <View style={styles.preview}>
                <MarkdownText>{answer}</MarkdownText>
              </View>
            )}

            <Text style={styles.label}>Tags (comma-separated)</Text>
            <TextInput style={styles.input} value={tags} onChangeText={setTags} />

            <View style={styles.toggles}>
              <Pressable style={styles.toggleRow} onPress={() => setIsFeatured(!isFeatured)}>
                <Text style={styles.toggleLabel}>Featured</Text>
                <Text style={styles.toggleValue}>{isFeatured ? 'Yes' : 'No'}</Text>
              </Pressable>
              <Pressable style={styles.toggleRow} onPress={() => setIsPublished(!isPublished)}>
                <Text style={styles.toggleLabel}>Published</Text>
                <Text style={styles.toggleValue}>{isPublished ? 'Yes' : 'No'}</Text>
              </Pressable>
            </View>

            <Button label={isLoading ? 'Saving…' : 'Save'} onPress={() => void onSave()} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: adminColors.canvasBg, flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 8,
    padding: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  answer: { minHeight: 160, textAlignVertical: 'top' },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 8, backgroundColor: colors.borderDefault },
  tabActive: { backgroundColor: adminColors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  preview: {
    minHeight: 160,
    backgroundColor: colors.surfaceWhite,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  toggles: { gap: spacing.sm, marginBottom: spacing.md },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.sm, backgroundColor: colors.surfaceWhite, borderRadius: 8 },
  toggleLabel: { fontSize: 14, color: colors.textPrimary },
  toggleValue: { fontSize: 14, fontWeight: '600', color: adminColors.primary },
});
