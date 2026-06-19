import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CustomerBadge, GlassCard } from '@/components/customer/ui';
import { signalGlass } from '@/theme/customer/signalGlass';
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
  if (!items.length) return null;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent activity</Text>
        <Pressable onPress={onViewAll} accessibilityLabel="View all activity">
          <Text style={styles.link}>View all</Text>
        </Pressable>
      </View>
      {items.map((item) => (
        <View key={item.id} style={styles.row}>
          <Text style={styles.icon}>{icons[item.kind]}</Text>
          <View style={styles.body}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.date}>{formatRelativeIst(item.date)}</Text>
          </View>
          <View style={styles.right}>
            {item.amount != null ? (
              <Text style={styles.amount}>{formatCurrencyInr(item.amount)}</Text>
            ) : null}
            <CustomerBadge label={item.status} tone={statusTone(item.status)} />
          </View>
        </View>
      ))}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: signalGlass.spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: signalGlass.spacing.md,
  },
  title: {
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.display,
    fontSize: 16,
    fontWeight: '700',
  },
  link: {
    color: signalGlass.colors.accentGlow,
    fontFamily: signalGlass.fonts.bodyMedium,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: signalGlass.spacing.sm,
    paddingVertical: signalGlass.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: signalGlass.colors.borderSubtle,
  },
  icon: { fontSize: 20 },
  body: { flex: 1 },
  rowTitle: {
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.bodyMedium,
    fontSize: 14,
  },
  date: {
    color: signalGlass.colors.textMuted,
    fontFamily: signalGlass.fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: {
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.mono,
    fontSize: 13,
  },
});
