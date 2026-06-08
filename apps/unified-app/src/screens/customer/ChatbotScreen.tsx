import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Screen, colors } from '@prime/ui';

import { ErrorState, SkeletonLoader } from '@/components/common';
import { useAppSelector } from '@/store/hooks';
import { useGetFaqsQuery, useSendChatMessageMutation } from '@/store/api/endpoints';
import { queryErrorMessage } from '@/utils/queryError';

import { ChatBubble, type ChatMessage } from './components/ChatBubble';

let messageSeq = 0;

function nextMessageId(): string {
  messageSeq += 1;
  return `msg-${Date.now()}-${messageSeq}`;
}

export function ChatbotScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: faqs, isLoading: faqsLoading, isError: faqsError, error: faqsErr, refetch: refetchFaqs } = useGetFaqsQuery();
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [sendMessage, { isLoading: sending }] = useSendChatMessageMutation();

  const onSend = useCallback(
    async (text?: string) => {
      const userMsg = (text ?? message).trim();
      if (!user || !userMsg) return;
      setHistory((h) => [...h, { id: nextMessageId(), role: 'user', text: userMsg }]);
      setMessage('');
      try {
        const result = await sendMessage({ message: userMsg, userId: user.id }).unwrap();
        setHistory((h) => [...h, { id: nextMessageId(), role: 'bot', text: result.reply }]);
      } catch {
        setHistory((h) => [
          ...h,
          { id: nextMessageId(), role: 'bot', text: 'Sorry, I could not help right now.' },
        ]);
      }
    },
    [message, sendMessage, user],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => <ChatBubble message={item} />,
    [],
  );

  if (faqsLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={4} />
      </Screen>
    );
  }

  if (faqsError) {
    return (
      <Screen>
        <ErrorState message={queryErrorMessage(faqsErr)} onRetry={refetchFaqs} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      {faqs?.length ? (
        <View style={styles.faqRow}>
          {faqs.slice(0, 4).map((faq) => (
            <Pressable key={faq.id} style={styles.faqChip} onPress={() => onSend(faq.question)}>
              <Text style={styles.faqText}>{faq.question}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <FlatList
        data={history}
        keyExtractor={keyExtractor}
        contentContainerStyle={[styles.list, !history.length && styles.listEmpty]}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>Ask me anything about your plan</Text>
            <Text style={styles.emptySubtitle}>Billing, upgrades, outages, and more</Text>
          </View>
        }
        renderItem={renderItem}
      />
      <View style={styles.composer}>
        <TextInput style={styles.input} value={message} onChangeText={setMessage} placeholder="Ask a question…" />
        <Button label={sending ? '…' : 'Send'} onPress={() => onSend()} disabled={sending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  faqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  faqChip: { backgroundColor: colors.background, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  faqText: { fontSize: 12, color: colors.primaryNavy },
  list: { padding: 16, flexGrow: 1 },
  listEmpty: { flex: 1, justifyContent: 'center' },
  emptyChat: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { marginTop: 8, fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  composer: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderColor: colors.borderDefault },
  input: { flex: 1, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 8, padding: 8 },
});
