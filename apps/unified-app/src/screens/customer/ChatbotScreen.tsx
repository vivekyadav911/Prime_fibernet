import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomerButton, CustomerErrorState, CustomerSkeletonLoader } from '@/components/customer/ui';
import { DismissKeyboardFlatList } from '@/components/common';
import { useGetCustomerDashboardQuery, useGetCustomerProfileQuery } from '@/services/api';
import { getSupabase } from '@/services/supabase';
import { useAppSelector } from '@/store/hooks';
import { signalGlass } from '@/theme/customer/signalGlass';

import { ChatBubble, type ChatMessage } from './components/ChatBubble';

let messageSeq = 0;

function nextMessageId(): string {
  messageSeq += 1;
  return `msg-${Date.now()}-${messageSeq}`;
}

const QUICK_REPLIES = [
  'Check my bill',
  'Why is my speed slow?',
  'How to recharge?',
  'Talk to agent',
];

export function ChatbotScreen() {
  const insets = useSafeAreaInsets();
  const authUser = useAppSelector((s) => s.auth.user);
  const { data: profile } = useGetCustomerProfileQuery(undefined, { skip: !authUser });
  const userId = profile?.id ?? authUser?.id ?? '';
  const { data: dashboard } = useGetCustomerDashboardQuery(userId, { skip: !userId });
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([
    {
      id: nextMessageId(),
      role: 'bot',
      text: "Hi! I'm Prima, your Prime Fibernet assistant. How can I help you today?",
    },
  ]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSend = useCallback(
    async (text?: string) => {
      const userMsg = (text ?? message).trim();
      if (!userId || !userMsg) return;
      if (userMsg.toLowerCase().includes('talk to agent')) {
        setHistory((h) => [
          ...h,
          { id: nextMessageId(), role: 'user', text: userMsg },
          {
            id: nextMessageId(),
            role: 'bot',
            text: 'Opening live chat — tap Support → Chat with agent.',
          },
        ]);
        setMessage('');
        return;
      }

      setHistory((h) => [...h, { id: nextMessageId(), role: 'user', text: userMsg }]);
      setMessage('');
      setSending(true);
      setError(null);
      try {
        const client = getSupabase();
        const messages = [...history, { role: 'user', content: userMsg }].map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: 'text' in m ? m.text : '',
        }));

        const { data, error: fnErr } = await client.functions.invoke('ai-support-chat', {
          body: {
            customer_id: userId,
            messages,
            customer_context: {
              plan: dashboard?.subscription?.planName,
              outstanding: dashboard?.outstanding,
              open_tickets: dashboard?.openTickets,
            },
          },
        });
        if (fnErr) throw fnErr;
        const reply = (data as { reply?: string })?.reply ?? 'Sorry, I could not help right now.';
        setHistory((h) => [...h, { id: nextMessageId(), role: 'bot', text: reply }]);
      } catch {
        setError('Prima is unavailable right now. Try again in a moment.');
        setHistory((h) => [
          ...h,
          { id: nextMessageId(), role: 'bot', text: 'Sorry, I could not help right now.' },
        ]);
      } finally {
        setSending(false);
      }
    },
    [dashboard, history, message, userId],
  );

  if (!userId) {
    return (
      <View style={styles.canvas}>
        <CustomerSkeletonLoader rows={3} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.canvas}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 56 : 0}
    >
      {error ? (
        <View style={styles.errorBanner}>
          <CustomerErrorState message={error} onRetry={() => setError(null)} retryLabel="Dismiss" />
        </View>
      ) : null}
      <View style={styles.faqRow}>
        {QUICK_REPLIES.map((q) => (
          <Pressable
            key={q}
            style={styles.faqChip}
            onPress={() => void onSend(q)}
            accessibilityLabel={q}
          >
            <Text style={styles.faqText}>{q}</Text>
          </Pressable>
        ))}
      </View>
      <DismissKeyboardFlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <ChatBubble message={item} />}
      />
      <View style={[styles.composer, { paddingBottom: insets.bottom + signalGlass.spacing.md }]}>
        <TextInput
          style={styles.input}
          placeholder="Ask Prima..."
          placeholderTextColor={signalGlass.colors.textMuted}
          value={message}
          onChangeText={setMessage}
          returnKeyType="send"
          onSubmitEditing={() => void onSend()}
        />
        <CustomerButton
          label={sending ? 'Sending…' : 'Send Reply'}
          onPress={() => void onSend()}
          disabled={sending || !message.trim()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: signalGlass.colors.bgDeep },
  errorBanner: { padding: signalGlass.spacing.sm },
  faqRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: signalGlass.spacing.xs,
    padding: signalGlass.spacing.md,
  },
  faqChip: {
    backgroundColor: signalGlass.colors.bgGlass,
    borderRadius: signalGlass.radius.pill,
    paddingHorizontal: signalGlass.spacing.md,
    paddingVertical: signalGlass.spacing.sm,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
    minHeight: 44,
    justifyContent: 'center',
  },
  faqText: { color: signalGlass.colors.textSecondary, fontSize: 12 },
  list: { padding: signalGlass.spacing.md, paddingBottom: signalGlass.spacing.lg },
  composer: {
    flexDirection: 'row',
    gap: signalGlass.spacing.sm,
    padding: signalGlass.spacing.md,
    borderTopWidth: 1,
    borderTopColor: signalGlass.colors.borderSubtle,
    backgroundColor: signalGlass.colors.bgSurface,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
    borderRadius: signalGlass.radius.sm,
    padding: signalGlass.spacing.sm,
    minHeight: 44,
    color: signalGlass.colors.textPrimary,
    backgroundColor: signalGlass.colors.bgDeep,
  },
});
