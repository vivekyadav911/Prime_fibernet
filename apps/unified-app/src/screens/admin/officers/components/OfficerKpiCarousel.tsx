import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { officerStrings } from '@/constants/officerStrings';
import type { AdminOfficerStats } from '@/types/api/admin';

import { KPI_CARD_GAP, KPI_CARD_H, KPI_CARD_W, ui } from '../officersUi';

type KpiKey = keyof AdminOfficerStats;

type KpiDef = {
  key: KpiKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  meta: string;
};

const KPI_DEFS: KpiDef[] = [
  {
    key: 'total',
    label: officerStrings.kpi.totalForce,
    icon: 'people-outline',
    accent: ui.brand,
    meta: 'Field team',
  },
  {
    key: 'active',
    label: officerStrings.kpi.activeStatus,
    icon: 'pulse-outline',
    accent: ui.success,
    meta: 'On roster',
  },
  {
    key: 'available',
    label: officerStrings.kpi.available,
    icon: 'radio-outline',
    accent: '#0D9488',
    meta: 'Ready now',
  },
  {
    key: 'restricted',
    label: officerStrings.kpi.restricted,
    icon: 'ban-outline',
    accent: ui.danger,
    meta: 'Blocked',
  },
];

type OfficerKpiCarouselProps = {
  stats?: AdminOfficerStats;
};

function KpiCard({ def, value }: { def: KpiDef; value: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${def.accent}14` }]}>
          <Ionicons name={def.icon} size={18} color={def.accent} />
        </View>
        <View style={[styles.accentDot, { backgroundColor: def.accent }]} />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {def.label}
      </Text>
      <Text style={styles.value}>{value.toLocaleString('en-IN')}</Text>
      <Text style={[styles.meta, { color: def.accent }]} numberOfLines={1}>
        {def.meta}
      </Text>
    </View>
  );
}

export function OfficerKpiCarousel({ stats }: OfficerKpiCarouselProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>Team overview</Text>
      <View style={styles.carouselShell}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={KPI_CARD_W + KPI_CARD_GAP}
          snapToAlignment="start"
          contentContainerStyle={styles.scrollContent}
        >
          {KPI_DEFS.map((def) => (
            <KpiCard key={def.key} def={def} value={stats?.[def.key] ?? 0} />
          ))}
        </ScrollView>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(244,245,247,0)', ui.bg]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.edgeFade}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: ui.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  carouselShell: {
    position: 'relative',
  },
  scrollContent: {
    gap: KPI_CARD_GAP,
    paddingBottom: 2,
  },
  edgeFade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 28,
  },
  card: {
    width: KPI_CARD_W,
    height: KPI_CARD_H,
    backgroundColor: ui.card,
    borderRadius: 20,
    padding: ui.cardPad,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ui.border,
    justifyContent: 'space-between',
    ...ui.shadow,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: ui.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 30,
    fontWeight: '700',
    color: ui.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  meta: {
    fontSize: 12,
    fontWeight: '600',
  },
});
