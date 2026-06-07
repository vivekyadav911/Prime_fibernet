import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Screen, colors } from '@prime/ui';

import { useAppSelector } from '@/store/hooks';
import { useSendChatMessageMutation } from '@/store/api/endpoints';

export function ChatbotScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<{ role: 'user' | 'bot'; text: string }[]>([]);
  const [sendMessage, { isLoading }] = useSendChatMessageMutation();

  const onSend = async () => {
    if (!user || !message.trim()) return;
    const userMsg = message.trim();
    setHistory((h) => [...h, { role: 'user', text: userMsg }]);
    setMessage('');
    try {
      const result = await sendMessage({ message: userMsg, userId: user.id }).unwrap();
      setHistory((h) => [...h, { role: 'bot', text: result.reply }]);
    } catch {
      setHistory((h) => [...h, { role: 'bot', text: 'Sorry, I could not help right now.' }]);
    }
  };

  return (
    <Screen padded={false}>
      <FlatList
        data={history}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.user : styles.bot]}>
            <Text style={item.role === 'user' ? styles.userText : styles.botText}>{item.text}</Text>
          </View>
        )}
      />
      <View style={styles.composer}>
        <TextInput style={styles.input} value={message} onChangeText={setMessage} placeholder="Ask a question…" />
        <Button label={isLoading ? '…' : 'Send'} onPress={onSend} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, flexGrow: 1 },
  bubble: { padding: 12, borderRadius: 12, marginBottom: 8, maxWidth: '85%' },
  user: { alignSelf: 'flex-end', backgroundColor: colors.primaryNavy },
  bot: { alignSelf: 'flex-start', backgroundColor: colors.background },
  userText: { color: colors.white },
  botText: { color: colors.textPrimary },
  composer: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderColor: colors.borderDefault },
  input: { flex: 1, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 8, padding: 8 },
});
