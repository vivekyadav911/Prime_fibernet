import type { ComplaintFormData, CustomerComplaint } from '@/types/support';
import { getSupabase } from '@/services/supabase';

async function requireSession() {
  const client = getSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Please sign in.');
  return { client, session: data.session };
}

export async function generateComplaintNumber(): Promise<string> {
  const { client } = await requireSession();
  const { data, error } = await client.rpc('generate_complaint_number');
  if (error) throw error;
  return String(data);
}

export async function createComplaint(input: ComplaintFormData): Promise<CustomerComplaint> {
  const { client } = await requireSession();
  const complaintNumber = await generateComplaintNumber();
  const { data, error } = await client
    .from('customer_complaints')
    .insert({
      complaint_number: complaintNumber,
      customer_id: input.customerId,
      customer_name: input.customerName,
      account_number: input.accountNumber,
      complaint_type: input.complaintType,
      description: input.description,
      severity: input.severity,
      linked_ticket_id: input.linkedTicketId,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapComplaint(data as Record<string, unknown>);
}

export async function updateComplaint(
  id: string,
  updates: Partial<Pick<CustomerComplaint, 'status' | 'assignedTo' | 'resolution' | 'severity'>>,
): Promise<CustomerComplaint> {
  const { client } = await requireSession();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.status) payload.status = updates.status;
  if (updates.assignedTo !== undefined) payload.assigned_to = updates.assignedTo;
  if (updates.resolution !== undefined) payload.resolution = updates.resolution;
  if (updates.severity) payload.severity = updates.severity;
  if (updates.status === 'resolved') payload.resolved_at = new Date().toISOString();

  const { data, error } = await client.from('customer_complaints').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return mapComplaint(data as Record<string, unknown>);
}

export async function logCustomerInteraction(input: {
  customerId: string;
  interactionType: string;
  direction?: 'inbound' | 'outbound';
  subject?: string;
  notes?: string;
  durationMinutes?: number;
  agentId?: string;
  linkedTicketId?: string;
  linkedChatId?: string;
}): Promise<void> {
  const { client } = await requireSession();
  const { error } = await client.from('customer_interactions').insert({
    customer_id: input.customerId,
    interaction_type: input.interactionType,
    direction: input.direction ?? 'inbound',
    subject: input.subject ?? null,
    notes: input.notes ?? null,
    duration_minutes: input.durationMinutes ?? null,
    agent_id: input.agentId ?? null,
    linked_ticket_id: input.linkedTicketId ?? null,
    linked_chat_id: input.linkedChatId ?? null,
  });
  if (error) throw error;
}

function mapComplaint(row: Record<string, unknown>): CustomerComplaint {
  return {
    id: String(row.id),
    complaintNumber: String(row.complaint_number),
    customerId: row.customer_id ? String(row.customer_id) : null,
    customerName: String(row.customer_name),
    accountNumber: row.account_number ? String(row.account_number) : null,
    complaintType: String(row.complaint_type),
    description: String(row.description),
    severity: String(row.severity ?? 'normal') as CustomerComplaint['severity'],
    status: String(row.status ?? 'received') as CustomerComplaint['status'],
    assignedTo: row.assigned_to ? String(row.assigned_to) : null,
    resolution: row.resolution ? String(row.resolution) : null,
    resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
    linkedTicketId: row.linked_ticket_id ? String(row.linked_ticket_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}
