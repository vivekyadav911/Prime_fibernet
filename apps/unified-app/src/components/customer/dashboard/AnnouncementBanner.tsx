import { ScrollView, StyleSheet, Text } from 'react-native';

import { GlassCard } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { PortalNotification } from '@/types/payments';
import type { CustomerTheme } from '@/theme/customer';

type AnnouncementBannerProps = {
  items: PortalNotification[];
};

export function AnnouncementBanner({ items }: AnnouncementBannerProps) {
  const styles = useThemedStyles(createStyles);
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

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    row: { gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
    card: { width: 260 },
    tag: {
      color: theme.colors.accentWarning,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
      marginBottom: theme.spacing.xs,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.bodyMedium,
      fontSize: 14,
      fontWeight: '600',
    },
    body: {
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.body,
      fontSize: 12,
      marginTop: theme.spacing.xs,
    },
  });
