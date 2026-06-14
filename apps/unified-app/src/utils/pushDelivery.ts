import type { NotificationPriority } from '@/types/notifications';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const BATCH_SIZE = 100;
const RETRY_DELAYS_MS = [1000, 2000, 4000];

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  priority: 'default' | 'high' | 'normal';
  sound: 'default' | null;
  badge?: number;
  channelId?: string;
}

export interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export interface ExpoReceiptResult {
  token: string;
  status: 'ok' | 'error';
  message?: string;
}

export function mapPriority(p: NotificationPriority): {
  priority: 'default' | 'high' | 'normal';
  channelId: string;
} {
  if (p === 'Urgent') return { priority: 'high', channelId: 'urgent' };
  if (p === 'High') return { priority: 'high', channelId: 'default' };
  if (p === 'Low') return { priority: 'default', channelId: 'promotional' };
  return { priority: 'default', channelId: 'default' };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  body: unknown,
  attempt = 0,
): Promise<Response> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok && attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt] ?? 4000);
      return fetchWithRetry(url, body, attempt + 1);
    }
    return res;
  } catch {
    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt] ?? 4000);
      return fetchWithRetry(url, body, attempt + 1);
    }
    throw new Error('Push API network error after retries');
  }
}

export async function sendBatch(messages: PushMessage[]): Promise<ExpoPushTicket[]> {
  if (!messages.length) return [];
  const res = await fetchWithRetry(EXPO_PUSH_URL, messages);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Expo push failed: ${text}`);
  }
  const json = (await res.json()) as { data?: ExpoPushTicket[] } | ExpoPushTicket[];
  if (Array.isArray(json)) return json;
  return json.data ?? [];
}

export async function sendPushToTokens(
  tokens: string[],
  title: string,
  body: string,
  priority: NotificationPriority,
  data?: Record<string, string>,
  onProgress?: (sent: number, failed: number) => void,
): Promise<{ sent: number; failed: number; tickets: ExpoPushTicket[]; failedTokens: string[] }> {
  const { priority: expoPriority, channelId } = mapPriority(priority);
  let sent = 0;
  let failed = 0;
  const allTickets: ExpoPushTicket[] = [];
  const failedTokens: string[] = [];

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const chunk = tokens.slice(i, i + BATCH_SIZE);
    const messages: PushMessage[] = chunk.map((token) => ({
      to: token,
      title,
      body,
      data,
      priority: expoPriority,
      sound: 'default',
      channelId,
    }));

    try {
      const tickets = await sendBatch(messages);
      allTickets.push(...tickets);
      tickets.forEach((ticket, idx) => {
        if (ticket.status === 'ok') {
          sent += 1;
        } else {
          failed += 1;
          failedTokens.push(chunk[idx] ?? '');
        }
      });
    } catch {
      failed += chunk.length;
      failedTokens.push(...chunk);
    }
    onProgress?.(sent, failed);
  }

  return { sent, failed, tickets: allTickets, failedTokens };
}

export async function checkReceipts(ticketIds: string[]): Promise<Map<string, ExpoReceiptResult>> {
  const results = new Map<string, ExpoReceiptResult>();
  if (!ticketIds.length) return results;

  for (let i = 0; i < ticketIds.length; i += BATCH_SIZE) {
    const chunk = ticketIds.slice(i, i + BATCH_SIZE);
    const res = await fetchWithRetry(EXPO_RECEIPTS_URL, { ids: chunk });
    if (!res.ok) continue;
    const json = (await res.json()) as {
      data?: Record<string, { status: string; message?: string }>;
    };
    const data = json.data ?? {};
    for (const [id, receipt] of Object.entries(data)) {
      results.set(id, {
        token: id,
        status: receipt.status === 'ok' ? 'ok' : 'error',
        message: receipt.message,
      });
    }
  }
  return results;
}

export type SendProgressCallback = (sent: number, failed: number, total: number) => void;
