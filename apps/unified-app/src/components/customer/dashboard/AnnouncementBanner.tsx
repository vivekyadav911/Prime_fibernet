import { ScrollView, StyleSheet, Text } from 'react-native';

import { GlassCard } from '@/components/customer/ui';
import type { PortalNotification } from '@/types/payments';
import { signalGlass } from '@/theme/customer/signalGlass';

type AnnouncementBannerProps = {
  items: PortalNotification[];
};

export function AnnouncementBanner({ items }: AnnouncementBannerProps) {
  const announcements = items.filter((n) => n.category === 'outage' || n.category === 'promo');
  if (!announcements.length) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {announcements.map((item) => (
        <GlassCard key={item.id} style={styles.card}>
          <Text style={styles.tag}>{item.category === 'outage' ? 'OUTAGE' : 'PROMO'}</Text>
          <Text style={styles.title}>{item.title}</Text>
          {item.body ? (
            <Text style={styles.body} numberOfLines={2}>
              {item.body}
            </Text>
          ) : null}
        </GlassCard>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: signalGlass.spacing.sm, marginBottom: signalGlass.spacing.lg },
  card: { width: 260 },
  tag: {
    color: signalGlass.colors.accentWarning,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: signalGlass.spacing.xs,
  },
  title: {
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.bodyMedium,
    fontSize: 14,
    fontWeight: '600',
  },
  body: {
    color: signalGlass.colors.textSecondary,
    fontFamily: signalGlass.fonts.body,
    fontSize: 12,
    marginTop: signalGlass.spacing.xs,
  },
});
