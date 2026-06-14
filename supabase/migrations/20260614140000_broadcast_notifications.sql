-- Broadcast Notifications Management module

CREATE TABLE IF NOT EXISTS public.broadcast_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Normal',
  event_type TEXT NOT NULL DEFAULT 'none',
  status TEXT NOT NULL DEFAULT 'draft',
  audience_type TEXT NOT NULL,
  audience_plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  audience_plan_name TEXT,
  audience_area TEXT,
  audience_user_ids UUID[],
  audience_user_names TEXT[],
  audience_officer_ids UUID[],
  audience_estimated_count INTEGER DEFAULT 0,
  is_scheduled BOOLEAN DEFAULT false,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  total_targeted INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  delivery_rate DECIMAL(5,4) DEFAULT 0,
  open_rate DECIMAL(5,4) DEFAULT 0,
  processing_ms INTEGER DEFAULT 0,
  failed_tokens TEXT[] DEFAULT '{}',
  is_draft BOOLEAN DEFAULT true,
  is_auto_generated BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  deep_link_url TEXT,
  image_url TEXT,
  linked_request_id UUID,
  linked_ticket_id UUID,
  linked_plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  created_by_id TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.broadcast_notifications(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_type TEXT NOT NULL,
  push_token TEXT,
  delivery_status TEXT DEFAULT 'pending',
  failure_reason TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'Normal',
  event_type TEXT DEFAULT 'none',
  audience_type TEXT DEFAULT 'all_users',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend push token registry for audience targeting
ALTER TABLE public.user_fcm_tokens ADD COLUMN IF NOT EXISTS user_type TEXT;
ALTER TABLE public.user_fcm_tokens ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL;
ALTER TABLE public.user_fcm_tokens ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.user_fcm_tokens ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

UPDATE public.user_fcm_tokens t
SET user_type = u.role
FROM public.users u
WHERE t.user_id = u.id AND (t.user_type IS NULL OR t.user_type = '');

CREATE INDEX IF NOT EXISTS idx_broadcast_notifications_status_scheduled
  ON public.broadcast_notifications(status, scheduled_at)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_broadcast_notifications_drafts
  ON public.broadcast_notifications(is_draft, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_recipients_notification
  ON public.notification_recipients(notification_id);

CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_user_type
  ON public.user_fcm_tokens(user_type) WHERE is_active = true;

-- RLS
ALTER TABLE public.broadcast_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY broadcast_notifications_admin ON public.broadcast_notifications
  FOR ALL USING (public.is_admin());

CREATE POLICY notification_recipients_admin ON public.notification_recipients
  FOR ALL USING (public.is_admin());

CREATE POLICY notification_recipients_own_read ON public.notification_recipients
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY notification_templates_admin ON public.notification_templates
  FOR ALL USING (public.is_admin());

CREATE POLICY notification_templates_read ON public.notification_templates
  FOR SELECT USING (true);

-- Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'broadcast_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_notifications;
  END IF;
END $$;

-- Seed system templates
INSERT INTO public.notification_templates (name, title, message, priority, event_type, audience_type, is_system)
SELECT * FROM (VALUES
  (
    'Payment Reminder',
    'Payment Due Soon',
    'Your payment of ₹{amount} is due on {dueDate}. Please pay to avoid service interruption.',
    'High',
    'paymentReminder',
    'specific_users',
    true
  ),
  (
    'Plan Expiry Warning',
    'Your Plan Expires Soon',
    'Your {planName} plan expires on {expiryDate}. Renew now to continue enjoying uninterrupted service.',
    'High',
    'planExpiry',
    'specific_plan',
    true
  ),
  (
    'Service Disruption Alert',
    'Service Maintenance Scheduled',
    'We will be performing maintenance in your area on {date} from {startTime} to {endTime}.',
    'Urgent',
    'maintenanceAlert',
    'specific_area',
    true
  ),
  (
    'Welcome Message',
    'Welcome to Prime Fibernet!',
    'Welcome {customerName}! Your {planName} connection is now active. Enjoy {speedMbps} Mbps internet.',
    'Normal',
    'welcomeMessage',
    'specific_users',
    true
  ),
  (
    'New Offer',
    'Special Offer Just for You!',
    'Upgrade to our new {planName} plan and get {offerDetails}. Limited time offer!',
    'High',
    'newOffer',
    'active_users',
    true
  )
) AS v(name, title, message, priority, event_type, audience_type, is_system)
WHERE NOT EXISTS (SELECT 1 FROM public.notification_templates WHERE is_system = true LIMIT 1);
