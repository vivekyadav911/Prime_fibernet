-- Settings panel: extend general_settings, audit_logs, admin_backup_files; add officer_salary_config

-- SMTP / SMS / feature columns (referenced by adminSettingsApi)
ALTER TABLE public.general_settings
  ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255),
  ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587,
  ADD COLUMN IF NOT EXISTS smtp_user VARCHAR(255),
  ADD COLUMN IF NOT EXISTS from_address VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sms_provider VARCHAR(50),
  ADD COLUMN IF NOT EXISTS sms_api_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sms_sender_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS feature_ai_chatbot BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_whatsapp BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_auto_invoice BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS easebuzz_key VARCHAR(255);

-- Notification extensions
ALTER TABLE public.general_settings
  ADD COLUMN IF NOT EXISTS notif_push BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_in_app BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_email_provider TEXT DEFAULT 'resend',
  ADD COLUMN IF NOT EXISTS notif_whatsapp_provider TEXT DEFAULT 'whatsapp_business_api',
  ADD COLUMN IF NOT EXISTS notif_templates_enabled BOOLEAN DEFAULT true;

-- Appearance
ALTER TABLE public.general_settings
  ADD COLUMN IF NOT EXISTS theme_mode TEXT DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS color_scheme TEXT DEFAULT 'purple',
  ADD COLUMN IF NOT EXISTS dark_mode_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS font_size INTEGER DEFAULT 14,
  ADD COLUMN IF NOT EXISTS compact_mode BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS animations_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS dashboard_layout TEXT DEFAULT 'grid',
  ADD COLUMN IF NOT EXISTS show_avatars BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_notification_badges BOOLEAN DEFAULT true;

-- System
ALTER TABLE public.general_settings
  ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS debug_mode BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS error_reporting BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS performance_monitoring BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS query_optimization BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS session_timeout_minutes INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS cache_timeout_minutes INTEGER DEFAULT 60;

-- Backup
ALTER TABLE public.general_settings
  ADD COLUMN IF NOT EXISTS auto_backup BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS backup_frequency TEXT DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS backup_time TEXT DEFAULT '02:00',
  ADD COLUMN IF NOT EXISTS backup_location TEXT DEFAULT 'cloud',
  ADD COLUMN IF NOT EXISTS backup_retention_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS backup_encryption BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS backup_compression BOOLEAN DEFAULT true;

-- Officers / workforce settings
ALTER TABLE public.general_settings
  ADD COLUMN IF NOT EXISTS officer_tracking_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS location_tracking_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS location_update_interval_minutes INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS attendance_tracking_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS shift_management_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_assign_requests BOOLEAN DEFAULT false;

-- Audit log extensions
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON public.audit_logs(category);

UPDATE public.audit_logs
SET
  category = COALESCE(category, target_entity),
  description = COALESCE(description, action)
WHERE category IS NULL OR description IS NULL;

-- Backup file type
ALTER TABLE public.admin_backup_files
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'sql';

-- Officer salary config (dedicated table)
CREATE TABLE IF NOT EXISTS public.officer_salary_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES public.officers(id) ON DELETE CASCADE,
  salary_type TEXT DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'daily', 'hourly')),
  basic_salary NUMERIC DEFAULT 0,
  hra NUMERIC DEFAULT 0,
  transport_allowance NUMERIC DEFAULT 0,
  other_allowances NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(officer_id)
);

ALTER TABLE public.officer_salary_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS officer_salary_config_admin ON public.officer_salary_config;
CREATE POLICY officer_salary_config_admin ON public.officer_salary_config
  FOR ALL USING (public.is_admin_user());

-- Backfill salary config from officers JSONB / base_salary
INSERT INTO public.officer_salary_config (officer_id, salary_type, basic_salary, hra, transport_allowance, other_allowances)
SELECT
  o.id,
  COALESCE(o.salary_config->>'salary_type', 'monthly'),
  COALESCE(
    NULLIF((o.salary_config->>'basic')::NUMERIC, 0),
    NULLIF((o.salary_config->>'basic_salary')::NUMERIC, 0),
    o.base_salary,
    0
  ),
  COALESCE((o.salary_config->>'hra')::NUMERIC, 0),
  COALESCE((o.salary_config->>'transport_allowance')::NUMERIC, 0),
  COALESCE((o.salary_config->>'other_allowances')::NUMERIC, 0)
FROM public.officers o
WHERE NOT EXISTS (
  SELECT 1 FROM public.officer_salary_config osc WHERE osc.officer_id = o.id
);

-- Ensure single general_settings row
INSERT INTO public.general_settings (company_name, company_email, payment_gateway)
SELECT 'Prime Fibernet', 'support@primefibernet.com', 'easybuzz'
WHERE NOT EXISTS (SELECT 1 FROM public.general_settings LIMIT 1);
