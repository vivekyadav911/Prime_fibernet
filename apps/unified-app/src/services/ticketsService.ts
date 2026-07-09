// DB: Supabase

import type { RealtimeChannel } from '@supabase/supabase-js';

import type { Officer } from '@/types/requests';
import type {
  InternalNote,
  Ticket,
  TicketFilters,
  TicketFormData,
  TicketPriority,
  TicketStats,
  TicketStatus,
} from '@/types/tickets';
import { getSupabase } from '@/services/supabase';
import { officerPortalApi } from '@/services/api/officerPortalApi';
import { store } from '@/store/store';
import { triggerAutoNotification } from '@/services/broadcastNotificationService';
import { fetchOfficerNameMap } from '@/services/api/mappers';
import { fetchOfficers } from '@/services/requestsService';
import {
  buildSlaInsertFields,
  buildTicketTitle,
  mapActivityRow,
  mapAttachmentRow,
  mapDbRowToTicket,
  mapNoteRow,
} from '@/utils/ticketViewMappers';
import { buildSlaStatusFromTicket, computeTicketStats } from '@/utils/slaUtils';
import { insertOfficerPortalNotification } from '@/utils/officerPortalNotification';

async function requireSession() {
  const client = getSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Please sign in to manage tickets.');
  return { client, session: data.session };
}

async function loadTicketRelations(client: ReturnType<typeof getSupabase>, ticketId: string) {
  const [activitiesResult, notesResult, attachmentsResult] = await Promise.all([
    client
      .from('ticket_activity_events')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('timestamp', { ascending: false }),
    client
      .from('ticket_internal_notes')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false }),
    client
      .from('portal_ticket_attachments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('uploaded_at', { ascending: false }),
  ]);

  if (activitiesResult.error) throw activitiesResult.error;
  if (notesResult.error) throw notesResult.error;
  if (attachmentsResult.error) throw attachmentsResult.error;

  const attachments = (attachmentsResult.data ?? []).map((row) =>
    mapAttachmentRow(row as Record<string, unknown>),
  );

  const notes = (notesResult.data ?? []).map((row) =>
    mapNoteRow(row as Record<string, unknown>, attachments),
  );

  const activities = (activitiesResult.data ?? []).map((row) =>
    mapActivityRow(row as Record<string, unknown>),
  );

  return { activities, notes, attachments };
}

async function insertActivity(
  client: ReturnType<typeof getSupabase>,
  ticketId: string,
  event: {
    type: string;
    description: string;
    performedBy: string;
    performedByRole?: string;
    metadata?: Record<string, string>;
  },
) {
  const { error } = await client.from('ticket_activity_events').insert({
    ticket_id: ticketId,
    type: event.type,
    description: event.description,
    performed_by: event.performedBy,
    performed_by_role: event.performedByRole ?? '',
    metadata: event.metadata ?? {},
    timestamp: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function generateTicketNumber(): Promise<string> {
  const { client } = await requireSession();
  const { data, error } = await client.rpc('generate_ticket_number');
  if (error) throw error;
  return String(data);
}

export async function fetchTickets(_filters?: Partial<TicketFilters>): Promise<Ticket[]> {
  const { client } = await requireSession();
  const { data, error } = await client
    .from('ticket_sla_live')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = data ?? [];
  const officerIds = [
    ...new Set(
      rows
        .map((row) => row.assigned_officer_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ];
  const officerNameById = await fetchOfficerNameMap(client, officerIds);

  const tickets = await Promise.all(
    rows.map(async (row) => {
      const rowRecord = row as Record<string, unknown>;
      const officerId = rowRecord.assigned_officer_id ? String(rowRecord.assigned_officer_id) : null;
      const resolvedOfficerName = officerId
        ? officerNameById.get(officerId) ?? (rowRecord.assigned_officer_name as string | null)
        : null;
      const enrichedRow = {
        ...rowRecord,
        assigned_officer_name: resolvedOfficerName,
      };
      const { activities, notes, attachments } = await loadTicketRelations(
        client,
        String(row.id),
      );
      return mapDbRowToTicket(enrichedRow, activities, notes, attachments);
    }),
  );

  return tickets;
}

export async function fetchTicketById(id: string): Promise<Ticket> {
  const { client } = await requireSession();
  const { data, error } = await client.from('ticket_sla_live').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Ticket not found');

  const rowRecord = data as Record<string, unknown>;
  const officerId = rowRecord.assigned_officer_id ? String(rowRecord.assigned_officer_id) : null;
  let enrichedRow = rowRecord;
  if (officerId) {
    const nameMap = await fetchOfficerNameMap(client, [officerId]);
    enrichedRow = {
      ...rowRecord,
      assigned_officer_name: nameMap.get(officerId) ?? rowRecord.assigned_officer_name,
    };
  }

  const { activities, notes, attachments } = await loadTicketRelations(client, id);
  return mapDbRowToTicket(enrichedRow, activities, notes, attachments);
}

export async function createTicket(
  form: TicketFormData,
  admin: { id: string; name: string; role: string },
): Promise<Ticket> {
  const { client } = await requireSession();
  const ticketNumber = await generateTicketNumber();
  const now = new Date();
  const title = buildTicketTitle(form.complaintType, form.contactName);
  const slaFields = buildSlaInsertFields(form.priority, now);

  let assignedOfficerName: string | null = null;
  let assignedOfficerRole: string | null = null;
  if (form.assignedOfficerId) {
    const officers = await fetchOfficers();
    const officer = officers.find((o) => o.id === form.assignedOfficerId);
    if (officer) {
      assignedOfficerName = officer.name;
      assignedOfficerRole = officer.role;
    }
  }

  const insertRow: Record<string, unknown> = {
    ticket_number: ticketNumber,
    title,
    contact_name: form.contactName,
    contact_phone: form.contactPhone,
    contact_email: form.contactEmail || null,
    address: form.address || null,
    city: form.city || null,
    complaint_type: form.complaintType,
    priority: form.priority,
    status: 'Open',
    source: form.source,
    description: form.description,
    assigned_officer_id: form.assignedOfficerId,
    assigned_officer_name: assignedOfficerName,
    assigned_officer_role: assignedOfficerRole,
    assigned_at: form.assignedOfficerId ? now.toISOString() : null,
    created_by_admin_id: admin.id,
    created_by_admin_name: admin.name,
    linked_request_id: form.linkedRequestId,
    linked_request_number: form.linkedRequestNumber,
    customer_id: form.customerId,
    is_ad_hoc_contact: !form.customerId,
    account_number: form.accountNumber || null,
    tags: form.tags,
    ...slaFields,
  };

  const { data, error } = await client.from('tickets').insert(insertRow).select().single();
  if (error) throw error;

  const ticketId = String(data.id);
  await insertActivity(client, ticketId, {
    type: 'created',
    description: `Ticket ${ticketNumber} created`,
    performedBy: admin.name,
    performedByRole: admin.role,
  });

  if (form.assignedOfficerId && assignedOfficerName) {
    await insertActivity(client, ticketId, {
      type: 'officer_assigned',
      description: `${assignedOfficerName} assigned to ticket`,
      performedBy: admin.name,
      performedByRole: admin.role,
    });

    await insertOfficerPortalNotification(client, {
      officerId: form.assignedOfficerId,
      type: 'ticket_assigned',
      title: 'New ticket assigned',
      body: `You have been assigned a new support ticket by ${admin.name}.`,
      data: { ticketId },
      category: 'ticket',
    });
  }

  if (form.linkedRequestId) {
    await client
      .from('service_requests')
      .update({ linked_ticket_id: ticketId })
      .eq('id', form.linkedRequestId);

    await insertActivity(client, ticketId, {
      type: 'linked_to_request',
      description: `Linked to request ${form.linkedRequestNumber ?? form.linkedRequestId}`,
      performedBy: admin.name,
      performedByRole: admin.role,
      metadata: { requestId: form.linkedRequestId },
    });
  }

  return fetchTicketById(ticketId);
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  resolutionSummary?: string,
  performedBy = 'Admin',
): Promise<void> {
  const { client } = await requireSession();
  const ticket = await fetchTicketById(ticketId);
  const now = new Date().toISOString();

  const patch: Record<string, unknown> = { status };
  if (status === 'Resolved') {
    patch.resolved_at = now;
    if (resolutionSummary) patch.resolution_summary = resolutionSummary;
  }
  if (status === 'Closed') {
    patch.closed_at = now;
    if (resolutionSummary) patch.resolution_summary = resolutionSummary;
  }
  if (status === 'Reopened') {
    patch.resolved_at = null;
    patch.closed_at = null;
  }

  const { error } = await client.from('tickets').update(patch).eq('id', ticketId);
  if (error) throw error;

  if (!['Resolved', 'Closed'].includes(status)) {
    await insertActivity(client, ticketId, {
      type: 'status_changed',
      description: `Status updated to ${status}`,
      performedBy,
      performedByRole: 'Admin',
      metadata: { oldStatus: ticket.status, newStatus: status },
    });
  }

  if (status === 'Resolved' && ticket.customerId) {
    try {
      await triggerAutoNotification('ticket_update', {
        audience: { type: 'specific_users', userIds: [ticket.customerId] },
        templateVars: {
          ticketNumber: ticket.ticketNumber,
          message: resolutionSummary ?? ticket.resolutionSummary ?? 'Your issue has been resolved.',
        },
        title: 'Your complaint has been resolved',
        message: `Ticket #${ticket.ticketNumber} — ${resolutionSummary ?? ticket.resolutionSummary ?? 'Your issue has been resolved.'}`,
        linkedTicketId: ticketId,
        deepLinkUrl: `primefiber://tickets/${ticketId}`,
      });
    } catch {
      /* non-blocking */
    }
  }
}

export async function updateTicketPriority(
  ticketId: string,
  priority: TicketPriority,
  performedBy: string,
): Promise<void> {
  const { client } = await requireSession();
  const ticket = await fetchTicketById(ticketId);
  const slaFields = buildSlaInsertFields(priority, ticket.createdAt);

  const { error } = await client
    .from('tickets')
    .update({ priority, ...slaFields })
    .eq('id', ticketId);
  if (error) throw error;

  await insertActivity(client, ticketId, {
    type: 'priority_changed',
    description: `Priority changed to ${priority}`,
    performedBy,
    performedByRole: 'Admin',
    metadata: { oldPriority: ticket.priority, newPriority: priority },
  });
}

export async function assignOfficer(
  ticketId: string,
  officer: Officer,
  adminName: string,
): Promise<void> {
  const { client } = await requireSession();
  const now = new Date().toISOString();

  const { error } = await client
    .from('tickets')
    .update({
      assigned_officer_id: officer.id,
      assigned_officer_name: officer.name,
      assigned_officer_role: officer.role,
      assigned_at: now,
      status: 'In Progress',
    })
    .eq('id', ticketId);
  if (error) throw error;

  await insertActivity(client, ticketId, {
    type: 'officer_assigned',
    description: `${officer.name} assigned to ticket`,
    performedBy: adminName,
    performedByRole: 'Admin',
  });

  await insertOfficerPortalNotification(client, {
    officerId: officer.id,
    type: 'ticket_assigned',
    title: 'New ticket assigned',
    body: `You have been assigned a support ticket by ${adminName}.`,
    data: { ticketId },
    category: 'ticket',
  });

  store.dispatch(officerPortalApi.util.invalidateTags(['OfficerPortal']));
}

export async function reassignOfficer(
  ticketId: string,
  officer: Officer,
  adminName: string,
): Promise<void> {
  const { client } = await requireSession();
  const now = new Date().toISOString();

  const { error } = await client
    .from('tickets')
    .update({
      assigned_officer_id: officer.id,
      assigned_officer_name: officer.name,
      assigned_officer_role: officer.role,
      assigned_at: now,
    })
    .eq('id', ticketId);
  if (error) throw error;

  await insertActivity(client, ticketId, {
    type: 'officer_reassigned',
    description: `Reassigned to ${officer.name}`,
    performedBy: adminName,
    performedByRole: 'Admin',
  });

  await insertOfficerPortalNotification(client, {
    officerId: officer.id,
    type: 'ticket_assigned',
    title: 'Ticket reassigned to you',
    body: `A support ticket has been reassigned to you by ${adminName}.`,
    data: { ticketId },
    category: 'ticket',
  });

  store.dispatch(officerPortalApi.util.invalidateTags(['OfficerPortal']));
}

export async function addInternalNote(
  ticketId: string,
  note: Omit<InternalNote, 'id' | 'createdAt' | 'attachments'>,
): Promise<void> {
  const { client } = await requireSession();

  const { error } = await client.from('ticket_internal_notes').insert({
    ticket_id: ticketId,
    content: note.content,
    author_id: note.authorId || null,
    author_name: note.authorName,
    author_role: note.authorRole,
    is_internal: note.isInternal,
  });
  if (error) throw error;

  await insertActivity(client, ticketId, {
    type: 'note_added',
    description: note.content,
    performedBy: note.authorName,
    performedByRole: note.authorRole,
  });
}

export async function linkToRequest(
  ticketId: string,
  requestId: string,
  requestNumber: string,
  adminName: string,
): Promise<void> {
  const { client } = await requireSession();

  const { error } = await client
    .from('tickets')
    .update({
      linked_request_id: requestId,
      linked_request_number: requestNumber,
    })
    .eq('id', ticketId);
  if (error) throw error;

  await insertActivity(client, ticketId, {
    type: 'linked_to_request',
    description: `Linked to request ${requestNumber}`,
    performedBy: adminName,
    performedByRole: 'Admin',
    metadata: { requestId },
  });
}

export async function unlinkFromRequest(ticketId: string, adminName: string): Promise<void> {
  const { client } = await requireSession();

  const { error } = await client
    .from('tickets')
    .update({
      linked_request_id: null,
      linked_request_number: null,
    })
    .eq('id', ticketId);
  if (error) throw error;

  await insertActivity(client, ticketId, {
    type: 'linked_to_request',
    description: 'Request link removed',
    performedBy: adminName,
    performedByRole: 'Admin',
  });
}

export async function addTag(ticketId: string, tag: string): Promise<void> {
  const ticket = await fetchTicketById(ticketId);
  if (ticket.tags.includes(tag)) return;

  const { client } = await requireSession();
  const { error } = await client
    .from('tickets')
    .update({ tags: [...ticket.tags, tag] })
    .eq('id', ticketId);
  if (error) throw error;
}

export async function removeTag(ticketId: string, tag: string): Promise<void> {
  const ticket = await fetchTicketById(ticketId);
  const { client } = await requireSession();
  const { error } = await client
    .from('tickets')
    .update({ tags: ticket.tags.filter((t) => t !== tag) })
    .eq('id', ticketId);
  if (error) throw error;
}

export async function reopenTicket(ticketId: string, adminName: string): Promise<void> {
  await updateTicketStatus(ticketId, 'Reopened', undefined, adminName);
}

export async function fetchTicketStats(): Promise<TicketStats> {
  const tickets = await fetchTickets();
  return computeTicketStats(tickets);
}

const ticketsRealtimeListeners = new Set<() => void>();
let ticketsRealtimeChannel: RealtimeChannel | null = null;

function notifyTicketsRealtimeListeners() {
  for (const listener of ticketsRealtimeListeners) {
    listener();
  }
}

export function subscribeToTickets(callback: () => void): () => void {
  const client = getSupabase();
  ticketsRealtimeListeners.add(callback);

  if (!ticketsRealtimeChannel) {
    ticketsRealtimeChannel = client
      .channel('admin-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        notifyTicketsRealtimeListeners();
      })
      .subscribe();
  }

  return () => {
    ticketsRealtimeListeners.delete(callback);
    if (ticketsRealtimeListeners.size === 0 && ticketsRealtimeChannel) {
      void client.removeChannel(ticketsRealtimeChannel);
      ticketsRealtimeChannel = null;
    }
  };
}

export { fetchOfficers };
