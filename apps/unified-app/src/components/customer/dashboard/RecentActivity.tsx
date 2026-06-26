import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CustomerBadge, CustomerEmptyState, GlassCard } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';
import { formatRelativeIst } from '@/utils/formatDate';
import { formatCurrencyInr } from '@/utils/formatCurrency';

export type ActivityItem = {
  id: string;
  kind: 'payment' | 'ticket' | 'plan';
  title: string;
  date: string;
  status: string;
  amount?: number;
};

type RecentActivityProps = {
  items: ActivityItem[];
  onViewAll: () => void;
};

const icons: Record<ActivityItem['kind'], string> = {
  payment: '💳',
  ticket: '🎫',
  plan: '📦',
};

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  const s = status.toLowerCase();
  if (s.includes('paid') || s.includes('confirmed') || s.includes('resolved')) return 'success';
  if (s.includes('pending') || s.includes('open') || s.includes('progress')) return 'warning';
  if (s.includes('fail') || s.includes('overdue')) return 'danger';
  return 'neutral';
}

export function RecentActivity({ items, onViewAll }: RecentActivityProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent activity</Text>
        {items.length > 0 ? (
          <Pressable onPress={onViewAll} accessibilityLabel="View all activity" hitSlop={8}>
            <Text style={styles.link}>View all</Text>
          </Pressable>
        ) : null}
      </View>
      {items.length === 0 ? (
        <CustomerEmptyState
          title="No recent activity"
          subtitle="Payments and updates will show up here"
          actionLabel="View payment history"
          onAction={onViewAll}
          icon="📋"
        />
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.icon}>{icons[item.kind]}</Text>
            <View style={styles.body}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.date}>{formatRelativeIst(item.date)}</Text>
            </View>
            <View style={styles.right}>
              {item.amount != null ? (
                <Text style={styles.amount}>{formatCurrencyInr(item.amount)}</Text>
              ) : null}
              <CustomerBadge label={item.status} tone={statusTone(item.status)} />
            </View>
          </View>
        ))
      )}
    </GlassCard>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    card: { marginBottom: theme.spacing.lg },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.display,
      fontSize: 16,
      fontWeight: '700',
    },
    link: {
      color: theme.colors.accentGlow,
      fontFamily: theme.fonts.bodyMedium,
      fontSize: 13,
      minHeight: 44,
      lineHeight: 44,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderSubtle,
    },
    icon: { fontSize: 20 },
    body: { flex: 1, minWidth: 0 },
    rowTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.bodyMedium,
      fontSize: 14,
    },
    date: {
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.body,
      fontSize: 12,
      marginTop: 2,
    },
    right: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
    amount: {
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.mono,
      fontSize: 13,
    },
  });
