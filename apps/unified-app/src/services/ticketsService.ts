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
import { sendAutoNotification } from '@/services/broadcastNotificationService';
import { fetchOfficers } from '@/services/requestsService';
import {
  buildSlaInsertFields,
  buildTicketTitle,
  mapActivityRow,
  mapAttachmentRow,
  mapDbRowToTicket,
  mapNoteRow,
} from '@/utils/ticketViewMappers';
import { computeSLADeadlines, isSLABreached } from '@/utils/slaUtils';

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
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = data ?? [];
  const tickets = await Promise.all(
    rows.map(async (row) => {
      const { activities, notes, attachments } = await loadTicketRelations(
        client,
        String(row.id),
      );
      return mapDbRowToTicket(row as Record<string, unknown>, activities, notes, attachments);
    }),
  );

  return tickets;
}

export async function fetchTicketById(id: string): Promise<Ticket> {
  const { client } = await requireSession();
  const { data, error } = await client.from('tickets').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Ticket not found');

  const { activities, notes, attachments } = await loadTicketRelations(client, id);
  return mapDbRowToTicket(data as Record<string, unknown>, activities, notes, attachments);
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
  }

  if (form.linkedRequestId) {
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

  await insertActivity(client, ticketId, {
    type: status === 'Resolved' ? 'resolved' : status === 'Closed' ? 'closed' : 'status_changed',
    description: `Status updated to ${status}`,
    performedBy,
    performedByRole: 'Admin',
    metadata: { oldStatus: ticket.status, newStatus: status },
  });

  if (status === 'Resolved' && ticket.customerId) {
    try {
      await sendAutoNotification({
        title: 'Your complaint has been resolved',
        message: `Ticket #${ticket.ticketNumber} — ${resolutionSummary ?? ticket.resolutionSummary ?? 'Your issue has been resolved.'}`,
        priority: 'Normal',
        eventType: 'ticketUpdate',
        audience: { type: 'specific_users', userIds: [ticket.customerId] },
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
  const { client } = await requireSession();
  await insertActivity(client, ticketId, {
    type: 'reopened',
    description: 'Ticket reopened',
    performedBy: adminName,
    performedByRole: 'Admin',
  });
}

export async function fetchTicketStats(): Promise<TicketStats> {
  const tickets = await fetchTickets();
  const open = tickets.filter((t) => t.status === 'Open').length;
  const inProgress = tickets.filter((t) => t.status === 'In Progress').length;
  const resolved = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;
  const breached = tickets.filter((t) => isSLABreached(t)).length;

  const resolvedTickets = tickets.filter((t) => t.resolvedAt);
  const avgResolutionHours =
    resolvedTickets.length > 0
      ? resolvedTickets.reduce((sum, t) => {
          const hours = (t.resolvedAt!.getTime() - t.createdAt.getTime()) / (60 * 60 * 1000);
          return sum + hours;
        }, 0) / resolvedTickets.length
      : 0;

  const byPriority = { Low: 0, Medium: 0, High: 0, Critical: 0 } as TicketStats['byPriority'];
  const byComplaintType = {} as TicketStats['byComplaintType'];

  for (const t of tickets) {
    byPriority[t.priority] += 1;
    byComplaintType[t.complaintType] = (byComplaintType[t.complaintType] ?? 0) + 1;
  }

  return {
    totalOpen: open,
    totalInProgress: inProgress,
    totalResolved: resolved,
    totalBreached: breached,
    avgResolutionHours,
    byPriority,
    byComplaintType,
  };
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
