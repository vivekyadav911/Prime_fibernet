-- Phase 2 foundation: schema fixes, payment gateway, RLS gaps

-- Allow pending payments (EasyBuzz/Razorpay flow)
ALTER TABLE user_payments DROP CONSTRAINT IF EXISTS user_payments_payment_status_check;
ALTER TABLE user_payments ADD CONSTRAINT user_payments_payment_status_check
  CHECK (payment_status IN ('pending', 'success', 'failed', 'refunded'));

-- Payment gateway on general_settings
ALTER TABLE public.general_settings
  ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR DEFAULT 'easybuzz'
    CHECK (payment_gateway IN ('razorpay', 'easybuzz'));

ALTER TABLE public.general_settings
  ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}';

ALTER TABLE public.general_settings
  ADD COLUMN IF NOT EXISTS razorpay_key_id VARCHAR,
  ADD COLUMN IF NOT EXISTS easybuzz_merchant_id VARCHAR;

-- Extend user_payments for invoices
ALTER TABLE user_payments
  ADD COLUMN IF NOT EXISTS invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id),
  ADD COLUMN IF NOT EXISTS gateway VARCHAR;

-- Officer auth_user_id alignment (legacy column)
ALTER TABLE officers ADD COLUMN IF NOT EXISTS auth_user_id UUID;

UPDATE officers SET auth_user_id = user_id WHERE auth_user_id IS NULL AND user_id IS NOT NULL;

-- Inventory items table if missing link
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  sku VARCHAR,
  category VARCHAR,
  quantity INTEGER DEFAULT 0,
  status VARCHAR DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification queue for bulk push
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  body TEXT NOT NULL,
  audience VARCHAR DEFAULT 'all',
  audience_filter JSONB DEFAULT '{}',
  status VARCHAR DEFAULT 'pending',
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Chatbot conversations
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  reply TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update public settings RPC
CREATE OR REPLACE FUNCTION public.get_public_company_settings()
RETURNS TABLE (
  company_name text,
  company_email text,
  company_phone text,
  company_address text,
  company_city text,
  company_state text,
  company_country text,
  company_website text,
  company_gstin text,
  language text,
  currency text,
  currency_symbol text,
  timezone text,
  date_format text,
  time_format text,
  payment_gateway text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    gs.company_name, gs.company_email, gs.company_phone, gs.company_address,
    gs.company_city, gs.company_state, gs.company_country, gs.company_website,
    gs.company_gstin, gs.language, gs.currency, gs.currency_symbol,
    gs.timezone, gs.date_format, gs.time_format,
    COALESCE(gs.payment_gateway, 'easybuzz')
  FROM public.general_settings gs
  LIMIT 1;
$$;

-- RLS: inventory
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_officer_read ON public.inventory_assignments;
CREATE POLICY inventory_officer_read ON public.inventory_assignments FOR SELECT USING (
  assigned_to_id IN (SELECT id FROM officers WHERE user_id = auth.uid() OR auth_user_id = auth.uid())
  OR public.is_admin()
);
DROP POLICY IF EXISTS inventory_items_read ON public.inventory_items;
CREATE POLICY inventory_items_read ON public.inventory_items FOR SELECT USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM inventory_assignments ia
    JOIN officers o ON ia.assigned_to_id = o.id
    WHERE ia.item_id = inventory_items.id
      AND (o.user_id = auth.uid() OR o.auth_user_id = auth.uid())
  )
);

-- RLS: audit logs insert (admin actions)
DROP POLICY IF EXISTS audit_logs_admin_insert ON audit_logs;
CREATE POLICY audit_logs_admin_insert ON audit_logs FOR INSERT WITH CHECK (public.is_admin());

-- RLS: notification queue (admin)
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_queue_admin ON public.notification_queue;
CREATE POLICY notification_queue_admin ON public.notification_queue FOR ALL USING (public.is_admin());

-- RLS: chatbot conversations
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chatbot_own ON public.chatbot_conversations;
CREATE POLICY chatbot_own ON public.chatbot_conversations FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- RLS: request activities
DROP POLICY IF EXISTS request_activities_read ON request_activities;
CREATE POLICY request_activities_read ON request_activities FOR SELECT USING (
  request_id IN (
    SELECT id FROM service_requests sr
    WHERE sr.user_id = auth.uid()
      OR sr.officer_id IN (SELECT id FROM officers WHERE user_id = auth.uid() OR auth_user_id = auth.uid())
      OR public.is_admin()
  )
);
DROP POLICY IF EXISTS request_activities_insert ON request_activities;
CREATE POLICY request_activities_insert ON request_activities FOR INSERT WITH CHECK (
  public.is_admin()
  OR officer_id IN (SELECT id FROM officers WHERE user_id = auth.uid() OR auth_user_id = auth.uid())
);

-- RLS: customers insert payments (via edge function uses service role)
DROP POLICY IF EXISTS customers_insert_payments ON user_payments;
CREATE POLICY customers_insert_payments ON user_payments FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- RLS: officer update shifts
DROP POLICY IF EXISTS officer_update_shifts ON shifts;
CREATE POLICY officer_update_shifts ON shifts FOR UPDATE USING (
  officer_id IN (SELECT id FROM officers WHERE user_id = auth.uid() OR auth_user_id = auth.uid())
  OR public.is_admin()
);

-- RLS: admin manage subscriptions
DROP POLICY IF EXISTS admin_manage_subscriptions ON subscriptions;
CREATE POLICY admin_manage_subscriptions ON subscriptions FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS customers_insert_subscriptions ON subscriptions;
CREATE POLICY customers_insert_subscriptions ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- RLS: admin manage plans insert/update for customers read already exists
DROP POLICY IF EXISTS admin_insert_plans ON plans;
CREATE POLICY admin_insert_plans ON plans FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS admin_update_plans ON plans;
CREATE POLICY admin_update_plans ON plans FOR UPDATE USING (public.is_admin());
DROP POLICY IF EXISTS admin_delete_plans ON plans;
CREATE POLICY admin_delete_plans ON plans FOR DELETE USING (public.is_admin());

-- RLS: general_settings public read for payment_gateway only via RPC (already SECURITY DEFINER)

-- Seed default general_settings row if empty
INSERT INTO public.general_settings (company_name, company_email, payment_gateway)
SELECT 'Prime Fibernet', 'support@primefibernet.local', 'easybuzz'
WHERE NOT EXISTS (SELECT 1 FROM public.general_settings LIMIT 1);

-- Seed company_info if empty
INSERT INTO public.company_info (company_name, tagline)
SELECT 'Prime Fibernet', 'Fast. Reliable. Connected.'
WHERE NOT EXISTS (SELECT 1 FROM public.company_info LIMIT 1);
