import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DateField } from '@/components/admin/DateField';
import { ToggleSwitch } from '@/components/common';
import { MAP_THEME } from '@/constants/mapTheme';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { MapControlState, MapStyle, TimeRange } from '@/types/map';

type OfficerOption = { id: string; name: string };

type Props = {
  controls: MapControlState;
  officers: OfficerOption[];
  onDateChange: (date: string) => void;
  onTimeRangeChange: (range: TimeRange) => void;
  onToggleOfficer: (id: string) => void;
  onDeselectAll: () => void;
  onSelectAll: () => void;
  onShowOfficersChange: (v: boolean) => void;
  onShowTrailsChange: (v: boolean) => void;
  onShowDwellChange: (v: boolean) => void;
  onShowRequestsChange: (v: boolean) => void;
  onMapStyleChange: (style: MapStyle) => void;
  onClose: () => void;
};

const TIME_OPTIONS: Array<{ key: TimeRange; label: string; sub?: string }> = [
  { key: 'all_day', label: 'All Day' },
  { key: 'morning', label: 'Morning', sub: '6–12' },
  { key: 'afternoon', label: 'Afternoon', sub: '12–18' },
  { key: 'evening', label: 'Evening', sub: '18–24' },
];

const MAP_STYLES: Array<{ key: MapStyle; label: string }> = [
  { key: 'standard', label: 'Standard' },
  { key: 'satellite', label: 'Satellite' },
  { key: 'terrain', label: 'Terrain' },
];

export function MapControlsPanel({
  controls,
  officers,
  onDateChange,
  onTimeRangeChange,
  onToggleOfficer,
  onDeselectAll,
  onSelectAll,
  onShowOfficersChange,
  onShowTrailsChange,
  onShowDwellChange,
  onShowRequestsChange,
  onMapStyleChange,
  onClose,
}: Props) {
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Map Controls</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>DATE</Text>
        <DateField
          label=""
          value={controls.selectedDate}
          onChange={onDateChange}
        />

        <Text style={styles.sectionLabel}>TIME RANGE</Text>
        <View style={styles.pillGrid}>
          {TIME_OPTIONS.map((opt) => {
            const active = controls.timeRange === opt.key;
            return (
              <Pressable
                key={opt.key}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => onTimeRangeChange(opt.key)}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {active ? '✓ ' : ''}{opt.label}
                </Text>
                {opt.sub ? (
                  <Text style={[styles.pillSub, active && styles.pillTextActive]}>
                    {opt.sub}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.sectionLabel}>OFFICERS</Text>
          <Pressable onPress={onDeselectAll}>
            <Text style={styles.link}>Deselect All</Text>
          </Pressable>
        </View>
        <Pressable onPress={onSelectAll} style={styles.selectAllRow}>
          <Text style={styles.link}>Select All</Text>
        </Pressable>
        {officers.map((o) => {
          const checked = controls.selectedOfficerIds.includes(o.id);
          return (
            <Pressable key={o.id} style={styles.checkRow} onPress={() => onToggleOfficer(o.id)}>
              <Text style={styles.checkLabel} numberOfLines={1}>{o.name}</Text>
              <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                {checked ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
            </Pressable>
          );
        })}

        <Text style={styles.sectionLabel}>LAYERS</Text>
        <LayerToggle label="Show Officers" value={controls.showOfficers} onChange={onShowOfficersChange} />
        <LayerToggle label="Show Trails" value={controls.showTrails} onChange={onShowTrailsChange} />
        <LayerToggle label="Show Dwell Time" value={controls.showDwellTime} onChange={onShowDwellChange} />
        <LayerToggle label="Show Requests" value={controls.showRequests} onChange={onShowRequestsChange} />

        <Text style={styles.sectionLabel}>MAP STYLE</Text>
        <View style={styles.styleRow}>
          {MAP_STYLES.map((s) => (
            <Pressable
              key={s.key}
              style={[styles.styleBtn, controls.mapStyle === s.key && styles.styleBtnActive]}
              onPress={() => onMapStyleChange(s.key)}
            >
              <Text
                style={[
                  styles.styleBtnText,
                  controls.mapStyle === s.key && styles.styleBtnTextActive,
                ]}
              >
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function LayerToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <ToggleSwitch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: MAP_THEME.controlsBg,
    borderLeftWidth: 1,
    borderLeftColor: MAP_THEME.controlsBorder,
    padding: spacing.md,
    maxWidth: 320,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  close: { fontSize: 18, color: colors.textSecondary, padding: spacing.xxs },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pill: {
    width: '47%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    backgroundColor: MAP_THEME.pillInactive,
  },
  pillActive: { backgroundColor: MAP_THEME.pillActive },
  pillText: { fontSize: 13, fontWeight: '600', color: MAP_THEME.pillInactiveText },
  pillTextActive: { color: MAP_THEME.pillActiveText },
  pillSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: adminColors.primary, fontSize: 13, fontWeight: '600' },
  selectAllRow: { marginBottom: spacing.xxs },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderDefault,
  },
  checkLabel: { flex: 1, fontSize: 14, color: colors.textPrimary, marginRight: spacing.sm },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: adminColors.primary, borderColor: adminColors.primary },
  checkMark: { color: colors.white, fontSize: 14, fontWeight: '700' },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xxs,
  },
  toggleLabel: { fontSize: 14, color: colors.textPrimary },
  styleRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg },
  styleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
  },
  styleBtnActive: { borderColor: adminColors.primary, backgroundColor: adminColors.primaryTint },
  styleBtnText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  styleBtnTextActive: { color: adminColors.primary },
});
