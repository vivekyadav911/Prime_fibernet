import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';

import { StatusBadge } from '@/components/admin';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AttendanceRecord } from '@/types/attendance';
import type { AttendanceStatusDayRow, CanonicalAttendanceStatus } from '@/utils/attendanceStatus';
import { formatAttendanceDuration } from '@/utils/attendanceDuration';
import { parseLocalDateString } from '@/utils/dateUtils';

type AttendanceDayDetailSheetProps = {
  visible: boolean;
  date: string | null;
  records: AttendanceRecord[];
  statusRows?: AttendanceStatusDayRow[];
  selectedOfficerId: string | null;
  onClose: () => void;
};

function formatTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDisplayDate(iso: string): string {
  return parseLocalDateString(iso).toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function RecordDetailCard({ record }: { record: AttendanceRecord }) {
  return (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordName}>{record.officerName || 'Unknown officer'}</Text>
        <StatusBadge status={record.status} />
      </View>

      {record.manualEntryByName ? (
        <Text style={styles.manualNote}>
          Manually entered by {record.manualEntryByName}
          {record.manualEntryReason ? ` — ${record.manualEntryReason}` : ''}
        </Text>
      ) : null}

      <View style={styles.timeRow}>
        <View style={styles.timeCell}>
          <Text style={styles.timeLabel}>Check in</Text>
          <Text style={styles.timeValue}>{formatTime(record.checkInTime)}</Text>
        </View>
        <View style={styles.timeDivider} />
        <View style={styles.timeCell}>
          <Text style={styles.timeLabel}>Check out</Text>
          <Text style={styles.timeValue}>{formatTime(record.checkOutTime)}</Text>
        </View>
        <View style={styles.timeDivider} />
        <View style={styles.timeCell}>
          <Text style={styles.timeLabel}>Duration</Text>
          <Text style={styles.timeValue}>{formatAttendanceDuration(record)}</Text>
        </View>
      </View>

      <Text style={styles.metaText} numberOfLines={2}>
        {record.geofenceName || 'Unassigned zone'}
        {record.notes ? ` · ${record.notes}` : ''}
      </Text>
    </View>
  );
}

export function AttendanceDayDetailSheet({
  visible,
  date,
  records,
  statusRows = [],
  selectedOfficerId,
  onClose,
}: AttendanceDayDetailSheetProps) {
  const snapPoints = useMemo(() => ['65%'], []);

  const canonicalStatuses = useMemo(() => {
    if (!date) return [] as Array<{ officerId: string; officerName: string; status: CanonicalAttendanceStatus }>;
    return statusRows
      .filter((row) => row.shiftDate === date)
      .filter((row) => (selectedOfficerId ? row.officerId === selectedOfficerId : true))
      .map((row) => ({
        officerId: row.officerId,
        officerName: row.officerName,
        status: row.status,
      }));
  }, [date, selectedOfficerId, statusRows]);

  const dayRecords = useMemo(() => {
    if (!date) return [];
    return records
      .filter((record) => record.date === date)
      .filter((record) => (selectedOfficerId ? record.officerId === selectedOfficerId : true))
      .sort((a, b) => a.officerName.localeCompare(b.officerName));
  }, [date, records, selectedOfficerId]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  );

  if (!visible || !date) return null;

  return (
    <BottomSheet
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{formatDisplayDate(date)}</Text>
        <Text style={styles.subtitle}>
          {selectedOfficerId
            ? `${dayRecords.length} record${dayRecords.length === 1 ? '' : 's'}`
            : `${dayRecords.length} employee${dayRecords.length === 1 ? '' : 's'}`}
        </Text>

        {dayRecords.length === 0 && canonicalStatuses.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No attendance logged</Text>
            <Text style={styles.emptySubtitle}>No records were found for this day.</Text>
          </View>
        ) : (
          <>
            {canonicalStatuses.map((entry) => (
              <View key={`${entry.officerId}-${entry.status}`} style={styles.canonicalRow}>
                <Text style={styles.recordName}>{entry.officerName}</Text>
                <StatusBadge status={entry.status === 'not_yet_recorded' ? 'absent' : entry.status} />
                {entry.status === 'not_yet_recorded' ? (
                  <Text style={styles.metaText}>Pending — not yet recorded</Text>
                ) : null}
              </View>
            ))}
            {dayRecords.map((record) => (
              <RecordDetailCard key={record.id} record={record} />
            ))}
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  recordCard: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  recordName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  manualNote: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: adminColors.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  timeCell: { flex: 1, alignItems: 'center', gap: 1 },
  timeDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: colors.borderDefault,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  timeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  canonicalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  emptyWrap: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
