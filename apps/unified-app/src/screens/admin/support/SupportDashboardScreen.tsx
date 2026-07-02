import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigationProp } from '@react-navigation/native';

import {
  AgentStatusToggle,
  SupportQuickActions,
} from '@/components/support';
import { TicketPortalSummaryCard } from '@/components/TicketPortal/TicketPortalSummaryCard';
import { AdminScreenLayout, RoleGuard, SectionCard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useAgentAvailability } from '@/hooks/useAgentAvailability';
import { useChatSession } from '@/hooks/useChatSession';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminDrawerParamList, AdminSupportStackParamList } from '@/types/navigation';
import { useAppSelector } from '@/store/hooks';

type Props = NativeStackScreenProps<AdminSupportStackParamList, 'SupportDashboard'>;

const QUICK_ACTIONS = [
  { label: 'New Ticket', route: 'CreateTicket' as const, icon: 'ticket-outline' as const },
  { label: 'Live Chat', route: 'LiveChat' as const, icon: 'chatbubbles-outline' as const },
  { label: 'FAQs', route: 'FaqList' as const, icon: 'help-circle-outline' as const },
  { label: 'Analytics', route: 'SupportAnalytics' as const, icon: 'bar-chart-outline' as const },
  { label: 'SLA Config', route: 'SlaConfig' as const, icon: 'settings-outline' as const },
  { label: 'Canned', route: 'CannedResponses' as const, icon: 'document-text-outline' as const },
];

export function SupportDashboardScreen({ navigation }: Props) {
  const drawerNav = navigation.getParent<NavigationProp<AdminDrawerParamList>>();
  const authUserId = useAppSelector((s) => s.auth.user?.id ?? null);
  const { status, updateStatus, loading: statusLoading } = useAgentAvailability(authUserId);
  const { waitingCount } = useChatSession();

  const quickActions = useMemo(
    () =>
      QUICK_ACTIONS.map((a) => ({
        label: a.label,
        icon: a.icon,
        onPress: () => navigation.navigate(a.route),
      })),
    [navigation],
  );

  if (statusLoading && !status) {
    return (
      <AdminScreenLayout>
        <SkeletonLoader rows={6} />
      </AdminScreenLayout>
    );
  }

  return (
    <RoleGuard requiredPermission="settings.view">
      <AdminScreenLayout>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.pageHeader}>
            <Text style={styles.title}>Customer Support</Text>
            {waitingCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{waitingCount} waiting</Text>
              </View>
            ) : null}
          </View>

          <SectionCard title="Agent Status">
            <AgentStatusToggle status={status} onChange={updateStatus} loading={statusLoading} />
          </SectionCard>

          <TicketPortalSummaryCard
            onPress={() => drawerNav?.navigate('TicketPortal')}
          />

          <SectionCard title="Quick Actions">
            <SupportQuickActions actions={quickActions} />
          </SectionCard>
        </ScrollView>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  badge: {
    backgroundColor: adminColors.badgeDanger,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: '700' },
});
