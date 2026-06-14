import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@prime/ui';

import { SelectField } from '@/components/admin';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { ExportRequestFilters, RequestStatus, ServiceRequest } from '@/types/requests';
import { applyExportFilters } from '@/utils/requestViewMappers';
import { exportRequestsPdf } from '@/utils/exportRequestsPdf';

type ExportRequestsModalProps = {
  visible: boolean;
  requests: ServiceRequest[];
  onClose: () => void;
};

const STATUS_OPTIONS: { value: RequestStatus | 'All'; label: string }[] = [
  { value: 'All', label: 'All statuses' },
  { value: 'Pending', label: 'Pending' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const SORT_OPTIONS = [
  { value: 'newest' as const, label: 'Newest first' },
  { value: 'oldest' as const, label: 'Oldest first' },
];

const ASSIGNMENT_OPTIONS: { value: ExportRequestFilters['assignment']; label: string }[] = [
  { value: 'all', label: 'All requests' },
  { value: 'assigned', label: 'Only assigned to officers' },
  { value: 'unassigned', label: 'Only unassigned' },
];

export function ExportRequestsModal({ visible, requests, onClose }: ExportRequestsModalProps) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<RequestStatus | 'All'>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [assignment, setAssignment] = useState<ExportRequestFilters['assignment']>('all');
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    const filtered = applyExportFilters(requests, { status, sortBy, assignment });
    if (!filtered.length) {
      Alert.alert('No results', 'No requests match the selected filters.');
      return;
    }

    setExporting(true);
    try {
      await exportRequestsPdf(filtered);
      onClose();
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Could not generate PDF');
    } finally {
      setExporting(false);
    }
  }, [assignment, onClose, requests, sortBy, status]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { marginBottom: insets.bottom }]} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Export Requests</Text>
          <Text style={styles.subtitle}>Choose which requests to include in the PDF.</Text>

          <SelectField
            label="STATUS FILTER"
            value={status}
            options={STATUS_OPTIONS}
            onSelect={setStatus}
          />
          <SelectField label="SORT BY" value={sortBy} options={SORT_OPTIONS} onSelect={setSortBy} />

          <Text style={styles.radioLabel}>ASSIGNMENT FILTER</Text>
          {ASSIGNMENT_OPTIONS.map((opt) => (
            <Pressable key={opt.value} style={styles.radioRow} onPress={() => setAssignment(opt.value)}>
              <View style={[styles.radioOuter, assignment === opt.value && styles.radioOuterActive]}>
                {assignment === opt.value ? <View style={styles.radioInner} /> : null}
              </View>
              <Text style={styles.radioText}>{opt.label}</Text>
            </Pressable>
          ))}

          <View style={styles.footer}>
            <Button label="Cancel" variant="ghost" onPress={onClose} disabled={exporting} />
            <Pressable
              style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
              onPress={() => void handleExport()}
              disabled={exporting}
            >
              <Ionicons name="document-text-outline" size={18} color={colors.surfaceWhite} />
              <Text style={styles.exportBtnText}>{exporting ? 'Generating…' : 'Export PDF'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm },
  radioLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: { borderColor: adminColors.primary },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: adminColors.primary },
  radioText: { fontSize: 14, color: colors.textPrimary },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: adminColors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    minHeight: 44,
  },
  exportBtnDisabled: { opacity: 0.6 },
  exportBtnText: { color: colors.surfaceWhite, fontWeight: '700', fontSize: 15 },
});
