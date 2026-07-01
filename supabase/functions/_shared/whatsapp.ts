import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

export interface WhatsAppSettingsRow {
  id: string;
  enabled: boolean;
  gateway_url: string;
  gateway_session_id: string;
  notify_payment: boolean;
  notify_invoice: boolean;
  notify_complaints: boolean;
  notify_activations: boolean;
  payment_receipt_template: string;
  invoice_template: string;
  complaint_update_template: string;
  activation_template: string;
}

export type MessageType =
  | 'payment_receipt'
  | 'invoice'
  | 'complaint_update'
  | 'activation'
  | 'manual';

export type LogStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export type SendResult = {
  success: boolean;
  messageId?: string | null;
  error?: string;
};

export async function getWhatsAppSettings(
  supabase: SupabaseClient,
): Promise<WhatsAppSettingsRow | null> {
  const { data, error } = await supabase
    .from('whatsapp_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as WhatsAppSettingsRow;
}

export function renderTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = vars[key];
    return value === null || value === undefined ? `{{${key}}}` : String(value);
  });
}

export function toWhatsAppChatId(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}@c.us`;
  if (digits.length === 12 && digits.startsWith('91')) return `${digits}@c.us`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}@c.us`;
  throw new Error(`Cannot parse phone number: "${phone}"`);
}

function normalizeGatewayUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

async function readErrorBody(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  return text || `HTTP ${res.status}`;
}

export async function sendWhatsAppText(
  gatewayUrl: string,
  apiKey: string,
  sessionId: string,
  phone: string,
  text: string,
): Promise<SendResult> {
  const chatId = toWhatsAppChatId(phone);
  const res = await fetch(
    `${normalizeGatewayUrl(gatewayUrl)}/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        chatId,
        text,
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!res.ok) {
    return { success: false, error: await readErrorBody(res) };
  }

  const body = await res.json().catch(() => ({}));
  return {
    success: true,
    messageId: (body?.messageId as string | undefined) ?? (body?.id as string | undefined) ?? null,
  };
}

export async function sendWhatsAppDocument(
  gatewayUrl: string,
  apiKey: string,
  sessionId: string,
  phone: string,
  base64Data: string,
  filename: string,
  caption?: string,
): Promise<SendResult> {
  const chatId = toWhatsAppChatId(phone);
  const res = await fetch(
    `${normalizeGatewayUrl(gatewayUrl)}/api/sessions/${encodeURIComponent(sessionId)}/messages/send-document`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        chatId,
        base64: base64Data,
        mimetype: 'application/pdf',
        filename,
        caption: caption ?? '',
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!res.ok) {
    return { success: false, error: await readErrorBody(res) };
  }

  const body = await res.json().catch(() => ({}));
  return {
    success: true,
    messageId: (body?.messageId as string | undefined) ?? (body?.id as string | undefined) ?? null,
  };
}

export async function getGatewaySession(
  gatewayUrl: string,
  apiKey: string,
  sessionId: string,
): Promise<{ ok: boolean; body?: Record<string, unknown>; error?: string }> {
  const res = await fetch(
    `${normalizeGatewayUrl(gatewayUrl)}/api/sessions/${encodeURIComponent(sessionId)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(8_000),
    },
  ).catch((error) => {
    return { ok: false, status: 0, text: async () => String(error) } as Response;
  });

  if (!res.ok) {
    return { ok: false, error: await readErrorBody(res) };
  }

  const body = await res.json().catch(() => ({}));
  return { ok: true, body: body as Record<string, unknown> };
}

export async function logWhatsApp(
  supabase: SupabaseClient,
  params: {
    recipient_phone: string;
    recipient_name?: string | null;
    message_type: MessageType;
    reference_id?: string | null;
    reference_type?: string | null;
    status: LogStatus;
    error_message?: string | null;
    wa_message_id?: string | null;
    sent_by?: string | null;
  },
): Promise<void> {
  try {
    await supabase.from('whatsapp_logs').insert(params);
  } catch (_error) {
    // Logging must stay non-fatal for the primary business flow.
  }
}

export async function resolveRequestUserId(
  supabaseUrl: string,
  anonKey: string,
  authHeader: string | null,
): Promise<string | null> {
  if (!authHeader) return null;

  const authClient = (await import('https://esm.sh/@supabase/supabase-js@2.49.8')).createClient(
    supabaseUrl,
    anonKey,
    {
      global: { headers: { Authorization: authHeader } },
    },
  );

  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}
