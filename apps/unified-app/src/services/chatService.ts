import type { RealtimeChannel } from '@supabase/supabase-js';

import { getCustomerIdForUser, getOfficerIdForUser } from '@/services/api/mappers';
import type { AgentAvailability, ChatMessage, ChatSession } from '@/types/support';
import { getSupabase } from '@/services/supabase';

async function requireSession() {
  const client = getSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Please sign in.');
  return { client, session: data.session };
}

export async function createChatSession(input: {
  customerId: string | null;
  customerName: string;
  customerPhone?: string;
  accountNumber?: string;
  channel?: string;
}): Promise<ChatSession> {
  const { client } = await requireSession();
  const customerId = input.customerId
    ? await getCustomerIdForUser(client, input.customerId)
    : null;
  const { data, error } = await client
    .from('chat_sessions')
    .insert({
      customer_id: customerId,
      customer_name: input.customerName,
      customer_phone: input.customerPhone ?? null,
      account_number: input.accountNumber ?? null,
      channel: input.channel ?? 'app',
      status: 'waiting',
    })
    .select('*')
    .single();
  if (error) throw error;

  try {
    await client.functions.invoke('assign-chat-agent', { body: { sessionId: data.id } });
  } catch {
    // Edge function is optional; DB trigger may already assign an agent.
  }

  const { data: updated } = await client.from('chat_sessions').select('*').eq('id', data.id).single();
  return mapSession((updated ?? data) as Record<string, unknown>);
}

export async function acceptChatSession(sessionId: string, agentUserId: string, agentName: string): Promise<void> {
  const { client } = await requireSession();
  const officerId = await getOfficerIdForUser(client, agentUserId);
  const { error } = await client
    .from('chat_sessions')
    .update({
      agent_id: officerId,
      agent_name: agentName,
      status: 'active',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', sessionId);
  if (error) throw error;

  if (!officerId) return;

  const { data: avail } = await client
    .from('agent_availability')
    .select('active_chat_count')
    .eq('agent_id', officerId)
    .maybeSingle();
  const count = Number(avail?.active_chat_count ?? 0) + 1;
  await client.from('agent_availability').update({ active_chat_count: count }).eq('agent_id', officerId);
}

export async function endChatSession(sessionId: string): Promise<void> {
  const { client } = await requireSession();
  const { data: session } = await client.from('chat_sessions').select('started_at, agent_id').eq('id', sessionId).single();
  const started = session?.started_at ? new Date(String(session.started_at)).getTime() : Date.now();
  const durationSeconds = Math.floor((Date.now() - started) / 1000);

  const { error } = await client
    .from('chat_sessions')
    .update({
      status: 'resolved',
      ended_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
    })
    .eq('id', sessionId);
  if (error) throw error;

  if (session?.agent_id) {
    const { data: avail } = await client
      .from('agent_availability')
      .select('active_chat_count')
      .eq('agent_id', session.agent_id)
      .maybeSingle();
    const count = Math.max(0, Number(avail?.active_chat_count ?? 1) - 1);
    await client.from('agent_availability').update({ active_chat_count: count }).eq('agent_id', session.agent_id);
  }
}

export async function sendChatMessage(input: {
  sessionId: string;
  senderType: ChatMessage['senderType'];
  senderId?: string;
  senderName: string;
  message: string;
}): Promise<ChatMessage> {
  const { client } = await requireSession();
  const { data, error } = await client
    .from('chat_messages')
    .insert({
      session_id: input.sessionId,
      sender_type: input.senderType,
      sender_id: input.senderId ?? null,
      sender_name: input.senderName,
      message: input.message,
      message_type: 'text',
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapMessage(data as Record<string, unknown>);
}

export async function fetchChatSessions(filters?: {
  status?: string;
  agentId?: string;
}): Promise<ChatSession[]> {
  const { client } = await requireSession();
  let q = client.from('chat_sessions').select('*').order('started_at', { ascending: false });
  if (filters?.status) q = q.eq('status', filters.status);
  if (filters?.agentId) q = q.eq('agent_id', filters.agentId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((row) => mapSession(row as Record<string, unknown>));
}

export async function fetchChatMessages(sessionId: string): Promise<ChatMessage[]> {
  const { client } = await requireSession();
  const { data, error } = await client
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => mapMessage(row as Record<string, unknown>));
}

export function subscribeToChatMessages(
  sessionId: string,
  onMessage: (message: ChatMessage) => void,
): RealtimeChannel {
  const client = getSupabase();
  return client
    .channel(`chat:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        onMessage(mapMessage(payload.new as Record<string, unknown>));
      },
    )
    .subscribe();
}

export async function setAgentAvailability(
  agentUserId: string,
  status: 'online' | 'away' | 'busy',
): Promise<AgentAvailability> {
  const { client } = await requireSession();
  const officerId = await getOfficerIdForUser(client, agentUserId);
  if (!officerId) {
    throw new Error('No officer profile linked to this account.');
  }

  const isOnline = status !== 'away';
  const isAvailable = status === 'online';

  const { data, error } = await client
    .from('agent_availability')
    .upsert(
      {
        agent_id: officerId,
        is_online: isOnline,
        is_available: isAvailable,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'agent_id' },
    )
    .select('*')
    .single();
  if (error) throw error;

  await client.from('officers').update({ availability_status: status }).eq('id', officerId);

  return {
    id: String(data.id),
    agentId: String(data.agent_id),
    isOnline: Boolean(data.is_online),
    isAvailable: Boolean(data.is_available),
    activeChatCount: Number(data.active_chat_count ?? 0),
    maxConcurrentChats: Number(data.max_concurrent_chats ?? 3),
    lastSeenAt: String(data.last_seen_at),
  };
}

export async function submitChatCsat(sessionId: string, score: number, comment?: string): Promise<void> {
  const { client } = await requireSession();
  const { error } = await client
    .from('chat_sessions')
    .update({ csat_score: score, csat_comment: comment ?? null })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function linkChatToTicket(sessionId: string, ticketId: string): Promise<void> {
  const { client } = await requireSession();
  const { error } = await client
    .from('chat_sessions')
    .update({ linked_ticket_id: ticketId })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function fetchOrCreateOfficerSupportSession(
  officerUserId: string,
  officerName: string,
): Promise<ChatSession> {
  const { client } = await requireSession();
  const officerId = await getOfficerIdForUser(client, officerUserId);
  if (!officerId) throw new Error('No officer profile linked to this account.');

  const accountKey = `officer:${officerId}`;
  const { data: existing, error: lookupError } = await client
    .from('chat_sessions')
    .select('*')
    .eq('channel', 'officer_app')
    .eq('account_number', accountKey)
    .in('status', ['waiting', 'active'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return mapSession(existing as Record<string, unknown>);

  return createChatSession({
    customerId: null,
    customerName: officerName,
    accountNumber: accountKey,
    channel: 'officer_app',
  });
}

function mapSession(row: Record<string, unknown>): ChatSession {
  return {
    id: String(row.id),
    customerId: row.customer_id ? String(row.customer_id) : null,
    customerName: String(row.customer_name),
    customerPhone: row.customer_phone ? String(row.customer_phone) : null,
    accountNumber: row.account_number ? String(row.account_number) : null,
    agentId: row.agent_id ? String(row.agent_id) : null,
    agentName: row.agent_name ? String(row.agent_name) : null,
    status: String(row.status) as ChatSession['status'],
    channel: String(row.channel ?? 'app'),
    startedAt: String(row.started_at),
    acceptedAt: row.accepted_at ? String(row.accepted_at) : null,
    endedAt: row.ended_at ? String(row.ended_at) : null,
    waitTimeSeconds: row.wait_time_seconds != null ? Number(row.wait_time_seconds) : null,
    durationSeconds: row.duration_seconds != null ? Number(row.duration_seconds) : null,
    linkedTicketId: row.linked_ticket_id ? String(row.linked_ticket_id) : null,
    csatScore: row.csat_score != null ? Number(row.csat_score) : null,
    csatComment: row.csat_comment ? String(row.csat_comment) : null,
  };
}

function mapMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    senderType: String(row.sender_type) as ChatMessage['senderType'],
    senderId: row.sender_id ? String(row.sender_id) : null,
    senderName: String(row.sender_name),
    message: row.message ? String(row.message) : null,
    messageType: String(row.message_type ?? 'text') as ChatMessage['messageType'],
    attachmentUrl: row.attachment_url ? String(row.attachment_url) : null,
    attachmentName: row.attachment_name ? String(row.attachment_name) : null,
    isRead: Boolean(row.is_read),
    readAt: row.read_at ? String(row.read_at) : null,
    createdAt: String(row.created_at),
  };
}
