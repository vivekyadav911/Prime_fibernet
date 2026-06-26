-- Notification delivery fix: RLS hardening, automation rules, recurring schedules

-- ============================================================
-- RLS: user_fcm_tokens admin read (debugging fallback)
-- ============================================================
DROP POLICY IF EXISTS user_fcm_tokens_admin_read ON public.user_fcm_tokens;
CREATE POLICY user_fcm_tokens_admin_read ON public.user_fcm_tokens
  FOR SELECT USING (public.is_admin() OR public.is_admin_user());

-- ============================================================
-- RLS: broadcast_notifications align with is_admin_user
-- ============================================================
DROP POLICY IF EXISTS broadcast_notifications_admin ON public.broadcast_notifications;
CREATE POLICY broadcast_notifications_admin ON public.broadcast_notifications
  FOR ALL USING (public.is_admin() OR public.is_admin_user())
  WITH CHECK (public.is_admin() OR public.is_admin_user());

DROP POLICY IF EXISTS notification_recipients_admin ON public.notification_recipients;
CREATE POLICY notification_recipients_admin ON public.notification_recipients
  FOR ALL USING (public.is_admin() OR public.is_admin_user())
  WITH CHECK (public.is_admin() OR public.is_admin_user());

DROP POLICY IF EXISTS notification_templates_admin ON public.notification_templates;
CREATE POLICY notification_templates_admin ON public.notification_templates
  FOR ALL USING (public.is_admin() OR public.is_admin_user())
  WITH CHECK (public.is_admin() OR public.is_admin_user());

-- ============================================================
-- Event-based automation rules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notification_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  channels JSONB NOT NULL DEFAULT '{"push": true, "in_app": true, "email": false, "sms": false}'::jsonb,
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Normal',
  audience_type TEXT NOT NULL DEFAULT 'specific_users',
  event_type TEXT NOT NULL DEFAULT 'none',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_automation_rules_event_key
  ON public.notification_automation_rules(event_key);

ALTER TABLE public.notification_automation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_automation_rules_admin ON public.notification_automation_rules;
CREATE POLICY notification_automation_rules_admin ON public.notification_automation_rules
  FOR ALL USING (public.is_admin() OR public.is_admin_user())
  WITH CHECK (public.is_admin() OR public.is_admin_user());

DROP POLICY IF EXISTS notification_automation_rules_read ON public.notification_automation_rules;
CREATE POLICY notification_automation_rules_read ON public.notification_automation_rules
  FOR SELECT USING (true);

-- Seed automation rules
INSERT INTO public.notification_automation_rules (
  event_key, label, description, enabled, channels,
  title_template, message_template, priority, audience_type, event_type
) VALUES
  (
    'welcome_message',
    'Welcome Message',
    'Sent when a new customer account is created',
    true,
    '{"push": true, "in_app": true, "email": false, "sms": false}'::jsonb,
    'Welcome to Prime Fibernet!',
    'Hi {customerName}, your {planName} connection is now active!',
    'Normal',
    'specific_users',
    'welcomeMessage'
  ),
  (
    'request_update',
    'Request Status Update',
    'Sent when a service request is assigned or completed',
    true,
    '{"push": true, "in_app": true, "email": false, "sms": false}'::jsonb,
    'Request update',
    '{message}',
    'Normal',
    'specific_users',
    'requestUpdate'
  ),
  (
    'ticket_update',
    'Ticket Update',
    'Sent when a support ticket is resolved',
    true,
    '{"push": true, "in_app": true, "email": false, "sms": false}'::jsonb,
    'Your complaint has been resolved',
    'Ticket #{ticketNumber} — {message}',
    'Normal',
    'specific_users',
    'ticketUpdate'
  ),
  (
    'subscription_expiry',
    'Subscription Expiry Reminder',
    'Sent 7 days before a subscription expires',
    true,
    '{"push": true, "in_app": true, "email": false, "sms": false}'::jsonb,
    'Subscription expiring soon',
    'Your plan expires in 7 days. Renew now to avoid service interruption.',
    'High',
    'specific_users',
    'planExpiry'
  ),
  (
    'payment_reminder',
    'Payment Reminder',
    'Sent when a payment is due',
    true,
    '{"push": true, "in_app": true, "email": false, "sms": false}'::jsonb,
    'Payment Due Soon',
    'Your payment of ₹{amount} is due on {dueDate}. Please pay to avoid service interruption.',
    'High',
    'specific_users',
    'paymentReminder'
  ),
  (
    'sla_breach',
    'SLA Breach Alert',
    'Sent to assigned officer when a ticket breaches SLA',
    true,
    '{"push": true, "in_app": true, "email": false, "sms": false}'::jsonb,
    'SLA Breach',
    'Ticket {ticketNumber} has breached SLA resolution deadline.',
    'Urgent',
    'specific_users',
    'ticketUpdate'
  )
ON CONFLICT (event_key) DO NOTHING;

-- ============================================================
-- Recurring scheduled broadcasts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notification_recurring_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Normal',
  event_type TEXT NOT NULL DEFAULT 'none',
  audience_type TEXT NOT NULL DEFAULT 'active_users',
  audience_plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  audience_plan_name TEXT,
  audience_area TEXT,
  audience_user_ids UUID[],
  audience_user_names TEXT[],
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  time_of_day TEXT NOT NULL DEFAULT '09:00',
  day_of_week INTEGER CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by_id TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_recurring_schedules_next_run
  ON public.notification_recurring_schedules(enabled, next_run_at)
  WHERE enabled = true;

ALTER TABLE public.notification_recurring_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_recurring_schedules_admin ON public.notification_recurring_schedules;
CREATE POLICY notification_recurring_schedules_admin ON public.notification_recurring_schedules
  FOR ALL USING (public.is_admin() OR public.is_admin_user())
  WITH CHECK (public.is_admin() OR public.is_admin_user());

-- ============================================================
-- Cron setup documentation (configure per project via Supabase Dashboard or pg_cron)
-- ============================================================
-- SELECT cron.schedule(
--   'process-scheduled-notifications',
--   '*/10 * * * *',
--   $$SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/process-scheduled-notifications',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
--     body := '{}'::jsonb
--   )$$
-- );
-- SELECT cron.schedule(
--   'process-recurring-notifications',
--   '*/15 * * * *',
--   $$SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/process-recurring-notifications',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
--     body := '{}'::jsonb
--   )$$
-- );
