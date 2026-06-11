import { baseApi } from './baseApi';

export type AdminSettingsBundle = {
  company: Record<string, unknown>;
  email: Record<string, unknown>;
  paymentGateways: Record<string, unknown>;
  sms: Record<string, unknown>;
  general: Record<string, unknown>;
  featureFlags: Record<string, unknown>;
};

export const adminSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFullAdminSettings: builder.query<AdminSettingsBundle, void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.from('general_settings').select('*').limit(1).maybeSingle();
          if (error) throw error;
          const row = (data ?? {}) as Record<string, unknown>;
          return {
            company: {
              name: row.company_name,
              email: row.company_email,
              address: row.company_address,
              gstNumber: row.gst_number,
              phone: row.company_phone,
            },
            email: {
              smtpHost: row.smtp_host,
              smtpPort: row.smtp_port,
              smtpUser: row.smtp_user,
              fromAddress: row.from_address,
            },
            paymentGateways: {
              razorpayKeyId: row.razorpay_key_id,
              easebuzzKey: row.easebuzz_key,
              activeGateway: row.payment_gateway,
            },
            sms: {
              provider: row.sms_provider,
              apiKey: row.sms_api_key,
              senderId: row.sms_sender_id,
            },
            general: {
              timezone: row.timezone ?? 'Asia/Kolkata',
              currency: row.currency ?? 'INR',
              dateFormat: row.date_format ?? 'DD/MM/YYYY',
            },
            featureFlags: {
              aiChatbot: Boolean(row.feature_ai_chatbot),
              whatsapp: Boolean(row.feature_whatsapp),
              autoInvoice: Boolean(row.feature_auto_invoice),
            },
          };
        },
      }),
      providesTags: ['Settings'],
    }),

    updateCompanySettings: builder.mutation<void, Record<string, unknown>>({
      query: (updates) => ({
        handler: async (client) => {
          const { data: existing } = await client.from('general_settings').select('id').limit(1).maybeSingle();
          const mapped = {
            company_name: updates.name,
            company_email: updates.email,
            company_address: updates.address,
            gst_number: updates.gstNumber,
            company_phone: updates.phone,
          };
          if (existing?.id) {
            await client.from('general_settings').update(mapped).eq('id', existing.id);
          } else {
            await client.from('general_settings').insert(mapped);
          }
        },
      }),
      invalidatesTags: ['Settings'],
    }),

    updateEmailSettings: builder.mutation<void, Record<string, unknown>>({
      query: (updates) => ({
        handler: async (client) => {
          const { data: existing } = await client.from('general_settings').select('id').limit(1).maybeSingle();
          const mapped = {
            smtp_host: updates.smtpHost,
            smtp_port: updates.smtpPort,
            smtp_user: updates.smtpUser,
            from_address: updates.fromAddress,
          };
          if (existing?.id) await client.from('general_settings').update(mapped).eq('id', existing.id);
          else await client.from('general_settings').insert(mapped);
        },
      }),
      invalidatesTags: ['Settings'],
    }),

    testEmailSettings: builder.mutation<void, { to: string }>({
      query: (body) => ({
        handler: async (client) => {
          const { error } = await client.functions.invoke('test-email', { body });
          if (error) throw error;
        },
      }),
    }),

    updatePaymentGatewaySettings: builder.mutation<void, Record<string, unknown>>({
      query: (updates) => ({
        handler: async (client) => {
          const { data: existing } = await client.from('general_settings').select('id').limit(1).maybeSingle();
          const mapped = {
            razorpay_key_id: updates.razorpayKeyId,
            easebuzz_key: updates.easebuzzKey,
            payment_gateway: updates.activeGateway,
          };
          if (existing?.id) await client.from('general_settings').update(mapped).eq('id', existing.id);
          else await client.from('general_settings').insert(mapped);
        },
      }),
      invalidatesTags: ['Settings'],
    }),

    updateSmsSettings: builder.mutation<void, Record<string, unknown>>({
      query: (updates) => ({
        handler: async (client) => {
          const { data: existing } = await client.from('general_settings').select('id').limit(1).maybeSingle();
          const mapped = {
            sms_provider: updates.provider,
            sms_api_key: updates.apiKey,
            sms_sender_id: updates.senderId,
          };
          if (existing?.id) await client.from('general_settings').update(mapped).eq('id', existing.id);
          else await client.from('general_settings').insert(mapped);
        },
      }),
      invalidatesTags: ['Settings'],
    }),

    updateGeneralSettings: builder.mutation<void, Record<string, unknown>>({
      query: (updates) => ({
        handler: async (client) => {
          const { data: existing } = await client.from('general_settings').select('id').limit(1).maybeSingle();
          const mapped = {
            timezone: updates.timezone,
            currency: updates.currency,
            date_format: updates.dateFormat,
          };
          if (existing?.id) await client.from('general_settings').update(mapped).eq('id', existing.id);
          else await client.from('general_settings').insert(mapped);
        },
      }),
      invalidatesTags: ['Settings'],
    }),

    updateFeatureFlags: builder.mutation<void, Record<string, unknown>>({
      query: (updates) => ({
        handler: async (client) => {
          const { data: existing } = await client.from('general_settings').select('id').limit(1).maybeSingle();
          const mapped = {
            feature_ai_chatbot: updates.aiChatbot,
            feature_whatsapp: updates.whatsapp,
            feature_auto_invoice: updates.autoInvoice,
          };
          if (existing?.id) await client.from('general_settings').update(mapped).eq('id', existing.id);
          else await client.from('general_settings').insert(mapped);
        },
      }),
      invalidatesTags: ['Settings'],
    }),
  }),
});

export const {
  useGetFullAdminSettingsQuery,
  useUpdateCompanySettingsMutation,
  useUpdateEmailSettingsMutation,
  useTestEmailSettingsMutation,
  useUpdatePaymentGatewaySettingsMutation,
  useUpdateSmsSettingsMutation,
  useUpdateGeneralSettingsMutation,
  useUpdateFeatureFlagsMutation,
} = adminSettingsApi;
