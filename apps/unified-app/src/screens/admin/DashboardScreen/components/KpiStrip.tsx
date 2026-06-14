import { StyleSheet, Text, View } from 'react-native';

import { formatINR } from '@/utils/planUtils';

import { dash } from '../dashboardUi';

type KpiStripProps = {
  activeSubscribers: number;
  mrr: number;
  openRequests: number;
  officersOnline: number;
  revenueTrendPercent?: number;
};

function formatCompactINR(amount: number): string {
  if (!Number.isFinite(amount)) return '₹0';
  if (amount >= 100_000) {
    const lakhs = amount / 100_000;
    return `₹${lakhs >= 10 ? Math.round(lakhs) : lakhs.toFixed(1)}L`;
  }
  if (amount >= 1_000) {
    const k = amount / 1_000;
    return `₹${k >= 10 ? Math.round(k) : k.toFixed(1)}K`;
  }
  return formatINR(amount);
}

type KpiItem = {
  label: string;
  value: string;
  meta?: string;
  metaColor?: string;
  featured?: boolean;
  accent?: string;
};

function KpiCard({ item }: { item: KpiItem }) {
  return (
    <View
      style={[
        styles.kpi,
        item.featured && styles.kpiFeatured,
        item.accent ? { borderTopColor: item.accent, borderTopWidth: 2 } : null,
      ]}
    >
      <Text style={styles.kpiLabel} numberOfLines={1}>
        {item.label}
      </Text>
      <Text style={[styles.kpiValue, item.featured && styles.kpiValueFeatured]}>{item.value}</Text>
      {item.meta ? (
        <Text style={[styles.kpiMeta, item.metaColor ? { color: item.metaColor } : null]} numberOfLines={1}>
          {item.meta}
        </Text>
      ) : null}
    </View>
  );
}

export function KpiStrip({
  activeSubscribers,
  mrr,
  openRequests,
  officersOnline,
  revenueTrendPercent,
}: KpiStripProps) {
  const trendMeta =
    revenueTrendPercent != null
      ? `${revenueTrendPercent >= 0 ? '+' : ''}${revenueTrendPercent}% MoM`
      : 'Revenue';

  const items: [KpiItem, KpiItem, KpiItem, KpiItem] = [
    {
      label: 'MRR',
      value: formatCompactINR(mrr),
      meta: trendMeta,
      metaColor: revenueTrendPercent != null && revenueTrendPercent < 0 ? dash.warning : dash.success,
      featured: true,
      accent: dash.brand,
    },
    {
      label: 'Subscribers',
      value: activeSubscribers.toLocaleString('en-IN'),
      meta: 'Active',
    },
    {
      label: 'Open requests',
      value: openRequests.toLocaleString('en-IN'),
      meta: openRequests > 0 ? 'Attention' : 'Clear',
      metaColor: openRequests > 0 ? dash.warning : dash.success,
      accent: openRequests > 0 ? dash.warning : dash.success,
    },
    {
      label: 'Officers online',
      value: officersOnline.toLocaleString('en-IN'),
      meta: officersOnline > 0 ? 'On duty' : 'No coverage',
      metaColor: officersOnline > 0 ? dash.success : dash.warning,
      accent: officersOnline > 0 ? dash.success : dash.warning,
    },
  ];

  const [mrrKpi, subscribersKpi, requestsKpi, officersKpi] = items;

  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <KpiCard item={mrrKpi} />
        <KpiCard item={subscribersKpi} />
      </View>
      <View style={styles.row}>
        <KpiCard item={requestsKpi} />
        <KpiCard item={officersKpi} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: dash.cardGap,
  },
  row: {
    flexDirection: 'row',
    gap: dash.cardGap,
  },
  kpi: {
    flex: 1,
    height: dash.kpiH,
    backgroundColor: dash.card,
    borderRadius: dash.radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dash.border,
    padding: dash.compactPad,
    justifyContent: 'space-between',
    ...dash.shadow,
  },
  kpiFeatured: {
    borderColor: '#D8D2F8',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: dash.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: dash.metricGap,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '700',
    color: dash.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  kpiValueFeatured: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
  },
  kpiMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: dash.textSecondary,
    marginTop: 2,
  },
});
