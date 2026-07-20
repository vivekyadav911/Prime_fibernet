import { logAuditEvent } from '@/services/auditService';
import type {
  AdminProfile,
  AppSettings,
  AppSettingsSection,
  AuditLogEntry,
  AuditLogFilters,
  BackupFile,
  OfficerSalaryConfig,
  OfficerSalaryRow,
  SalaryType,
  TimeFormat,
} from '@/types/settings';

import { baseApi } from './baseApi';
import type { TypedSupabaseClient } from './supabase';

export type AdminSettingsBundle = {
  company: Record<string, unknown>;
  email: Record<string, unknown>;
  paymentGateways: Record<string, unknown>;
  sms: Record<string, unknown>;
  general: Record<string, unknown>;
  featureFlags: Record<string, unknown>;
};

function normalizeTimeFormat(raw: unknown): TimeFormat {
  const s = String(raw ?? '24h').toLowerCase();
  if (s.includes('12')) return '12h';
  return '24h';
}

function mapRowToAppSettings(row: Record<string, unknown>): AppSettings {
  return {
    id: String(row.id ?? ''),
    companyName: String(row.company_name ?? ''),
    contactEmail: String(row.company_email ?? ''),
    phoneNumber: String(row.company_phone ?? ''),
    officeAddress: String(row.company_address ?? ''),
    language: String(row.language ?? 'English'),
    currency: String(row.currency ?? 'INR'),
    timezone: String(row.timezone ?? 'Asia/Kolkata'),
    dateFormat: String(row.date_format ?? 'DD/MM/YYYY'),
    timeFormat: normalizeTimeFormat(row.time_format),
    notifEmail: Boolean(row.enable_email_notifications ?? true),
    notifSms: Boolean(row.enable_sms_notifications ?? false),
    notifWhatsapp: Boolean(row.enable_whatsapp_notifications ?? true),
    notifPush: Boolean(row.notif_push ?? true),
    notifInApp: Boolean(row.notif_in_app ?? true),
    notifEmailProvider: String(row.notif_email_provider ?? 'resend'),
    notifWhatsappProvider: String(row.notif_whatsapp_provider ?? 'whatsapp_business_api'),
    notifTemplatesEnabled: Boolean(row.notif_templates_enabled ?? true),
    themeMode: (row.theme_mode as AppSettings['themeMode']) ?? 'system',
    colorScheme: String(row.color_scheme ?? 'purple'),
    darkModeEnabled: Boolean(row.dark_mode_enabled ?? true),
    fontSize: Number(row.font_size ?? 14),
    compactMode: Boolean(row.compact_mode ?? false),
    animationsEnabled: Boolean(row.animations_enabled ?? true),
    dashboardLayout: (row.dashboard_layout as AppSettings['dashboardLayout']) ?? 'grid',
    showAvatars: Boolean(row.show_avatars ?? true),
    showNotificationBadges: Boolean(row.show_notification_badges ?? true),
    maintenanceMode: Boolean(row.maintenance_mode ?? false),
    debugMode: Boolean(row.debug_mode ?? false),
    errorReporting: Boolean(row.error_reporting ?? true),
    performanceMonitoring: Boolean(row.performance_monitoring ?? true),
    queryOptimization: Boolean(row.query_optimization ?? true),
    sessionTimeoutMinutes: Number(row.session_timeout_minutes ?? 30),
    cacheTimeoutMinutes: Number(row.cache_timeout_minutes ?? 60),
    adminSessionHours: Number(row.admin_session_hours ?? 24),
    autoBackup: Boolean(row.auto_backup ?? true),
    backupFrequency: (row.backup_frequency as AppSettings['backupFrequency']) ?? 'daily',
    backupTime: String(row.backup_time ?? '02:00'),
    backupLocation: (row.backup_location as AppSettings['backupLocation']) ?? 'cloud',
    backupRetentionDays: Number(row.backup_retention_days ?? 30),
    backupEncryption: Boolean(row.backup_encryption ?? true),
    backupCompression: Boolean(row.backup_compression ?? true),
    officerTrackingEnabled: Boolean(row.officer_tracking_enabled ?? true),
    locationTrackingEnabled: Boolean(row.location_tracking_enabled ?? true),
    locationUpdateIntervalMinutes: Number(row.location_update_interval_minutes ?? 5),
    attendanceTrackingEnabled: Boolean(row.attendance_tracking_enabled ?? true),
    shiftManagementEnabled: Boolean(row.shift_management_enabled ?? true),
    autoAssignRequests: Boolean(row.auto_assign_requests ?? false),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
    smtpHost: String(row.smtp_host ?? ''),
    smtpPort: Number(row.smtp_port ?? 587),
    smtpUser: String(row.smtp_user ?? ''),
    fromAddress: String(row.from_address ?? ''),
    smsProvider: String(row.sms_provider ?? ''),
    smsApiKey: String(row.sms_api_key ?? ''),
    smsSenderId: String(row.sms_sender_id ?? ''),
    razorpayKeyId: String(row.razorpay_key_id ?? ''),
    easebuzzKey: String(row.easebuzz_key ?? row.easebuzz_merchant_id ?? ''),
    activeGateway: String(row.payment_gateway ?? 'easybuzz'),
    featureAiChatbot: Boolean(row.feature_ai_chatbot ?? true),
    featureWhatsapp: Boolean(row.feature_whatsapp ?? false),
    featureAutoInvoice: Boolean(row.feature_auto_invoice ?? true),
  };
}

function sectionToDbPatch(section: AppSettingsSection, updates: Partial<AppSettings>): Record<string, unknown> {
  switch (section) {
    case 'general':
      return {
        company_name: updates.companyName,
        company_email: updates.contactEmail,
        company_phone: updates.phoneNumber,
        company_address: updates.officeAddress,
        language: updates.language,
        currency: updates.currency,
        timezone: updates.timezone,
        date_format: updates.dateFormat,
        time_format: updates.timeFormat === '12h' ? '12 Hour' : '24 Hour',
        enable_email_notifications: updates.notifEmail,
        enable_sms_notifications: updates.notifSms,
        enable_whatsapp_notifications: updates.notifWhatsapp,
      };
    case 'notifications':
      return {
        enable_email_notifications: updates.notifEmail,
        enable_sms_notifications: updates.notifSms,
        enable_whatsapp_notifications: updates.notifWhatsapp,
        notif_push: updates.notifPush,
        notif_in_app: updates.notifInApp,
        notif_email_provider: updates.notifEmailProvider,
        notif_whatsapp_provider: updates.notifWhatsappProvider,
        notif_templates_enabled: updates.notifTemplatesEnabled,
      };
    case 'appearance':
      return {
        theme_mode: updates.themeMode,
        color_scheme: updates.colorScheme,
        dark_mode_enabled: updates.darkModeEnabled,
        font_size: updates.fontSize,
        compact_mode: updates.compactMode,
        animations_enabled: updates.animationsEnabled,
        dashboard_layout: updates.dashboardLayout,
        show_avatars: updates.showAvatars,
        show_notification_badges: updates.showNotificationBadges,
      };
    case 'system':
      return {
        maintenance_mode: updates.maintenanceMode,
        debug_mode: updates.debugMode,
        error_reporting: updates.errorReporting,
        performance_monitoring: updates.performanceMonitoring,
        query_optimization: updates.queryOptimization,
        session_timeout_minutes: updates.sessionTimeoutMinutes,
        cache_timeout_minutes: updates.cacheTimeoutMinutes,
        admin_session_hours: updates.adminSessionHours,
        auto_backup: updates.autoBackup,
      };
    case 'officers':
      return {
        officer_tracking_enabled: updates.officerTrackingEnabled,
        location_tracking_enabled: updates.locationTrackingEnabled,
        location_update_interval_minutes: updates.locationUpdateIntervalMinutes,
        attendance_tracking_enabled: updates.attendanceTrackingEnabled,
        shift_management_enabled: updates.shiftManagementEnabled,
        auto_assign_requests: updates.autoAssignRequests,
      };
    case 'backup':
      return {
        auto_backup: updates.autoBackup,
        backup_frequency: updates.backupFrequency,
        backup_time: updates.backupTime,
        backup_location: updates.backupLocation,
        backup_retention_days: updates.backupRetentionDays,
        backup_encryption: updates.backupEncryption,
        backup_compression: updates.backupCompression,
      };
    default:
      return {};
  }
}

async function upsertGeneralSettings(client: TypedSupabaseClient, patch: Record<string, unknown>) {
  const { data: existing } = await client.from('general_settings').select('id').limit(1).maybeSingle();
  const payload = { ...patch, updated_at: new Date().toISOString() };
  if (existing?.id) {
    const { error } = await client.from('general_settings').update(payload).eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await client.from('general_settings').insert(payload);
    if (error) throw error;
  }
}

export const adminSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAppSettings: builder.query<AppSettings, void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.from('general_settings').select('*').limit(1).maybeSingle();
          if (error) throw error;
          if (!data) {
            return mapRowToAppSettings({ id: '', updated_at: new Date().toISOString() });
          }
          return mapRowToAppSettings(data as Record<string, unknown>);
        },
      }),
      providesTags: ['Settings'],
    }),

    updateAppSettingsSection: builder.mutation<
      void,
      { section: AppSettingsSection; updates: Partial<AppSettings>; description: string }
    >({
      query: ({ section, updates, description }) => ({
        handler: async (client) => {
          const patch = sectionToDbPatch(section, updates);
          const cleaned = Object.fromEntries(
            Object.entries(patch).filter(([, v]) => v !== undefined),
          );
          await upsertGeneralSettings(client, cleaned);
          await logAuditEvent({
            client,
            actionType: 'UPDATE',
            category: 'settings',
            description,
            metadata: { section, fields: Object.keys(cleaned) },
          });
        },
      }),
      invalidatesTags: ['Settings'],
    }),

    getAdminProfile: builder.query<AdminProfile, void>({
      query: () => ({
        handler: async (client) => {
          const {
            data: { user },
          } = await client.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const { data: profile } = await client
            .from('profiles')
            .select('full_name, updated_at')
            .eq('id', user.id)
            .maybeSingle();

          const { data: admin } = await client
            .from('admins')
            .select('name')
            .eq('auth_user_id', user.id)
            .maybeSingle();

          return {
            id: user.id,
            displayName: String(profile?.full_name ?? admin?.name ?? user.email?.split('@')[0] ?? 'Admin'),
            email: user.email ?? '',
            updatedAt: String(profile?.updated_at ?? new Date().toISOString()),
          };
        },
      }),
      providesTags: ['Settings'],
    }),

    updateAdminDisplayName: builder.mutation<void, { displayName: string }>({
      query: ({ displayName }) => ({
        handler: async (client) => {
          const {
            data: { user },
          } = await client.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const { error } = await client
            .from('profiles')
            .upsert({
              id: user.id,
              email: user.email,
              full_name: displayName,
              updated_at: new Date().toISOString(),
            });
          if (error) throw error;

          await logAuditEvent({
            client,
            actionType: 'UPDATE',
            category: 'settings',
            description: 'Updated admin display name',
            metadata: { displayName },
          });
        },
      }),
      invalidatesTags: ['Settings', 'Auth'],
    }),

    updateAdminEmail: builder.mutation<void, { email: string }>({
      query: ({ email }) => ({
        handler: async (client) => {
          const { error } = await client.auth.updateUser({ email });
          if (error) throw error;
          await logAuditEvent({
            client,
            actionType: 'UPDATE',
            category: 'settings',
            description: 'Requested admin email change',
            metadata: { email },
          });
        },
      }),
    }),

    updateAdminPassword: builder.mutation<void, { password: string }>({
      query: ({ password }) => ({
        handler: async (client) => {
          const { error } = await client.auth.updateUser({ password });
          if (error) throw error;
          await logAuditEvent({
            client,
            actionType: 'UPDATE',
            category: 'settings',
            description: 'Updated admin password',
          });
        },
      }),
    }),

    getOfficerSalaryConfigs: builder.query<OfficerSalaryRow[], void>({
      query: () => ({
        handler: async (client) => {
          const today = new Date().toISOString().slice(0, 10);
          const { data: officers, error } = await client
            .from('officers')
            .select('id, name, email, is_active')
            .eq('is_active', true)
            .order('name');
          if (error) throw error;

          const officerIds = (officers ?? []).map((o) => o.id as string);
          if (!officerIds.length) return [];

          const [{ data: salaries }, { data: contracts }] = await Promise.all([
            client.from('officer_salary_config').select('*').in('officer_id', officerIds),
            client
              .from('officer_contracts')
              .select('officer_id, end_date')
              .in('officer_id', officerIds)
              .gte('end_date', today),
          ]);

          const salaryByOfficer = new Map(
            (salaries ?? []).map((s) => [s.officer_id as string, s]),
          );
          const activeContractOfficers = new Set(
            (contracts ?? []).map((c) => c.officer_id as string),
          );

          return (officers ?? []).map((o) => {
            const sal = salaryByOfficer.get(o.id as string);
            return {
              officerId: o.id as string,
              officerName: String(o.name ?? 'Officer'),
              officerEmail: String(o.email ?? ''),
              isActive: Boolean(o.is_active),
              hasActiveContract: activeContractOfficers.has(o.id as string),
              salary: sal
                ? {
                    id: sal.id as string,
                    officerId: sal.officer_id as string,
                    salaryType: (sal.salary_type as SalaryType) ?? 'monthly',
                    basicSalary: Number(sal.basic_salary ?? 0),
                    hra: Number(sal.hra ?? 0),
                    transportAllowance: Number(sal.transport_allowance ?? 0),
                    otherAllowances: Number(sal.other_allowances ?? 0),
                    updatedAt: String(sal.updated_at ?? ''),
                  }
                : null,
            };
          });
        },
      }),
      providesTags: ['Settings', 'Officers'],
    }),

    upsertOfficerSalaryConfig: builder.mutation<
      void,
      { officerId: string; config: Omit<OfficerSalaryConfig, 'id' | 'updatedAt'> }
    >({
      query: ({ officerId, config }) => ({
        handler: async (client) => {
          const payload = {
            officer_id: officerId,
            salary_type: config.salaryType,
            basic_salary: config.basicSalary,
            hra: config.hra,
            transport_allowance: config.transportAllowance,
            other_allowances: config.otherAllowances,
            updated_at: new Date().toISOString(),
          };
          const { error } = await client.from('officer_salary_config').upsert(payload, {
            onConflict: 'officer_id',
          });
          if (error) throw error;

          await logAuditEvent({
            client,
            actionType: 'UPDATE',
            category: 'officer',
            description: 'Updated officer salary configuration',
            metadata: { officerId, salaryType: config.salaryType },
          });
        },
      }),
      invalidatesTags: ['Settings', 'Officers'],
    }),

    getAuditLogsFiltered: builder.query<AuditLogEntry[], AuditLogFilters | void>({
      query: (filters) => ({
        handler: async (client) => {
          let query = client
            .from('audit_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(200);

          if (filters?.actionType && filters.actionType !== 'All') {
            query = query.eq('action', filters.actionType);
          }
          if (filters?.category && filters.category !== 'All') {
            query = query.eq('category', filters.category);
          }
          if (filters?.userId && filters.userId !== 'all') {
            query = query.eq('actor_id', filters.userId);
          }
          if (filters?.startDate) {
            query = query.gte('timestamp', `${filters.startDate}T00:00:00`);
          }
          if (filters?.endDate) {
            query = query.lte('timestamp', `${filters.endDate}T23:59:59`);
          }
          if (filters?.search?.trim()) {
            const term = `%${filters.search.trim()}%`;
            query = query.or(`description.ilike.${term},action.ilike.${term},category.ilike.${term}`);
          }

          const { data, error } = await query;
          if (error) throw error;

          return (data ?? []).map((row) => ({
            id: row.id as string,
            timestamp: row.timestamp as string,
            actorId: (row.actor_id as string) ?? null,
            actorRole: (row.actor_role as string) ?? null,
            action: row.action as string,
            category: (row.category as string) ?? (row.target_entity as string) ?? null,
            description: (row.description as string) ?? (row.action as string) ?? null,
            targetEntity: (row.target_entity as string) ?? null,
            metadata: (row.metadata as Record<string, unknown>) ?? null,
            status: (row.status as string) ?? null,
          }));
        },
      }),
      providesTags: ['Audit'],
    }),

    getAuditLogUsers: builder.query<{ id: string; label: string }[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('audit_logs')
            .select('actor_id')
            .not('actor_id', 'is', null)
            .limit(500);
          if (error) throw error;
          const ids = [...new Set((data ?? []).map((r) => r.actor_id as string))];
          if (!ids.length) return [];

          const { data: users } = await client.from('users').select('id, name, email').in('id', ids);
          return (users ?? []).map((u) => ({
            id: u.id as string,
            label: String(u.name ?? u.email ?? u.id),
          }));
        },
      }),
      providesTags: ['Audit'],
    }),

    getBackupFiles: builder.query<BackupFile[], void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client
            .from('admin_backup_files')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
          if (error) throw error;
          return (data ?? []).map((row) => ({
            id: row.id as string,
            filename: row.filename as string,
            sizeKb: Math.round(Number(row.size_bytes ?? 0) / 1024),
            type: ((row.type as string) ?? 'sql') as BackupFile['type'],
            storagePath: row.storage_path as string,
            createdAt: row.created_at as string,
          }));
        },
      }),
      providesTags: ['Settings'],
    }),

    deleteBackupFile: builder.mutation<void, { backupId: string }>({
      query: ({ backupId }) => ({
        handler: async (client) => {
          const { error } = await client.functions.invoke('admin-backup-export', {
            body: { action: 'delete_backup', backupId },
          });
          if (error) throw error;
          await logAuditEvent({
            client,
            actionType: 'DELETE',
            category: 'backup',
            description: 'Deleted backup file',
            metadata: { backupId },
          });
        },
      }),
      invalidatesTags: ['Settings'],
    }),

    triggerSqlBackup: builder.mutation<{ backupId?: string }, void>({
      query: () => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('admin-backup-export', {
            body: { action: 'create_sql_backup' },
          });
          if (error) throw error;
          await logAuditEvent({
            client,
            actionType: 'BACKUP',
            category: 'backup',
            description: 'Created SQL backup',
          });
          const backupId =
            data && typeof data === 'object' && 'backupId' in data
              ? String((data as { backupId?: string }).backupId)
              : undefined;
          return { backupId };
        },
      }),
      invalidatesTags: ['Settings'],
    }),

    exportSettingsXlsx: builder.mutation<{ blob: Blob; filename: string }, { action: string }>({
      query: ({ action }) => ({
        handler: async (client) => {
          const { data, error } = await client.functions.invoke('admin-backup-export', {
            body: { action },
          });
          if (error) throw error;
          if (!(data instanceof Blob)) {
            throw new Error('Export failed — edge function may not be configured');
          }
          const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + 'Z';
          const filenames: Record<string, string> = {
            export_users: `users_export_${stamp}.xlsx`,
            export_officers: `officers_export_${stamp}.xlsx`,
            export_reports: `reports_snapshot_${stamp}.xlsx`,
            export_transactions: `transactions_export_${stamp}.xlsx`,
            export_workbook: `prime_fibernet_full_export_${stamp}.xlsx`,
          };
          await logAuditEvent({
            client,
            actionType: 'EXPORT',
            category: 'backup',
            description: `Exported ${action}`,
            metadata: { action },
          });
          return { blob: data, filename: filenames[action] ?? 'export.xlsx' };
        },
      }),
    }),

    forceOfficerLogout: builder.mutation<void, { officerId: string }>({
      query: ({ officerId }) => ({
        handler: async (client) => {
          await logAuditEvent({
            client,
            actionType: 'UPDATE',
            category: 'security',
            description: 'Force logout requested for officer',
            metadata: { officerId },
          });
        },
      }),
    }),

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
              gstNumber: row.company_gstin ?? row.gst_number,
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
          const mapped = {
            company_name: updates.name,
            company_email: updates.email,
            company_address: updates.address,
            company_gstin: updates.gstNumber,
            company_phone: updates.phone,
          };
          await upsertGeneralSettings(client, mapped);
          await logAuditEvent({
            client,
            actionType: 'UPDATE',
            category: 'settings',
            description: 'Updated company settings',
          });
        },
      }),
      invalidatesTags: ['Settings'],
    }),

    updateEmailSettings: builder.mutation<void, Record<string, unknown>>({
      query: (updates) => ({
        handler: async (client) => {
          await upsertGeneralSettings(client, {
            smtp_host: updates.smtpHost,
            smtp_port: updates.smtpPort,
            smtp_user: updates.smtpUser,
            from_address: updates.fromAddress,
          });
          await logAuditEvent({
            client,
            actionType: 'UPDATE',
            category: 'settings',
            description: 'Updated email integration settings',
          });
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
          await upsertGeneralSettings(client, {
            razorpay_key_id: updates.razorpayKeyId,
            easebuzz_key: updates.easebuzzKey,
            payment_gateway: updates.activeGateway,
          });
          await logAuditEvent({
            client,
            actionType: 'UPDATE',
            category: 'settings',
            description: 'Updated payment gateway settings',
          });
        },
      }),
      invalidatesTags: ['Settings'],
    }),

    updateSmsSettings: builder.mutation<void, Record<string, unknown>>({
      query: (updates) => ({
        handler: async (client) => {
          await upsertGeneralSettings(client, {
            sms_provider: updates.provider,
            sms_api_key: updates.apiKey,
            sms_sender_id: updates.senderId,
          });
          await logAuditEvent({
            client,
            actionType: 'UPDATE',
            category: 'settings',
            description: 'Updated SMS integration settings',
          });
        },
      }),
      invalidatesTags: ['Settings'],
    }),

    updateGeneralSettings: builder.mutation<void, Record<string, unknown>>({
      query: (updates) => ({
        handler: async (client) => {
          await upsertGeneralSettings(client, {
            timezone: updates.timezone,
            currency: updates.currency,
            date_format: updates.dateFormat,
          });
          await logAuditEvent({
            client,
            actionType: 'UPDATE',
            category: 'settings',
            description: 'Updated regional settings',
          });
        },
      }),
      invalidatesTags: ['Settings'],
    }),

    updateFeatureFlags: builder.mutation<void, Record<string, unknown>>({
      query: (updates) => ({
        handler: async (client) => {
          await upsertGeneralSettings(client, {
            feature_ai_chatbot: updates.aiChatbot,
            feature_whatsapp: updates.whatsapp,
            feature_auto_invoice: updates.autoInvoice,
          });
          await logAuditEvent({
            client,
            actionType: 'UPDATE',
            category: 'settings',
            description: 'Updated feature flags',
          });
        },
      }),
      invalidatesTags: ['Settings'],
    }),
  }),
});

export const {
  useGetAppSettingsQuery,
  useUpdateAppSettingsSectionMutation,
  useGetAdminProfileQuery,
  useUpdateAdminDisplayNameMutation,
  useUpdateAdminEmailMutation,
  useUpdateAdminPasswordMutation,
  useGetOfficerSalaryConfigsQuery,
  useUpsertOfficerSalaryConfigMutation,
  useGetAuditLogsFilteredQuery,
  useGetAuditLogUsersQuery,
  useGetBackupFilesQuery,
  useDeleteBackupFileMutation,
  useTriggerSqlBackupMutation,
  useExportSettingsXlsxMutation,
  useForceOfficerLogoutMutation,
  useGetFullAdminSettingsQuery,
  useUpdateCompanySettingsMutation,
  useUpdateEmailSettingsMutation,
  useTestEmailSettingsMutation,
  useUpdatePaymentGatewaySettingsMutation,
  useUpdateSmsSettingsMutation,
  useUpdateGeneralSettingsMutation,
  useUpdateFeatureFlagsMutation,
} = adminSettingsApi;
