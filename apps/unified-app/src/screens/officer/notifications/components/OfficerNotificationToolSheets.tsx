import { useEffect, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@prime/ui';

import { DismissKeyboardScrollView, ModalSheetHeader } from '@/components/common';
import { DateRangePicker } from '@/components/common/pickers';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import {
  OFFICER_NOTIFICATION_CATEGORY_FILTERS,
  OFFICER_NOTIFICATION_DATE_PRESETS,
  OFFICER_NOTIFICATION_READ_FILTERS,
  OFFICER_NOTIFICATION_SORT_OPTIONS,
  detectOfficerNotificationDatePreset,
  officerNotificationDatePresetRange,
  type OfficerNotificationDatePreset,
  type OfficerNotificationFilterState,
  type OfficerNotificationSortKey,
} from '@/utils/officerPortalNotifications';

type SheetKind = 'sort' | 'filter' | 'date';

type Props = {
  openSheet: SheetKind | null;
  filters: OfficerNotificationFilterState;
  onClose: () => void;
  onApply: (filters: OfficerNotificationFilterState) => void;
  onSortSelect: (sortKey: OfficerNotificationSortKey) => void;
};

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ key: T; label: string }>;
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(option.key)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ToolSheet({
  visible,
  title,
  onClose,
  onDone,
  doneLabel = 'Done',
  children,
  footer,
  tall,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onDone?: () => void;
  doneLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  tall?: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable
            style={[
              styles.sheet,
              tall && styles.sheetTall,
              { paddingBottom: footer ? 0 : Math.max(insets.bottom, spacing.md) },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <ModalSheetHeader
              variant="sheet"
              title={title}
              onCancel={onClose}
              onDone={onDone}
              doneLabel={doneLabel}
            />
            <DismissKeyboardScrollView
              style={styles.bodyScroll}
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              {children}
            </DismissKeyboardScrollView>
            {footer ? (
              <View
                style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
              >
                {footer}
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function OfficerNotificationToolSheets({
  openSheet,
  filters,
  onClose,
  onApply,
  onSortSelect,
}: Props) {
  const [local, setLocal] = useState(filters);
  const [datePreset, setDatePreset] = useState<OfficerNotificationDatePreset>('all');

  useEffect(() => {
    if (!openSheet) return;
    setLocal(filters);
    setDatePreset(detectOfficerNotificationDatePreset(filters.dateFrom, filters.dateTo));
  }, [filters, openSheet]);

  const applyDatePreset = (preset: OfficerNotificationDatePreset) => {
    setDatePreset(preset);
    if (preset === 'custom') return;
    const range = officerNotificationDatePresetRange(preset);
    setLocal((prev) => ({ ...prev, ...range }));
  };

  return (
    <>
      <ToolSheet visible={openSheet === 'sort'} title="Sort" onClose={onClose}>
        {OFFICER_NOTIFICATION_SORT_OPTIONS.map((option) => {
          const active = local.sortKey === option.key;
          return (
            <Pressable
              key={option.key}
              style={[styles.optionRow, active && styles.optionRowActive]}
              onPress={() => {
                onSortSelect(option.key);
                onClose();
              }}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ToolSheet>

      <ToolSheet
        visible={openSheet === 'filter'}
        title="Filter"
        onClose={onClose}
        onDone={() => {
          onApply(local);
          onClose();
        }}
      >
        <Text style={styles.sectionLabel}>Category</Text>
        <ChipRow
          options={OFFICER_NOTIFICATION_CATEGORY_FILTERS}
          value={local.categoryFilter}
          onChange={(categoryFilter) => setLocal((prev) => ({ ...prev, categoryFilter }))}
        />

        <Text style={styles.sectionLabel}>Status</Text>
        <ChipRow
          options={OFFICER_NOTIFICATION_READ_FILTERS}
          value={local.readFilter}
          onChange={(readFilter) => setLocal((prev) => ({ ...prev, readFilter }))}
        />

        <Button
          label="Clear filters"
          variant="ghost"
          onPress={() => {
            onApply({
              ...local,
              categoryFilter: 'all',
              readFilter: 'all',
            });
            onClose();
          }}
        />
      </ToolSheet>

      <ToolSheet
        visible={openSheet === 'date'}
        title="Date range"
        onClose={onClose}
        tall={datePreset === 'custom'}
        onDone={() => {
          onApply(local);
          onClose();
        }}
        footer={
          <Button
            label="Clear date range"
            variant="ghost"
            onPress={() => {
              onApply({ ...local, dateFrom: '', dateTo: '' });
              onClose();
            }}
          />
        }
      >
        <Text style={styles.sectionLabel}>Quick range</Text>
        <ChipRow
          options={OFFICER_NOTIFICATION_DATE_PRESETS}
          value={datePreset}
          onChange={applyDatePreset}
        />

        {datePreset === 'custom' ? (
          <>
            <Text style={styles.sectionLabel}>Custom range</Text>
            <DateRangePicker
              from={local.dateFrom}
              to={local.dateTo}
              onFromChange={(dateFrom) => {
                setDatePreset('custom');
                setLocal((prev) => ({ ...prev, dateFrom }));
              }}
              onToChange={(dateTo) => {
                setDatePreset('custom');
                setLocal((prev) => ({ ...prev, dateTo }));
              }}
              accentColor={colors.primaryNavy}
            />
          </>
        ) : null}
      </ToolSheet>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '92%',
    minHeight: '44%',
    width: '100%',
  },
  sheetTall: {
    minHeight: '72%',
  },
  bodyScroll: { flexGrow: 1, flexShrink: 1, minHeight: 0 },
  body: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surfaceWhite,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: colors.primaryNavy,
    backgroundColor: colors.background,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.primaryNavy },
  optionRow: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  optionRowActive: {
    borderColor: colors.primaryNavy,
    backgroundColor: colors.background,
  },
  optionText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  optionTextActive: { color: colors.primaryNavy },
});
