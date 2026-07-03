import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTicketTimelineItem } from '@/types/customer';
import type { CustomerTheme } from '@/theme/customer';

type CustomerTicketTimelineProps = {
  items: CustomerTicketTimelineItem[];
  compact?: boolean;
};

function formatTimelineTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function CustomerTicketTimeline({ items, compact }: CustomerTicketTimelineProps) {
  const styles = useThemedStyles(createStyles);

  if (!items.length) return null;

  return (
    <View style={styles.wrap}>
      {!compact ? <Text style={styles.heading}>Timeline</Text> : null}
      {items.map((item, index) => (
        <View key={item.id} style={[styles.row, compact ? styles.rowCompact : null]}>
          <View style={styles.lineCol}>
            <View style={[styles.dot, item.isComplete ? styles.dotComplete : styles.dotPending]} />
            {index < items.length - 1 ? <View style={styles.line} /> : null}
          </View>
          <View style={styles.content}>
            <Text style={[styles.label, compact ? styles.labelCompact : null, !item.isComplete && styles.labelPending]}>
              {item.label}
            </Text>
            <Text style={styles.time}>{formatTimelineTime(item.timestamp)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    wrap: {
      gap: theme.spacing.xs,
    },
    heading: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.bodySemiBold,
      textTransform: 'uppercase',
      marginBottom: theme.spacing.xs,
    },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      minHeight: 44,
    },
    rowCompact: {
      minHeight: 36,
    },
    lineCol: {
      width: 14,
      alignItems: 'center',
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 4,
    },
    dotComplete: {
      backgroundColor: theme.colors.primary,
    },
    dotPending: {
      borderWidth: 2,
      borderColor: theme.colors.textMuted,
      backgroundColor: theme.colors.bgSurface,
    },
    line: {
      flex: 1,
      width: 2,
      backgroundColor: theme.colors.borderSubtle,
      marginTop: 2,
    },
    content: {
      flex: 1,
      paddingBottom: theme.spacing.xs,
    },
    label: {
      ...theme.typography.body,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodyMedium,
      fontSize: 14,
    },
    labelCompact: {
      fontSize: 13,
    },
    labelPending: {
      color: theme.colors.onSurfaceVariant,
    },
    time: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.body,
      fontSize: 11,
      marginTop: 2,
    },
  });
