import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Button } from '@prime/ui';

import { DateRangePicker } from '@/components/admin';
import type { NotificationFilters, NotificationPriority } from '@/types/notifications';
import { EVENT_TYPE_OPTIONS, NOTIFICATION_PRIORITIES, AUDIENCE_TYPE_OPTIONS } from '@/types/notifications';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type NotificationFilterSheetProps = {
  visible: boolean;
  filters: NotificationFilters;
  onClose: () => void;
  onApply: (filters: Partial<NotificationFilters>) => void;
  onClear: () => void;
};

export function NotificationFilterSheet({
  visible,
  filters,
  onClose,
  onApply,
  onClear,
}: NotificationFilterSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['85%'], []);
  const [local, setLocal] = useState(filters);

  useEffect(() => {
    if (visible) setLocal(filters);
  }, [visible, filters]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  );

  useEffect(() => {
    if (visible) sheetRef.current?.expand();
    else sheetRef.current?.close();
  }, [visible]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surfaceWhite }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>PRIORITY</Text>
        <View style={styles.chipRow}>
          <Pressable
            style={[styles.chip, local.priority === 'all' && styles.chipActive]}
            onPress={() => setLocal((p) => ({ ...p, priority: 'all' }))}
          >
            <Text style={[styles.chipText, local.priority === 'all' && styles.chipTextActive]}>All</Text>
          </Pressable>
          {NOTIFICATION_PRIORITIES.map((p) => (
            <Pressable
              key={p}
              style={[styles.chip, local.priority === p && styles.chipActive]}
              onPress={() => setLocal((prev) => ({ ...prev, priority: p as NotificationPriority }))}
            >
              <Text style={[styles.chipText, local.priority === p && styles.chipTextActive]}>{p}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>EVENT TYPE</Text>
        <View style={styles.chipRow}>
          <Pressable
            style={[styles.chip, local.eventType === 'all' && styles.chipActive]}
            onPress={() => setLocal((p) => ({ ...p, eventType: 'all' }))}
          >
            <Text style={[styles.chipText, local.eventType === 'all' && styles.chipTextActive]}>All</Text>
          </Pressable>
          {EVENT_TYPE_OPTIONS.slice(0, 6).map((e) => (
            <Pressable
              key={e.value}
              style={[styles.chip, local.eventType === e.value && styles.chipActive]}
              onPress={() => setLocal((prev) => ({ ...prev, eventType: e.value }))}
            >
              <Text style={[styles.chipText, local.eventType === e.value && styles.chipTextActive]}>
                {e.label.split(' ')[0]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>AUDIENCE</Text>
        <View style={styles.chipRow}>
          <Pressable
            style={[styles.chip, local.audienceType === 'all' && styles.chipActive]}
            onPress={() => setLocal((p) => ({ ...p, audienceType: 'all' }))}
          >
            <Text style={[styles.chipText, local.audienceType === 'all' && styles.chipTextActive]}>All</Text>
          </Pressable>
          {AUDIENCE_TYPE_OPTIONS.map((a) => (
            <Pressable
              key={a.value}
              style={[styles.chip, local.audienceType === a.value && styles.chipActive]}
              onPress={() => setLocal((prev) => ({ ...prev, audienceType: a.value }))}
            >
              <Text style={[styles.chipText, local.audienceType === a.value && styles.chipTextActive]}>
                {a.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>DATE RANGE</Text>
        <DateRangePicker
          from={local.dateRange.from?.toISOString().slice(0, 10) ?? ''}
          to={local.dateRange.to?.toISOString().slice(0, 10) ?? ''}
          onFromChange={(from) =>
            setLocal((prev) => ({
              ...prev,
              dateRange: { ...prev.dateRange, from: from ? new Date(from) : null },
            }))
          }
          onToChange={(to) =>
            setLocal((prev) => ({
              ...prev,
              dateRange: { ...prev.dateRange, to: to ? new Date(to) : null },
            }))
          }
          accentColor={adminColors.primary}
        />

        <View style={styles.footer}>
          <Button label="Clear All" variant="ghost" onPress={onClear} />
          <Button label="Apply" onPress={() => onApply(local)} />
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  chipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  chipText: { fontSize: 13, color: colors.textPrimary },
  chipTextActive: { color: colors.white, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
});
