import { StyleSheet, Text, View } from 'react-native';

import { AdminEmptyState, StatusBadge } from '@/components/admin';
import type { RecentActivity } from '@/types/api/admin';

import { dash } from '../dashboardUi';

type RecentActivitiesSectionProps = {
  activities: RecentActivity[] | undefined;
};

export function RecentActivitiesSection({ activities }: RecentActivitiesSectionProps) {
  if (!activities?.length) {
    return <AdminEmptyState title="No recent activity" icon="📋" />;
  }

  return (
    <View>
      {activities.map((item, index) => (
        <View key={item.id}>
          <View style={styles.row}>
            <View style={styles.copy}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.desc} numberOfLines={2}>
                {item.description}
              </Text>
              <Text style={styles.time}>
                {new Date(item.timestamp).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <StatusBadge status={item.status} />
          </View>
          {index < activities.length - 1 ? <View style={styles.divider} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    minHeight: dash.touch,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: dash.text,
  },
  desc: {
    fontSize: 13,
    fontWeight: '500',
    color: dash.textSecondary,
    lineHeight: 18,
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
    color: dash.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: dash.border,
  },
});
