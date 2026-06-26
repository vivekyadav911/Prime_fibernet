import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@prime/ui';

import { AssignOfficerModal } from '@/components/Requests/AssignOfficerModal';
import { AvatarIcon, FormField, RoleGuard } from '@/components/admin';
import { DismissKeyboardScrollView } from '@/components/common';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { ActivityEvent, Officer, ServiceRequest } from '@/types/requests';
import type { AdminDrawerParamList } from '@/types/navigation';
import { fetchPlanById } from '@/services/planService';
import type { Plan } from '@/types/plans';
import { formatINR, formatValidity } from '@/utils/planUtils';
import { exportSingleRequestPdf } from '@/utils/exportRequestsPdf';
import { truncateRequestId } from '@/utils/requestViewMappers';

type RequestDetailModalProps = {
  visible: boolean;
  request: ServiceRequest | null;
  onClose: () => void;
  onAssign: (requestId: string, officer: Officer, isReassign: boolean) => Promise<void>;
  onAddNote: (requestId: string, note: string) => Promise<void>;
};

const STATUS_STYLES: Record<
  ServiceRequest['status'],
  { bg: string; text: string }
> = {
  Pending: { bg: '#FEF3C7', text: '#92400E' },
  'In Progress': { bg: '#3B82F6', text: '#FFFFFF' },
  Completed: { bg: '#10B981', text: '#FFFFFF' },
  Cancelled: { bg: '#6B7280', text: '#FFFFFF' },
};

function eventLabel(event: ActivityEvent): string {
  switch (event.type) {
    case 'note_added':
      return 'Note added';
    case 'status_updated':
      return event.description.includes('Status') ? event.description : 'Status updated';
    case 'self_assigned':
      return 'Self-assigned';
    case 'officer_assigned':
      return 'Officer assigned';
    case 'officer_reassigned':
      return 'Officer reassigned';
    default:
      return 'Activity';
  }
}

export function RequestDetailModal({
  visible,
  request,
  onClose,
  onAssign,
  onAddNote,
}: RequestDetailModalProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<DrawerNavigationProp<AdminDrawerParamList>>();
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [assignVisible, setAssignVisible] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [planDetails, setPlanDetails] = useState<Plan | null>(null);

  useEffect(() => {
    if (!visible || !request?.planId) {
      setPlanDetails(null);
      return;
    }
    void fetchPlanById(request.planId)
      .then(setPlanDetails)
      .catch(() => setPlanDetails(null));
  }, [visible, request?.planId]);

  const handleAddNote = useCallback(async () => {
    if (!request || !note.trim()) return;
    setAddingNote(true);
    try {
      await onAddNote(request.id, note.trim());
      setNote('');
      setShowNoteInput(false);
    } finally {
      setAddingNote(false);
    }
  }, [note, onAddNote, request]);

  const handleAssign = useCallback(
    async (officer: Officer) => {
      if (!request) return;
      setAssigning(true);
      try {
        await onAssign(request.id, officer, !!request.assignedOfficerId);
      } finally {
        setAssigning(false);
      }
    },
    [onAssign, request],
  );

  const handleDownload = useCallback(async () => {
    if (!request) return;
    setDownloading(true);
    try {
      await exportSingleRequestPdf(request);
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Could not generate PDF');
    } finally {
      setDownloading(false);
    }
  }, [request]);

  if (!request) return null;

  const statusStyle = STATUS_STYLES[request.status];
  const timeline = [...request.activityTimeline].sort(
    (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
  );

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Request #{request.requestNumber}</Text>
              <Text style={styles.headerDate}>{format(request.createdAt, 'MMM dd, yyyy HH:mm')}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusPillText, { color: statusStyle.text }]}>{request.status}</Text>
            </View>
          </View>

          <DismissKeyboardScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <View style={styles.customerCard}>
              <AvatarIcon name={request.customerName} size={48} />
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{request.customerName}</Text>
                <Text style={styles.customerId}>{request.customerId || '—'}</Text>
              </View>
            </View>

            <DetailField label="EMAIL" value={request.customerEmail || '—'} />
            <DetailField label="PHONE" value={request.customerPhone || '—'} />
            <DetailField label="ADDRESS" value={request.customerAddress || '—'} />

            <Text style={styles.sectionLabel}>Service Plan</Text>
            <View style={styles.planCard}>
              <Text style={styles.planName}>{request.planName}</Text>
              {request.planId ? <Text style={styles.planId}>{request.planId}</Text> : null}
              {planDetails ? (
                <Text style={styles.planMeta}>
                  {planDetails.speedMbps} Mbps · {formatINR(planDetails.price)} ·{' '}
                  {formatValidity(planDetails.validityDays)} · {planDetails.dataLimit}
                </Text>
              ) : null}
              <View
                style={[
                  styles.planBadge,
                  { backgroundColor: request.planIsActive ? adminColors.badgeActive : colors.borderDefault },
                ]}
              >
                <Text style={styles.planBadgeText}>
                  {request.planIsActive === null ? 'Unknown' : request.planIsActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>

            {request.assignedOfficerId ? (
              <>
                <Text style={styles.sectionLabel}>Assigned To</Text>
                <View style={styles.officerCard}>
                  <AvatarIcon name={request.assignedOfficerName ?? 'O'} size={44} />
                  <View style={styles.officerInfo}>
                    <Text style={styles.officerName}>{request.assignedOfficerName}</Text>
                    <Text style={styles.officerRole}>{request.assignedOfficerRole}</Text>
                  </View>
                </View>
                <RoleGuard requiredPermission="requests.edit">
                  <Pressable style={styles.reassignBtn} onPress={() => setAssignVisible(true)}>
                    <Ionicons name="swap-horizontal" size={16} color={adminColors.primary} />
                    <Text style={styles.reassignText}>Reassign Officer</Text>
                  </Pressable>
                </RoleGuard>
              </>
            ) : null}

            <View style={styles.timelineHeader}>
              <Text style={styles.sectionLabel}>Activity Timeline</Text>
              <Text style={styles.eventCount}>{timeline.length} events</Text>
            </View>

            {timeline.map((event, index) => (
              <View key={event.id} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View style={[styles.timelineDot, index === 0 ? styles.timelineDotFilled : styles.timelineDotOutline]} />
                  {index < timeline.length - 1 ? <View style={styles.timelineLine} /> : null}
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineTop}>
                    <Text style={styles.eventType}>{eventLabel(event)}</Text>
                    <Text style={styles.eventTime}>{format(event.timestamp, 'MMM dd, HH:mm')}</Text>
                  </View>
                  <Text style={styles.eventBy}>by {event.performedBy}</Text>
                  <Text style={styles.eventDesc}>{event.description}</Text>
                </View>
              </View>
            ))}

            {showNoteInput ? (
              <View style={styles.noteBox}>
                <FormField
                  label="NOTE"
                  value={note}
                  onChangeText={setNote}
                  multiline
                  placeholder="Add a note…"
                />
                <View style={styles.noteActions}>
                  <Button label="Cancel" variant="ghost" onPress={() => setShowNoteInput(false)} />
                  <Button
                    label={addingNote ? 'Saving…' : 'Save note'}
                    onPress={() => void handleAddNote()}
                    disabled={addingNote}
                  />
                </View>
              </View>
            ) : null}
          </DismissKeyboardScrollView>

          <View style={styles.footer}>
            <RoleGuard requiredPermission="requests.edit">
              <Button
                label="Add Note"
                variant="secondary"
                onPress={() => setShowNoteInput(true)}
                style={styles.footerBtn}
              />
            </RoleGuard>
            <RoleGuard requiredPermission="requests.edit">
              <Button
                label="Create Ticket"
                variant="secondary"
                onPress={() => {
                  onClose();
                  navigation.navigate('TicketPortal', {
                    screen: 'TicketPortalHome',
                    params: {
                      linkedRequestId: request.id,
                      linkedRequestNumber: truncateRequestId(request.id),
                    },
                  });
                }}
                style={styles.footerBtn}
              />
            </RoleGuard>
            <Pressable
              style={[styles.downloadBtn, downloading && styles.downloadBtnDisabled]}
              onPress={() => void handleDownload()}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator color={colors.surfaceWhite} size="small" />
              ) : (
                <Ionicons name="download-outline" size={18} color={colors.surfaceWhite} />
              )}
              <Text style={styles.downloadText}>Download Report</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <AssignOfficerModal
        visible={assignVisible}
        onClose={() => setAssignVisible(false)}
        onSelect={handleAssign}
        loading={assigning}
      />
    </>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailField}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: adminColors.canvasBg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  closeBtn: { padding: spacing.xs },
  headerCenter: { flex: 1, paddingHorizontal: spacing.sm },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  headerDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statusPill: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  customerId: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  detailField: { marginBottom: spacing.sm },
  detailLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' },
  detailValue: { fontSize: 14, color: colors.textPrimary, marginTop: 2 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  planCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  planName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  planId: { fontSize: 11, color: colors.textSecondary },
  planMeta: { fontSize: 13, color: colors.textPrimary, marginTop: spacing.xxs },
  planBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs,
  },
  planBadgeText: { fontSize: 11, fontWeight: '600', color: colors.surfaceWhite },
  officerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  officerInfo: { flex: 1 },
  officerName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  officerRole: { fontSize: 12, color: colors.textSecondary },
  reassignBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  reassignText: { fontSize: 14, fontWeight: '600', color: adminColors.primary },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventCount: { fontSize: 12, color: colors.textSecondary },
  timelineRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  timelineRail: { alignItems: 'center', width: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6 },
  timelineDotFilled: { backgroundColor: adminColors.primary },
  timelineDotOutline: { borderWidth: 2, borderColor: adminColors.primary, backgroundColor: colors.surfaceWhite },
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.borderDefault, marginTop: 2 },
  timelineContent: { flex: 1, paddingBottom: spacing.sm },
  timelineTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventType: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  eventTime: { fontSize: 11, color: colors.textSecondary },
  eventBy: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  eventDesc: { fontSize: 13, color: colors.textPrimary, marginTop: 4 },
  noteBox: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  noteActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceWhite,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
  },
  footerBtn: { flex: 1 },
  downloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: adminColors.primary,
    borderRadius: radius.sm,
    minHeight: 44,
  },
  downloadBtnDisabled: { opacity: 0.6 },
  downloadText: { color: colors.surfaceWhite, fontWeight: '700', fontSize: 15 },
});
