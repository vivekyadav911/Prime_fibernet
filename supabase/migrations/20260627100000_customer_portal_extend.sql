-- Customer portal v2: extend plans/subscriptions, plan change requests,
-- ticket customer messages, portal notification categories, customer ticket RLS

-- ============================================================
-- Helper alias
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_customer_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_customer_user_id();
$$;

-- ============================================================
-- Extend plans
-- ============================================================
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS price_quarterly NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_annual NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS data_limit_gb INTEGER,
  ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

UPDATE public.plans
SET is_unlimited = true
WHERE is_unlimited IS NOT true
  AND (data_limit IS NULL OR LOWER(data_limit) IN ('unlimited', 'unlimted', 'none', ''));

UPDATE public.plans
SET price_quarterly = ROUND(price * 2.85, 2)
WHERE price_quarterly IS NULL AND price IS NOT NULL;

UPDATE public.plans
SET price_annual = ROUND(price * 10, 2)
WHERE price_annual IS NULL AND price IS NOT NULL;

-- ============================================================
-- Extend subscriptions
-- ============================================================
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_name TEXT,
  ADD COLUMN IF NOT EXISTS speed_mbps INTEGER,
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT,
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_billing_cycle_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_billing_cycle_check
  CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly', 'quarterly', 'annual'));

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'expired', 'cancelled', 'suspended', 'pending'));

-- Backfill snapshot fields from plans
UPDATE public.subscriptions s
SET
  plan_name = COALESCE(s.plan_name, p.name),
  speed_mbps = COALESCE(s.speed_mbps, p.speed_mbps)
FROM public.plans p
WHERE s.plan_id = p.id
  AND (s.plan_name IS NULL OR s.speed_mbps IS NULL);

-- ============================================================
-- Plan change requests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.plan_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  current_plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  requested_plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  requested_cycle TEXT NOT NULL CHECK (requested_cycle IN ('monthly', 'quarterly', 'annual')),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'processing')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  effective_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_change_requests_customer
  ON public.plan_change_requests(customer_id, status, created_at DESC);

-- ============================================================
-- Ticket customer messages (customer-visible thread)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ticket_customer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'officer', 'admin', 'system')),
  sender_id UUID,
  message TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_customer_messages_ticket
  ON public.ticket_customer_messages(ticket_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_tickets_customer_id
  ON public.tickets(customer_id, updated_at DESC)
  WHERE customer_id IS NOT NULL;

-- ============================================================
-- Extend portal_notifications
-- ============================================================
ALTER TABLE public.portal_notifications
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS action_url TEXT;

ALTER TABLE public.portal_notifications DROP CONSTRAINT IF EXISTS portal_notifications_category_check;
ALTER TABLE public.portal_notifications
  ADD CONSTRAINT portal_notifications_category_check
  CHECK (category IS NULL OR category IN ('payment', 'plan', 'ticket', 'outage', 'promo', 'system'));

-- ============================================================
-- RLS: plan_change_requests
-- ============================================================
ALTER TABLE public.plan_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plan_change_customer_select ON public.plan_change_requests;
CREATE POLICY plan_change_customer_select ON public.plan_change_requests
  FOR SELECT USING (customer_id = public.get_customer_id());

DROP POLICY IF EXISTS plan_change_customer_insert ON public.plan_change_requests;
CREATE POLICY plan_change_customer_insert ON public.plan_change_requests
  FOR INSERT WITH CHECK (customer_id = public.get_customer_id());

DROP POLICY IF EXISTS plan_change_customer_update ON public.plan_change_requests;
CREATE POLICY plan_change_customer_update ON public.plan_change_requests
  FOR UPDATE USING (customer_id = public.get_customer_id());

DROP POLICY IF EXISTS plan_change_admin_all ON public.plan_change_requests;
CREATE POLICY plan_change_admin_all ON public.plan_change_requests
  FOR ALL USING (public.is_admin_user() OR public.is_admin());

-- ============================================================
-- RLS: ticket_customer_messages
-- ============================================================
ALTER TABLE public.ticket_customer_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ticket_msg_customer_select ON public.ticket_customer_messages;
CREATE POLICY ticket_msg_customer_select ON public.ticket_customer_messages
  FOR SELECT USING (
    ticket_id IN (
      SELECT t.id FROM public.tickets t
      WHERE t.customer_id = public.get_customer_id()
    )
    OR public.is_admin_user()
    OR public.is_admin()
    OR ticket_id IN (
      SELECT t.id FROM public.tickets t
      JOIN public.officers o ON o.id = t.assigned_officer_id
      WHERE o.user_id = auth.uid() OR o.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS ticket_msg_customer_insert ON public.ticket_customer_messages;
CREATE POLICY ticket_msg_customer_insert ON public.ticket_customer_messages
  FOR INSERT WITH CHECK (
    (
      sender_type = 'customer'
      AND ticket_id IN (
        SELECT t.id FROM public.tickets t
        WHERE t.customer_id = public.get_customer_id()
      )
    )
    OR public.is_admin_user()
    OR public.is_admin()
    OR (
      sender_type IN ('officer', 'admin')
      AND ticket_id IN (
        SELECT t.id FROM public.tickets t
        JOIN public.officers o ON o.id = t.assigned_officer_id
        WHERE o.user_id = auth.uid() OR o.auth_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS ticket_msg_admin_all ON public.ticket_customer_messages;
CREATE POLICY ticket_msg_admin_all ON public.ticket_customer_messages
  FOR ALL USING (public.is_admin_user() OR public.is_admin());

-- ============================================================
-- RLS: customer tickets
-- ============================================================
DROP POLICY IF EXISTS customers_select_own_tickets ON public.tickets;
CREATE POLICY customers_select_own_tickets ON public.tickets
  FOR SELECT USING (customer_id = public.get_customer_id());

DROP POLICY IF EXISTS customers_insert_own_tickets ON public.tickets;
CREATE POLICY customers_insert_own_tickets ON public.tickets
  FOR INSERT WITH CHECK (
    customer_id = public.get_customer_id()
    AND source = 'portal'
  );

DROP POLICY IF EXISTS customers_update_own_tickets ON public.tickets;
CREATE POLICY customers_update_own_tickets ON public.tickets
  FOR UPDATE USING (customer_id = public.get_customer_id())
  WITH CHECK (customer_id = public.get_customer_id());

-- ============================================================
-- Realtime publication
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'plan_change_requests',
    'ticket_customer_messages',
    'payments',
    'subscriptions'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;
