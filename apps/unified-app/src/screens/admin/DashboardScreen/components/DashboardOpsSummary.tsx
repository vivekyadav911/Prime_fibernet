import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';

import type { AdminDrawerParamList } from '@/types/navigation';
import { formatINR } from '@/utils/planUtils';

import { dash } from '../dashboardUi';
import { DashboardCard } from './ui/DashboardPrimitives';

type RequestSummary = { pending: number; unassigned: number };
type PlanStats = {
  totalPlans: number;
  activePlansCount: number;
  totalPotentialMonthlyRevenue: number;
};
type TicketSummary = {
  open: number;
  inProgress: number;
  resolved: number;
  breached: number;
  unassigned: number;
};

type DashboardOpsSummaryProps = {
  requestSummary: RequestSummary;
  planStats: PlanStats;
  ticketSummary: TicketSummary;
  navigation: DrawerNavigationProp<AdminDrawerParamList>;
};

type ColumnProps = {
  title: string;
  metrics: { value: string | number; label: string; warn?: boolean }[];
  status?: string;
  statusTone?: 'success' | 'warning' | 'danger';
  onPress: () => void;
  showDivider?: boolean;
};

function OpsColumn({ title, metrics, status, statusTone, onPress, showDivider }: ColumnProps) {
  const statusColor =
    statusTone === 'danger' ? dash.danger : statusTone === 'warning' ? dash.warning : dash.success;

  return (
    <>
      {showDivider ? <View style={styles.divider} /> : null}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.column, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <Text style={styles.colTitle}>{title}</Text>
        {metrics.map((m) => (
          <View key={m.label} style={styles.metric}>
            <Text style={[styles.metricValue, m.warn && styles.metricWarn]}>{m.value}</Text>
            <Text style={styles.metricLabel}>{m.label}</Text>
          </View>
        ))}
        {status ? (
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]} numberOfLines={1}>
              {status}
            </Text>
          </View>
        ) : null}
        <View style={styles.ctaRow}>
          <Text style={styles.ctaText}>Open</Text>
          <Ionicons name="chevron-forward" size={14} color={dash.brand} />
        </View>
      </Pressable>
    </>
  );
}

export function DashboardOpsSummary({
  requestSummary,
  planStats,
  ticketSummary,
  navigation,
}: DashboardOpsSummaryProps) {
  const requestStatus =
    requestSummary.unassigned > 0
      ? `${requestSummary.unassigned} unassigned`
      : requestSummary.pending > 0
        ? 'In progress'
        : 'Clear';

  const ticketStatus =
    ticketSummary.breached > 0
      ? `${ticketSummary.breached} SLA breached`
      : ticketSummary.unassigned > 0
        ? `${ticketSummary.unassigned} unassigned`
        : ticketSummary.open > 0
          ? `${ticketSummary.open} open`
          : 'Healthy';

  return (
    <DashboardCard padding={dash.compactPad}>
      <View style={styles.row}>
        <OpsColumn
          title="Requests"
          metrics={[
            { value: requestSummary.pending, label: 'Pending' },
            { value: requestSummary.unassigned, label: 'Unassigned', warn: requestSummary.unassigned > 0 },
          ]}
          status={requestStatus}
          statusTone={requestSummary.unassigned > 0 ? 'warning' : 'success'}
          onPress={() => navigation.navigate('Requests')}
        />
        <OpsColumn
          title="Plans"
          metrics={[
            { value: planStats.totalPlans, label: 'Total' },
            { value: planStats.activePlansCount, label: 'Active' },
            { value: formatINR(planStats.totalPotentialMonthlyRevenue), label: 'Potential' },
          ]}
          status={`${planStats.activePlansCount} live`}
          statusTone="success"
          onPress={() => navigation.navigate('Plans')}
          showDivider
        />
        <OpsColumn
          title="Tickets"
          metrics={[
            { value: ticketSummary.open, label: 'Open' },
            { value: ticketSummary.inProgress, label: 'In progress' },
            { value: ticketSummary.resolved, label: 'Resolved' },
          ]}
          status={ticketStatus}
          statusTone={
            ticketSummary.breached > 0 ? 'danger' : ticketSummary.open > 0 ? 'warning' : 'success'
          }
          onPress={() => navigation.navigate('TicketPortal', { screen: 'TicketList' })}
          showDivider
        />
      </View>
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    paddingVertical: 0,
  },
  pressed: {
    opacity: 0.9,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: dash.border,
    marginHorizontal: 6,
    alignSelf: 'stretch',
  },
  colTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: dash.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metric: {
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: dash.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
    lineHeight: 20,
    marginBottom: 1,
  },
  metricWarn: {
    color: dash.warning,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: dash.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
    flex: 1,
    opacity: 0.9,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
    minHeight: dash.touch,
    justifyContent: 'flex-start',
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '600',
    color: dash.brand,
  },
});
