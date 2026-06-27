import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AssignOfficerModal } from '@/components/Requests/AssignOfficerModal';
import {
  LinkRequestModal,
  SLAIndicator,
  TicketPriorityBadge,
  TicketStatusBadge,
  TicketTimeline,
} from '@/components/TicketPortal';
import { EscalationBanner } from '@/components/support';
import { AdminButton, AdminScreenLayout, AvatarIcon, FormField, RoleGuard, SectionCard, SelectField } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { RequestDetailModal } from '@/screens/admin/requests/RequestDetailModal';
import {
  addInternalNote,
  assignOfficer,
  linkToRequest,
  reopenTicket,
  reassignOfficer,
  unlinkFromRequest,
  updateTicketStatus,
  fetchTicketById,
} from '@/services/ticketsService';
import { fetchRequestById as fetchLinkedRequest } from '@/services/requestsService';
import { fetchPlans } from '@/services/planService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { Plan } from '@/types/plans';
import type { AdminTicketsStackParamList } from '@/types/navigation';
import type { Officer, ServiceRequest } from '@/types/requests';
import type { Ticket, TicketStatus } from '@/types/tickets';
import { exportTicketAsPDF } from '@/utils/ticketPdfExport';
import { truncateRequestId } from '@/utils/requestViewMappers';

type Props = NativeStackScreenProps<AdminTicketsStackParamList, 'TicketDetail'>;

const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  Open: ['In Progress', 'Awaiting Customer', 'Resolved', 'Closed'],
  'In Progress': ['Awaiting Customer', 'Awaiting Parts', 'Resolved', 'Closed'],
  'Awaiting Customer': ['In Progress', 'Resolved', 'Closed'],
  'Awaiting Parts': ['In Progress', 'Resolved', 'Closed'],
  Resolved: ['Closed'],
  Closed: [],
  Reopened: ['In Progress', 'Resolved', 'Closed'],
};

export function TicketDetailScreen({ route }: Props) {
  const supportNav = useNavigation();
  const { ticketId } = route.params;
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const admin = useAppSelector((s) => s.auth.user);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignVisible, setAssignVisible] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [linkedRequest, setLinkedRequest] = useState<ServiceRequest | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteInternal, setNoteInternal] = useState(true);
  const [postingNote, setPostingNote] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [pendingStatus, setPendingStatus] = useState<TicketStatus | null>(null);
  const [resolutionPlanId, setResolutionPlanId] = useState('');
  const [activePlans, setActivePlans] = useState<Plan[]>([]);

  const isPlanChangeTicket =
    ticket?.complaintType === 'Plan Upgrade' || ticket?.complaintType === 'Plan Downgrade';

  useEffect(() => {
    if (!isPlanChangeTicket) return;
    void fetchPlans({ status: 'active' })
      .then((plans) => {
        setActivePlans(plans);
        if (plans[0] && !resolutionPlanId) setResolutionPlanId(plans[0].id);
      })
      .catch(() => setActivePlans([]));
  }, [isPlanChangeTicket, resolutionPlanId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTicketById(ticketId);
      setTicket(data);
      if (data.linkedRequestId) {
        try {
          setLinkedRequest(await fetchLinkedRequest(data.linkedRequestId));
        } catch {
          setLinkedRequest(null);
        }
      } else {
        setLinkedRequest(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAssign = useCallback(
    async (officer: Officer) => {
      if (!ticket) return;
      setAssigning(true);
      try {
        if (ticket.assignedOfficerId) {
          await reassignOfficer(ticket.id, officer, admin?.name ?? 'Admin');
        } else {
          await assignOfficer(ticket.id, officer, admin?.name ?? 'Admin');
        }
        dispatch(
          enqueueToast({
            id: `assign-${Date.now()}`,
            type: 'success',
            message: 'Officer assigned successfully',
          }),
        );
        await load();
      } catch (e) {
        dispatch(
          enqueueToast({
            id: `assign-err-${Date.now()}`,
            type: 'error',
            message: e instanceof Error ? e.message : 'Assignment failed',
          }),
        );
      } finally {
        setAssigning(false);
      }
    },
    [admin?.name, dispatch, load, ticket],
  );

  const handleStatusChange = useCallback(
    async (newStatus: TicketStatus, summary?: string) => {
      if (!ticket) return;
      const allowed = VALID_TRANSITIONS[ticket.status] ?? [];
      if (!allowed.includes(newStatus) && newStatus !== 'Reopened') {
        Alert.alert('Invalid transition', `Cannot move from ${ticket.status} to ${newStatus} directly.`);
        return;
      }

      if ((newStatus === 'Resolved' || newStatus === 'Closed') && !summary?.trim()) {
        setPendingStatus(newStatus);
        return;
      }

      try {
        const selectedPlan = activePlans.find((p) => p.id === resolutionPlanId);
        const summaryWithPlan =
          selectedPlan && isPlanChangeTicket
            ? `${summary?.trim() ?? ''}\nTarget plan: ${selectedPlan.displayName} (${selectedPlan.id})`.trim()
            : summary?.trim();
        await updateTicketStatus(ticket.id, newStatus, summaryWithPlan, admin?.name ?? 'Admin');
        setPendingStatus(null);
        setResolutionSummary('');
        setResolutionPlanId('');
        await load();
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Status update failed');
      }
    },
    [activePlans, admin?.name, isPlanChangeTicket, load, resolutionPlanId, ticket],
  );

  const handlePostNote = useCallback(async () => {
    if (!ticket || !noteText.trim() || !admin) return;
    setPostingNote(true);
    try {
      await addInternalNote(ticket.id, {
        content: noteText.trim(),
        authorId: admin.id,
        authorName: admin.name ?? 'Admin',
        authorRole: admin.role ?? 'admin',
        isInternal: noteInternal,
      });
      setNoteText('');
      await load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to post note');
    } finally {
      setPostingNote(false);
    }
  }, [admin, load, noteInternal, noteText, ticket]);

  const handleDownload = useCallback(async () => {
    if (!ticket) return;
    setDownloading(true);
    try {
      await exportTicketAsPDF(ticket);
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Could not generate PDF.');
    } finally {
      setDownloading(false);
    }
  }, [ticket]);

  const handleLinkRequest = useCallback(
    async (request: ServiceRequest | null) => {
      if (!ticket) return;
      try {
        if (request) {
          await linkToRequest(
            ticket.id,
            request.id,
            truncateRequestId(request.id),
            admin?.name ?? 'Admin',
          );
        } else {
          await unlinkFromRequest(ticket.id, admin?.name ?? 'Admin');
        }
        await load();
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Link update failed');
      }
    },
    [admin?.name, load, ticket],
  );

  if (loading) {
    return (
      <AdminScreenLayout>
        <SkeletonLoader rows={10} />
      </AdminScreenLayout>
    );
  }

  if (error || !ticket) {
    return (
      <AdminScreenLayout>
        <ErrorState message={error ?? 'Ticket not found'} onRetry={load} />
      </AdminScreenLayout>
    );
  }

  const allowedStatuses = VALID_TRANSITIONS[ticket.status] ?? [];

  return (
    <RoleGuard requiredPermission="requests.view">
      <AdminScreenLayout padded={false}>
        <View style={styles.page}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[adminScreenStyles.listContent, { gap: spacing.md, paddingBottom: insets.bottom + 80 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          {ticket.escalationLevel > 0 ? (
            <EscalationBanner
              ticketNumber={ticket.ticketNumber}
              priority={ticket.priority}
              minutesOverdue={Math.abs(Math.floor(ticket.slaStatus.resolutionRemainingMs / 60000))}
            />
          ) : null}

          <SectionCard title="">
            <Text style={styles.ticketNumber}>{ticket.ticketNumber}</Text>
            <Text style={styles.mainTitle}>{ticket.title}</Text>
            <Text style={styles.meta}>
              Created {format(ticket.createdAt, 'MMM dd, yyyy HH:mm')} by {ticket.createdByAdminName}
            </Text>
            {ticket.customerId ? (
              <Pressable
                onPress={() =>
                  (supportNav as { navigate: (name: string, params: { customerId: string }) => void }).navigate(
                    'CustomerSupportProfile',
                    { customerId: ticket.customerId! },
                  )
                }
              >
                <Text style={styles.profileLink}>View Customer Profile →</Text>
              </Pressable>
            ) : null}
            {ticket.csatScore != null ? (
              <Text style={styles.csat}>CSAT: {ticket.csatScore} ⭐</Text>
            ) : null}
            <View style={styles.badgeRow}>
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} />
            </View>
            <SLAIndicator ticket={ticket} mode="full" />

            <RoleGuard requiredPermission="requests.edit">
              <View style={styles.statusSection}>
                <SelectField
                  label="Change Status"
                  value={ticket.status}
                  options={[
                    { value: ticket.status, label: ticket.status },
                    ...allowedStatuses.map((s) => ({ value: s, label: s })),
                  ]}
                  onSelect={(s) => {
                    if (s !== ticket.status) void handleStatusChange(s);
                  }}
                />
                {pendingStatus ? (
                  <View style={styles.resolutionBox}>
                    {isPlanChangeTicket && activePlans.length > 0 ? (
                      <SelectField
                        label="Target Plan"
                        value={resolutionPlanId || activePlans[0]?.id || ''}
                        options={activePlans.map((p) => ({
                          value: p.id,
                          label: `${p.displayName} · ${p.speedMbps} Mbps · ₹${p.price}`,
                        }))}
                        onSelect={setResolutionPlanId}
                      />
                    ) : null}
                    <Text style={styles.infoLabel}>RESOLUTION SUMMARY (REQUIRED)</Text>
                    <TextInput
                      style={styles.resolutionInput}
                      value={resolutionSummary}
                      onChangeText={setResolutionSummary}
                      multiline
                      placeholder="Describe how this was resolved…"
                    />
                    <View style={styles.linkActions}>
                      <AdminButton
                        label="Cancel"
                        variant="ghost"
                        onPress={() => {
                          setPendingStatus(null);
                          setResolutionSummary('');
                        }}
                      />
                      <AdminButton
                        label={`Mark ${pendingStatus}`}
                        onPress={() => void handleStatusChange(pendingStatus, resolutionSummary)}
                        disabled={!resolutionSummary.trim()}
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            </RoleGuard>
          </SectionCard>

          <SectionCard title="Contact Information">
            {ticket.accountNumber ? (
              <InfoRow label="Account" value={ticket.accountNumber} />
            ) : null}
            <InfoRow label="Name" value={ticket.contactName} />
            <InfoRow label="Phone" value={ticket.contactPhone} />
            <InfoRow label="Email" value={ticket.contactEmail || '—'} />
            <InfoRow label="Address" value={[ticket.address, ticket.city].filter(Boolean).join(', ') || '—'} />
            <View style={styles.contactActions}>
              <Pressable
                style={styles.contactBtn}
                onPress={() => void Linking.openURL(`tel:${ticket.contactPhone}`)}
              >
                <Ionicons name="call-outline" size={18} color={adminColors.primary} />
                <Text style={styles.contactBtnText}>Call</Text>
              </Pressable>
              {ticket.contactEmail ? (
                <Pressable
                  style={styles.contactBtn}
                  onPress={() => void Linking.openURL(`mailto:${ticket.contactEmail}`)}
                >
                  <Ionicons name="mail-outline" size={18} color={adminColors.primary} />
                  <Text style={styles.contactBtnText}>Email</Text>
                </Pressable>
              ) : null}
            </View>
          </SectionCard>

          <SectionCard title="Complaint Details">
            <View style={styles.chipRow}>
              <Text style={styles.chip}>{ticket.complaintType}</Text>
              <TicketPriorityBadge priority={ticket.priority} compact />
            </View>
            {ticket.tags.length > 0 ? (
              <View style={styles.tagsRow}>
                {ticket.tags.map((tag) => (
                  <Text key={tag} style={styles.tag}>
                    {tag}
                  </Text>
                ))}
              </View>
            ) : null}
            <Text style={styles.description}>{ticket.description}</Text>
          </SectionCard>

          {ticket.linkedRequestId ? (
            <SectionCard title="Linked Request">
              {linkedRequest ? (
                <>
                  <InfoRow label="Request" value={truncateRequestId(linkedRequest.id)} />
                  <InfoRow label="Type" value={linkedRequest.type} />
                  <InfoRow label="Status" value={linkedRequest.status} />
                  <InfoRow label="Customer" value={linkedRequest.customerName} />
                </>
              ) : (
                <Text style={styles.muted}>Linked request no longer exists</Text>
              )}
              <View style={styles.linkActions}>
                <AdminButton
                  label="View Request"
                  variant="secondary"
                  onPress={() => setRequestModalVisible(true)}
                />
                <RoleGuard requiredPermission="requests.edit">
                  <AdminButton
                    label="Unlink"
                    variant="ghost"
                    onPress={() => {
                      Alert.alert('Unlink request?', 'Remove the link to this service request?', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Unlink',
                          style: 'destructive',
                          onPress: () => void handleLinkRequest(null),
                        },
                      ]);
                    }}
                  />
                </RoleGuard>
              </View>
            </SectionCard>
          ) : (
            <RoleGuard requiredPermission="requests.edit">
              <SectionCard title="Linked Request">
                <AdminButton label="Link to Request" variant="secondary" onPress={() => setLinkModalVisible(true)} />
              </SectionCard>
            </RoleGuard>
          )}

          <SectionCard title="Assigned Officer">
            {ticket.assignedOfficerId ? (
              <View style={styles.officerRow}>
                <AvatarIcon name={ticket.assignedOfficerName ?? 'Officer'} />
                <View>
                  <Text style={styles.officerName}>{ticket.assignedOfficerName}</Text>
                  <Text style={styles.officerRole}>{ticket.assignedOfficerRole}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.muted}>No officer assigned</Text>
            )}
            <RoleGuard requiredPermission="requests.edit">
              <AdminButton
                label={ticket.assignedOfficerId ? 'Reassign Officer' : 'Assign Officer'}
                variant={ticket.assignedOfficerId ? 'secondary' : 'primary'}
                onPress={() => setAssignVisible(true)}
                style={styles.assignBtn}
              />
            </RoleGuard>
          </SectionCard>

          <SectionCard title={`Internal Notes (${ticket.internalNotes.length})`}>
            {ticket.internalNotes.map((note) => (
              <View key={note.id} style={styles.noteItem}>
                <Text style={styles.noteAuthor}>
                  {note.authorName} · {format(note.createdAt, 'MMM dd, HH:mm')}
                </Text>
                <Text style={styles.noteBadge}>{note.isInternal ? 'Internal' : 'Customer Visible'}</Text>
                <Text style={styles.noteContent}>{note.content}</Text>
              </View>
            ))}

            <RoleGuard requiredPermission="requests.edit">
              <FormField
                label="Add Note"
                value={noteText}
                onChangeText={setNoteText}
                multiline
                numberOfLines={3}
              />
              <View style={styles.noteToggleRow}>
                <Pressable
                  style={[styles.toggle, noteInternal ? styles.toggleActive : null]}
                  onPress={() => setNoteInternal(true)}
                >
                  <Text style={noteInternal ? styles.toggleTextActive : styles.toggleText}>Internal Only</Text>
                </Pressable>
                <Pressable
                  style={[styles.toggle, !noteInternal ? styles.toggleActive : null]}
                  onPress={() => setNoteInternal(false)}
                >
                  <Text style={!noteInternal ? styles.toggleTextActive : styles.toggleText}>
                    Customer Visible
                  </Text>
                </Pressable>
              </View>
              <AdminButton
                label={postingNote ? 'Posting…' : 'Post Note'}
                onPress={handlePostNote}
                disabled={!noteText.trim() || postingNote}
              />
            </RoleGuard>
          </SectionCard>

          <SectionCard title={`Activity Timeline (${ticket.activityTimeline.length} events)`}>
            <TicketTimeline events={ticket.activityTimeline} />
          </SectionCard>

          {(ticket.status === 'Resolved' || ticket.status === 'Closed') && ticket.resolutionSummary ? (
            <SectionCard title="Resolution">
              <Text style={styles.description}>{ticket.resolutionSummary}</Text>
              {ticket.resolvedAt ? (
                <Text style={styles.meta}>
                  Resolved {format(ticket.resolvedAt, 'MMM dd, yyyy HH:mm')}
                </Text>
              ) : null}
              <RoleGuard requiredPermission="requests.edit">
                <AdminButton
                  label="Reopen Ticket"
                  variant="secondary"
                  onPress={() => {
                    Alert.alert('Reopen ticket?', 'This will set status to Reopened.', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Reopen',
                        onPress: () =>
                          void reopenTicket(ticket.id, admin?.name ?? 'Admin').then(load),
                      },
                    ]);
                  }}
                  style={styles.assignBtn}
                />
              </RoleGuard>
            </SectionCard>
          ) : null}
          </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <AdminButton
            label={downloading ? 'Generating…' : 'Download Report'}
            onPress={handleDownload}
            disabled={downloading}
          />
        </View>

        <AssignOfficerModal
          visible={assignVisible}
          onClose={() => setAssignVisible(false)}
          onSelect={handleAssign}
          loading={assigning}
        />

        <LinkRequestModal
          visible={linkModalVisible}
          linkedRequestId={ticket.linkedRequestId}
          onClose={() => setLinkModalVisible(false)}
          onSelect={handleLinkRequest}
        />

        {linkedRequest ? (
          <RequestDetailModal
            visible={requestModalVisible}
            request={linkedRequest}
            onClose={() => setRequestModalVisible(false)}
            onAssign={async () => {}}
            onAddNote={async () => {}}
          />
        ) : null}
        </View>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  flex: { flex: 1 },
  profileLink: {
    fontSize: 13,
    fontWeight: '600',
    color: adminColors.primary,
    marginBottom: spacing.sm,
  },
  csat: {
    fontSize: 13,
    fontWeight: '600',
    color: adminColors.badgeWarning,
    marginBottom: spacing.sm,
  },
  ticketNumber: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: adminColors.primary,
    fontWeight: '600',
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xxs,
  },
  meta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusSection: {
    marginTop: spacing.md,
  },
  infoRow: {
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  contactActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  contactBtnText: {
    color: adminColors.primary,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chip: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  tag: {
    fontSize: 11,
    backgroundColor: `${adminColors.primary}18`,
    color: adminColors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  muted: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  linkActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  officerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  officerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  officerRole: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  assignBtn: {
    marginTop: spacing.sm,
  },
  noteItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  noteAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  noteBadge: {
    fontSize: 10,
    color: colors.textSecondary,
    marginVertical: 2,
  },
  noteContent: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  noteToggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  toggle: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  toggleActive: {
    backgroundColor: adminColors.primary,
    borderColor: adminColors.primary,
  },
  toggleText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  toggleTextActive: {
    fontSize: 12,
    color: colors.surfaceWhite,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    backgroundColor: adminColors.canvasBg,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
  },
  resolutionBox: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  resolutionInput: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    minHeight: 80,
    fontSize: 14,
    backgroundColor: colors.surfaceWhite,
  },
});
