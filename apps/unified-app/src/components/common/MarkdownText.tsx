import { useMemo } from 'react';
import { Linking, StyleSheet, Text, View, type TextStyle } from 'react-native';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'code'; value: string }
  | { type: 'link'; label: string; url: string };

function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    if (match[2]) tokens.push({ type: 'bold', value: match[2] });
    else if (match[3]) tokens.push({ type: 'italic', value: match[3] });
    else if (match[4]) tokens.push({ type: 'code', value: match[4] });
    else if (match[5] && match[6]) tokens.push({ type: 'link', label: match[5], url: match[6] });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', value: text }];
}

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: 'list', items: listItems });
      listItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch?.[1] && headingMatch[2]) {
      flushList();
      blocks.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2] });
      continue;
    }

    const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (listMatch?.[1]) {
      listItems.push(listMatch[1]);
      continue;
    }

    flushList();
    blocks.push({ type: 'paragraph', text: trimmed });
  }

  flushList();
  return blocks;
}

function InlineText({ text, baseStyle }: { text: string; baseStyle: TextStyle }) {
  const tokens = useMemo(() => tokenizeInline(text), [text]);

  return (
    <Text style={baseStyle}>
      {tokens.map((token, index) => {
        switch (token.type) {
          case 'bold':
            return (
              <Text key={index} style={styles.bold}>
                {token.value}
              </Text>
            );
          case 'italic':
            return (
              <Text key={index} style={styles.italic}>
                {token.value}
              </Text>
            );
          case 'code':
            return (
              <Text key={index} style={styles.code}>
                {token.value}
              </Text>
            );
          case 'link':
            return (
              <Text
                key={index}
                style={styles.link}
                onPress={() => void Linking.openURL(token.url)}
              >
                {token.label}
              </Text>
            );
          default:
            return token.value;
        }
      })}
    </Text>
  );
}

type MarkdownTextProps = {
  children: string;
};

export function MarkdownText({ children }: MarkdownTextProps) {
  const blocks = useMemo(() => parseBlocks(children), [children]);

  if (!children.trim()) return null;

  return (
    <View style={styles.container}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'heading':
            return (
              <InlineText
                key={index}
                text={block.text}
                baseStyle={block.level === 1 ? styles.h1 : block.level === 2 ? styles.h2 : styles.h3}
              />
            );
          case 'list':
            return (
              <View key={index} style={styles.list}>
                {block.items.map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.listItem}>
                    <Text style={styles.bullet}>•</Text>
                    <InlineText text={item} baseStyle={styles.paragraph} />
                  </View>
                ))}
              </View>
            );
          default:
            return <InlineText key={index} text={block.text} baseStyle={styles.paragraph} />;
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  h1: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  h2: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  h3: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  code: {
    fontFamily: 'Courier',
    backgroundColor: colors.borderDefault,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  link: {
    color: colors.primaryNavy,
    textDecorationLine: 'underline',
    fontSize: 15,
  },
  list: {
    gap: spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
});
