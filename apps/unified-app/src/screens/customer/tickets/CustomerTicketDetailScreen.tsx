import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CustomerButton,
  CustomerErrorState,
  CustomerInput,
  CustomerSkeletonLoader,
} from '@/components/customer/ui';
import { CustomerFontProvider } from '@/components/customer/CustomerFontProvider';
import { DismissKeyboardFlatList } from '@/components/common';
import {
  useGetTicketMessagesQuery,
  useSendTicketReplyMutation,
} from '@/services/api/customerTicketsApi';
import { signalGlass } from '@/theme/customer/signalGlass';
import type { CustomerStackParamList } from '@/types/navigation';
import { formatRelativeIst } from '@/utils/formatDate';

type Props = NativeStackScreenProps<CustomerStackParamList, 'CustomerTicketDetail'>;

function TicketDetailContent({ route }: Props) {
  const insets = useSafeAreaInsets();
  const { ticketId } = route.params;
  const { data: messages, isLoading, error, refetch } = useGetTicketMessagesQuery(ticketId);
  const [sendReply, { isLoading: sending }] = useSendTicketReplyMutation();
  const [text, setText] = useState('');

  const onSend = async () => {
    if (!text.trim()) return;
    await sendReply({ ticketId, message: text.trim() }).unwrap();
    setText('');
  };

  if (isLoading) {
    return (
      <View style={styles.canvas}>
        <CustomerSkeletonLoader rows={4} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.canvas}>
        <CustomerErrorState message="Could not load messages. Try again." onRetry={refetch} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.canvas}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 56 : 0}
    >
      <DismissKeyboardFlatList
        style={styles.list}
        data={messages ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.senderType === 'customer' ? styles.customerBubble : styles.agentBubble,
            ]}
          >
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.time}>{formatRelativeIst(item.createdAt)}</Text>
          </View>
        )}
      />
      <View style={[styles.composer, { paddingBottom: insets.bottom + signalGlass.spacing.md }]}>
        <CustomerInput
          value={text}
          onChangeText={setText}
          placeholder="Write a reply..."
          style={styles.input}
        />
        <CustomerButton
          label={sending ? 'Sending…' : 'Send Reply'}
          onPress={() => void onSend()}
          disabled={sending || !text.trim()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

export function CustomerTicketDetailScreen(props: Props) {
  return (
    <CustomerFontProvider>
      <TicketDetailContent {...props} />
    </CustomerFontProvider>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: signalGlass.colors.bgDeep },
  list: { flex: 1 },
  listContent: { padding: signalGlass.spacing.lg },
  bubble: {
    maxWidth: '85%',
    borderRadius: signalGlass.radius.md,
    padding: signalGlass.spacing.md,
    marginBottom: signalGlass.spacing.sm,
  },
  customerBubble: {
    alignSelf: 'flex-end',
    backgroundColor: signalGlass.colors.accentPrimaryMuted,
  },
  agentBubble: {
    alignSelf: 'flex-start',
    backgroundColor: signalGlass.colors.bgGlass,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
  },
  message: { color: signalGlass.colors.textPrimary, fontSize: 14 },
  time: { color: signalGlass.colors.textMuted, fontSize: 10, marginTop: 4 },
  composer: {
    padding: signalGlass.spacing.lg,
    backgroundColor: signalGlass.colors.bgSurface,
    borderTopWidth: 1,
    borderTopColor: signalGlass.colors.borderSubtle,
    gap: signalGlass.spacing.sm,
  },
  input: { marginBottom: 0 },
});
