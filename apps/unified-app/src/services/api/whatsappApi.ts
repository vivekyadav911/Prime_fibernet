import { baseApi } from './baseApi';

export type WhatsAppSettings = {
  id: string;
  enabled: boolean;
  gatewayUrl: string;
  gatewaySessionId: string;
  notifyPayment: boolean;
  notifyInvoice: boolean;
  notifyComplaints: boolean;
  notifyActivations: boolean;
  paymentReceiptTemplate: string;
  invoiceTemplate: string;
  complaintUpdateTemplate: string;
  activationTemplate: string;
  updatedAt: string | null;
};

export type WhatsAppLog = {
  id: string;
  recipientPhone: string;
  recipientName: string | null;
  messageType: 'payment_receipt' | 'invoice' | 'complaint_update' | 'activation' | 'manual';
  referenceId: string | null;
  referenceType: string | null;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  errorMessage: string | null;
  waMessageId: string | null;
  createdAt: string;
};

export type WhatsAppGatewayStatus = {
  connected: boolean;
  enabled: boolean;
  gatewayHealthy?: boolean;
  sessionStatus?: string | null;
  sessionPhone?: string | null;
  sessionName?: string | null;
  sessionLastError?: string | null;
  error?: string;
};

type WhatsAppSettingsUpdate = Partial<Omit<WhatsAppSettings, 'id' | 'updatedAt'>>;

function mapSettingsRow(row: Record<string, unknown>): WhatsAppSettings {
  return {
    id: String(row.id ?? ''),
    enabled: Boolean(row.enabled ?? false),
    gatewayUrl: String(row.gateway_url ?? 'http://localhost:2785'),
    gatewaySessionId: String(row.gateway_session_id ?? ''),
    notifyPayment: Boolean(row.notify_payment ?? true),
    notifyInvoice: Boolean(row.notify_invoice ?? true),
    notifyComplaints: Boolean(row.notify_complaints ?? false),
    notifyActivations: Boolean(row.notify_activations ?? false),
    paymentReceiptTemplate: String(row.payment_receipt_template ?? ''),
    invoiceTemplate: String(row.invoice_template ?? ''),
    complaintUpdateTemplate: String(row.complaint_update_template ?? ''),
    activationTemplate: String(row.activation_template ?? ''),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

function mapLogRow(row: Record<string, unknown>): WhatsAppLog {
  return {
    id: String(row.id ?? ''),
    recipientPhone: String(row.recipient_phone ?? ''),
    recipientName: row.recipient_name ? String(row.recipient_name) : null,
    messageType: String(row.message_type ?? 'manual') as WhatsAppLog['messageType'],
    referenceId: row.reference_id ? String(row.reference_id) : null,
    referenceType: row.reference_type ? String(row.reference_type) : null,
    status: String(row.status ?? 'pending') as WhatsAppLog['status'],
    errorMessage: row.error_message ? String(row.error_message) : null,
    waMessageId: row.wa_message_id ? String(row.wa_message_id) : null,
    createdAt: String(row.created_at ?? ''),
  };
}

function toDbPatch(update: WhatsAppSettingsUpdate): Record<string, unknown> {
  return {
    enabled: update.enabled,
    gateway_url: update.gatewayUrl,
    gateway_session_id: update.gatewaySessionId,
    notify_payment: update.notifyPayment,
    notify_invoice: update.notifyInvoice,
    notify_complaints: update.notifyComplaints,
    notify_activations: update.notifyActivations,
    payment_receipt_template: update.paymentReceiptTemplate,
    invoice_template: update.invoiceTemplate,
    complaint_update_template: update.complaintUpdateTemplate,
    activation_template: update.activationTemplate,
    updated_at: new Date().toISOString(),
  };
}

export const whatsappApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWhatsAppSettings: builder.query<WhatsAppSettings, void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.from('whatsapp_settings').select('*').limit(1).maybeSingle();
          if (error) throw error;
          if (!data) {
            throw new Error('WhatsApp settings row is missing');
          }
          return mapSettingsRow(data as Record<string, unknown>);
        },
      }),
      providesTags: ['WhatsAppSettings'],
    }),

    updateWhatsAppSettings: builder.mutation<void, WhatsAppSettingsUpdate>({
      query: (update) => ({
        handler: async (client) => {
          const patch = Object.fromEntries(
            Object.entries(toDbPatch(update)).filter(([, value]) => value !== undefined),
          );
          const { data: existing, error: selectError } = await client
            .from('whatsapp_settings')
            .select('id')
            .limit(1)
            .maybeSingle();
          if (selectError) throw selectError;
          if (existing?.id) {
            const { error } = await client.from('whatsapp_settings').update(patch).eq('id', existing.id);
            if (error) throw error;
            return;
          }
          const { error } = await client.from('whatsapp_settings').insert(patch);
          if (error) throw error;
        },
      }),
      invalidatesTags: ['WhatsAppSettings', 'WhatsAppStatus'],
    }),

    getWhatsAppGatewayStatus: builder.query<WhatsAppGatewayStatus, void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('get-whatsapp-gateway-status');
          if (error) throw error;
          return (data ?? {}) as WhatsAppGatewayStatus;
        },
      }),
      providesTags: ['WhatsAppStatus'],
    }),

    getWhatsAppLogs: builder.query<
      WhatsAppLog[],
      { limit?: number; messageType?: WhatsAppLog['messageType'] | 'all' } | void
    >({
      query: (args) => ({
        handler: async (client) => {
          const limit = args?.limit ?? 100;
          let query = client
            .from('whatsapp_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
          if (args?.messageType && args.messageType !== 'all') {
            query = query.eq('message_type', args.messageType);
          }
          const { data, error } = await query;
          if (error) throw error;
          return (data ?? []).map((row) => mapLogRow(row as Record<string, unknown>));
        },
      }),
      providesTags: ['WhatsAppLogs'],
    }),

    sendPaymentWhatsApp: builder.mutation<
      { success?: boolean; skipped?: boolean; reason?: string },
      { payment_id: string; send_pdf?: boolean; pdf_base64?: string }
    >({
      query: (body) => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('send-payment-whatsapp', { body });
          if (error) throw error;
          return (data ?? {}) as { success?: boolean; skipped?: boolean; reason?: string };
        },
      }),
      invalidatesTags: ['WhatsAppLogs'],
    }),

    sendInvoiceWhatsApp: builder.mutation<
      { success?: boolean; skipped?: boolean; reason?: string },
      { invoice_id: string; pdf_base64?: string }
    >({
      query: (body) => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('send-invoice-whatsapp', { body });
          if (error) throw error;
          return (data ?? {}) as { success?: boolean; skipped?: boolean; reason?: string };
        },
      }),
      invalidatesTags: ['WhatsAppLogs'],
    }),

    sendComplaintUpdateWhatsApp: builder.mutation<
      { success?: boolean; skipped?: boolean; reason?: string },
      { complaint_id: string; new_status: string; update_message?: string }
    >({
      query: (body) => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('send-complaint-update-whatsapp', {
            body,
          });
          if (error) throw error;
          return (data ?? {}) as { success?: boolean; skipped?: boolean; reason?: string };
        },
      }),
      invalidatesTags: ['WhatsAppLogs'],
    }),
  }),
});

export const {
  useGetWhatsAppSettingsQuery,
  useUpdateWhatsAppSettingsMutation,
  useGetWhatsAppGatewayStatusQuery,
  useGetWhatsAppLogsQuery,
  useSendPaymentWhatsAppMutation,
  useSendInvoiceWhatsAppMutation,
  useSendComplaintUpdateWhatsAppMutation,
} = whatsappApi;
