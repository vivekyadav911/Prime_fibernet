import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@prime/ui';

export type ChatMessage = {
  id: string;
  role: 'user' | 'bot';
  text: string;
};

type ChatBubbleProps = {
  message: ChatMessage;
};

export const ChatBubble = React.memo(function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubble, isUser ? styles.user : styles.bot]}>
      <Text style={isUser ? styles.userText : styles.botText}>{message.text}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  bubble: { padding: 12, borderRadius: 12, marginBottom: 8, maxWidth: '85%' },
  user: { alignSelf: 'flex-end', backgroundColor: colors.primaryNavy },
  bot: { alignSelf: 'flex-start', backgroundColor: colors.background },
  userText: { color: colors.white },
  botText: { color: colors.textPrimary },
});
