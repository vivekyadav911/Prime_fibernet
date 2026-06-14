import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type NotificationPreviewCardProps = {
  title: string;
  message: string;
};

export function NotificationPreviewCard({ title, message }: NotificationPreviewCardProps) {
  return (
    <View style={styles.phone}>
      <View style={styles.notification}>
        <Text style={styles.appName}>🔔 Prime Fibernet</Text>
        <Text style={styles.title}>{title.trim() || 'Title appears here'}</Text>
        <Text style={styles.message} numberOfLines={3}>
          {message.trim() || 'Message preview, truncated...'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  phone: {
    backgroundColor: '#F3F4F6',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  notification: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.sm,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  appName: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  title: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  message: { fontSize: 14, color: colors.textSecondary, marginTop: 4, lineHeight: 20 },
});
