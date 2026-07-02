-- Payment collection enterprise: unified open pool, timeline, manual payments, notifications

-- ============================================================
-- 1. Payments: collection_source + extended methods
-- ============================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS collection_source TEXT DEFAULT 'field_collection'
    CHECK (collection_source IN ('field_collection', 'manual_remote', 'online', 'auto'));

DO $$ BEGIN
  ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'bank_transfer';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'other';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

UPDATE public.payments
SET collection_source = CASE
  WHEN channel IN ('online_app', 'online_web', 'officer_online', 'auto_debit') THEN 'online'
  WHEN channel = 'office_cash' THEN 'manual_remote'
  ELSE 'field_collection'
END
WHERE collection_source IS NULL OR collection_source = 'field_collection';

-- ============================================================
-- 2. Shared entity activity timeline
-- ============================================================
CREATE TABLE IF NOT EXISTS public.entity_activity_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('payment', 'assignment')),
  entity_id UUID NOT NULL,
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  status TEXT,
  title TEXT NOT NULL,
  notes TEXT,
  actor_id UUID,
  actor_role TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entity_activity_customer
  ON public.entity_activity_timeline(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entity_activity_entity
  ON public.entity_activity_timeline(entity_type, entity_id, created_at DESC);

ALTER TABLE public.entity_activity_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS entity_activity_timeline_admin ON public.entity_activity_timeline;
CREATE POLICY entity_activity_timeline_admin ON public.entity_activity_timeline
  FOR ALL USING (public.is_admin() OR public.is_admin_user());

DROP POLICY IF EXISTS entity_activity_timeline_officer_read ON public.entity_activity_timeline;
CREATE POLICY entity_activity_timeline_officer_read ON public.entity_activity_timeline
  FOR SELECT USING (
    public.current_officer_id() IS NOT NULL
    OR public.current_customer_user_id() = customer_id
  );

CREATE OR REPLACE FUNCTION public.log_entity_activity(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_customer_id UUID,
  p_event_type TEXT,
  p_status TEXT,
  p_title TEXT,
  p_notes TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_actor_role TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.entity_activity_timeline (
    entity_type, entity_id, customer_id, event_type, status, title, notes, actor_id, actor_role, metadata
  ) VALUES (
    p_entity_type, p_entity_id, p_customer_id, p_event_type, p_status, p_title, p_notes, p_actor_id, p_actor_role, p_metadata
  );
END;
$$;

-- Backfill assignment events into shared timeline
INSERT INTO public.entity_activity_timeline (
  entity_type, entity_id, customer_id, event_type, status, title, notes, actor_id, actor_role, created_at
)
SELECT
  'assignment',
  e.id,
  e.customer_id,
  e.status,
  e.status,
  initcap(replace(e.status, '_', ' ')),
  e.notes,
  e.actor_id,
  e.actor_role,
  e.created_at
FROM public.collection_assignment_events e
WHERE NOT EXISTS (
  SELECT 1 FROM public.entity_activity_timeline t
  WHERE t.entity_type = 'assignment' AND t.entity_id = e.id
);

-- ============================================================
-- 3. Canonical open pool definition
-- ============================================================
CREATE OR REPLACE FUNCTION public.count_collection_open_pool()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM public.users u
  WHERE COALESCE(u.role, 'customer') = 'customer'
    AND u.assigned_officer_id IS NULL
    AND u.claimed_by_officer_id IS NULL
    AND u.collection_status = 'open'
    AND COALESCE(u.outstanding_amount, 0) > 0
    AND COALESCE(u.payment_status, 'pending') NOT IN ('suspended');
$$;

GRANT EXECUTE ON FUNCTION public.count_collection_open_pool() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_customer_due_for_collection(p_user public.users)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    COALESCE(p_user.outstanding_amount, 0) > 0
    AND COALESCE(p_user.payment_status, 'pending') NOT IN ('suspended')
    AND COALESCE(p_user.collection_status, 'inactive') IN ('open', 'assigned', 'claimed');
$$;

-- ============================================================
-- 4. Dashboard KPIs — unified open pool count
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_collection_dashboard_kpis()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() AND NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT jsonb_build_object(
    'total_outstanding', COALESCE((
      SELECT SUM(u.outstanding_amount)
      FROM public.users u
      WHERE COALESCE(u.role, 'customer') = 'customer'
        AND COALESCE(u.outstanding_amount, 0) > 0
    ), 0),
    'collected_today', COALESCE((
      SELECT SUM(p.total_amount)
      FROM public.payments p
      WHERE p.channel IN ('officer_cash', 'office_cash')
        AND p.created_at >= v_today
        AND p.status IN ('cash_collected', 'confirmed', 'pending_review')
    ), 0),
    'pending_review', COALESCE((
      SELECT COUNT(*)
      FROM public.payments p
      WHERE p.status IN ('cash_collected', 'pending_review')
    ), 0),
    'failed_today', COALESCE((
      SELECT COUNT(*)
      FROM public.payments p
      WHERE p.status = 'failed'
        AND p.created_at >= v_today
    ), 0),
    'open_pool_count', public.count_collection_open_pool(),
    'active_officers', COALESCE((
      SELECT COUNT(DISTINCT o.id)
      FROM public.officers o
      WHERE COALESCE(o.is_active, TRUE)
        AND (
          o.availability_status IN ('online', 'available', 'on_duty')
          OR o.last_active_at >= NOW() - INTERVAL '24 hours'
        )
    ), 0)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================
-- 5. Officer collectible customers — same open pool rules
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_officer_collectible_customers(p_query text DEFAULT '')
RETURNS TABLE (
  id uuid,
  name text,
  customer_id text,
  phone text,
  outstanding_amount numeric,
  next_due_date date,
  payment_status text,
  assignment_type text,
  collection_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.name,
    u.customer_id,
    u.phone,
    u.outstanding_amount,
    u.next_due_date::date,
    u.payment_status,
    CASE
      WHEN u.assigned_officer_id = public.current_officer_id() THEN 'assigned'
      WHEN u.claimed_by_officer_id = public.current_officer_id() THEN 'claimed'
      ELSE 'open_pool'
    END AS assignment_type,
    u.collection_status
  FROM public.users u
  WHERE u.role = 'customer'
    AND u.collection_status NOT IN ('collected', 'inactive')
    AND (
      u.assigned_officer_id = public.current_officer_id()
      OR u.claimed_by_officer_id = public.current_officer_id()
      OR (
        u.assigned_officer_id IS NULL
        AND u.collection_status = 'open'
        AND u.claimed_by_officer_id IS NULL
        AND COALESCE(u.outstanding_amount, 0) > 0
        AND COALESCE(u.payment_status, 'pending') NOT IN ('suspended')
      )
    )
    AND (
      trim(COALESCE(p_query, '')) = ''
      OR u.name ILIKE '%' || trim(p_query) || '%'
      OR u.customer_id ILIKE '%' || trim(p_query) || '%'
      OR u.phone ILIKE '%' || trim(p_query) || '%'
    )
  ORDER BY
    CASE
      WHEN u.assigned_officer_id = public.current_officer_id() THEN 0
      WHEN u.claimed_by_officer_id = public.current_officer_id() THEN 1
      ELSE 2
    END,
    u.next_due_date ASC NULLS LAST,
    u.name ASC
  LIMIT 500;
$$;

-- 6. Unified customer collection timeline (assignments + payments)
DROP FUNCTION IF EXISTS public.get_customer_collection_history(uuid);

CREATE OR REPLACE FUNCTION public.get_customer_collection_history(p_customer_id uuid)
RETURNS TABLE (
  id uuid,
  customer_id uuid,
  assigned_officer_id uuid,
  claimed_by_officer_id uuid,
  status text,
  actor_id uuid,
  actor_role text,
  notes text,
  created_at timestamptz,
  event_source text,
  payment_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.customer_id,
    NULL::uuid AS assigned_officer_id,
    NULL::uuid AS claimed_by_officer_id,
    COALESCE(t.status, t.event_type) AS status,
    t.actor_id,
    t.actor_role,
    COALESCE(t.notes, t.title) AS notes,
    t.created_at,
    t.entity_type AS event_source,
    CASE WHEN t.entity_type = 'payment' THEN t.entity_id ELSE NULL END AS payment_id
  FROM public.entity_activity_timeline t
  WHERE t.customer_id = p_customer_id
  ORDER BY t.created_at DESC
  LIMIT 200;
$$;

CREATE OR REPLACE FUNCTION public.get_payment_activity_timeline(p_payment_id uuid)
RETURNS TABLE (
  id uuid,
  event_type text,
  status text,
  title text,
  notes text,
  actor_role text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.event_type,
    t.status,
    t.title,
    t.notes,
    t.actor_role,
    t.created_at
  FROM public.entity_activity_timeline t
  WHERE t.entity_type = 'payment' AND t.entity_id = p_payment_id
  ORDER BY t.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_payment_activity_timeline(uuid) TO authenticated;

-- ============================================================
-- 7. Payment lifecycle timeline logging
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_payment_activity_from_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_event text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event := COALESCE(NEW.status::text, 'initiated');
    v_title := format('Payment %s — %s', NEW.payment_number, initcap(replace(v_event, '_', ' ')));
    PERFORM public.log_entity_activity(
      'payment', NEW.id, NEW.customer_id, v_event, NEW.status::text, v_title,
      NEW.cash_collection_notes, NEW.collected_by, 'officer',
      jsonb_build_object('amount', NEW.total_amount, 'method', NEW.method::text, 'collection_source', NEW.collection_source)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_event := NEW.status::text;
    v_title := format('Payment %s — %s', NEW.payment_number, initcap(replace(v_event, '_', ' ')));
    PERFORM public.log_entity_activity(
      'payment', NEW.id, NEW.customer_id, v_event, NEW.status::text, v_title,
      COALESCE(NEW.review_notes, NEW.failure_reason), NEW.reviewed_by, 'admin',
      jsonb_build_object('amount', NEW.total_amount, 'method', NEW.method::text)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_activity_timeline ON public.payments;
CREATE TRIGGER trg_payment_activity_timeline
  AFTER INSERT OR UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.log_payment_activity_from_row();

-- Mirror assignment events into shared timeline
CREATE OR REPLACE FUNCTION public.mirror_assignment_event_to_timeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_entity_activity(
    'assignment', NEW.id, NEW.customer_id, NEW.status, NEW.status,
    initcap(replace(NEW.status, '_', ' ')), NEW.notes, NEW.actor_id, NEW.actor_role, '{}'::jsonb
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mirror_assignment_timeline ON public.collection_assignment_events;
CREATE TRIGGER trg_mirror_assignment_timeline
  AFTER INSERT ON public.collection_assignment_events
  FOR EACH ROW EXECUTE FUNCTION public.mirror_assignment_event_to_timeline();

-- ============================================================
-- 8. Refund with timeline propagation
-- ============================================================
CREATE OR REPLACE FUNCTION public.initiate_payment_refund(
  p_payment_id uuid,
  p_amount numeric,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_actor uuid := auth.uid();
BEGIN
  IF NOT public.is_admin() AND NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Only confirmed payments can be refunded';
  END IF;

  INSERT INTO public.payment_refunds (payment_id, amount, reason, initiated_by)
  VALUES (p_payment_id, p_amount, p_reason, v_actor);

  UPDATE public.payments
  SET status = 'refunded', updated_at = NOW()
  WHERE id = p_payment_id;

  RETURN jsonb_build_object('payment_id', p_payment_id, 'refunded', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.initiate_payment_refund(uuid, numeric, text) TO authenticated;

-- ============================================================
-- 9. Manual / remote payment recording
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_manual_payment(
  p_customer_id uuid,
  p_amount numeric,
  p_method text,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_confirmed boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer RECORD;
  v_officer_id uuid;
  v_payment_id uuid;
  v_status public.payment_status;
  v_method public.payment_method;
  v_account text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  v_method := p_method::public.payment_method;

  IF v_method <> 'cash' AND (p_reference IS NULL OR trim(p_reference) = '') THEN
    RAISE EXCEPTION 'Reference is required for non-cash payments';
  END IF;

  SELECT * INTO v_customer
  FROM public.users u
  WHERE u.id = p_customer_id AND COALESCE(u.role, 'customer') = 'customer'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  v_officer_id := public.current_officer_id();
  IF NOT public.is_admin() AND NOT public.is_admin_user() AND v_officer_id IS NULL THEN
    RAISE EXCEPTION 'Admin or officer access required';
  END IF;

  v_account := COALESCE(NULLIF(trim(v_customer.customer_id), ''), 'ACC-' || left(v_customer.id::text, 8));
  v_status := CASE
    WHEN p_confirmed THEN 'confirmed'::public.payment_status
    WHEN v_method = 'cash' THEN 'cash_collected'::public.payment_status
    ELSE 'pending_review'::public.payment_status
  END;

  INSERT INTO public.payments (
    customer_id, customer_name, customer_phone, account_number,
    amount, total_amount, method, channel, collection_source,
    collected_by, cash_collection_notes, gateway_payment_id, receipt_number,
    status, paid_at, confirmed_at, due_date
  ) VALUES (
    v_customer.id,
    v_customer.name,
    v_customer.phone,
    v_account,
    p_amount,
    p_amount,
    v_method,
    'office_cash',
    'manual_remote',
    v_officer_id,
    p_notes,
    CASE WHEN v_method = 'upi' THEN p_reference ELSE NULL END,
    CASE WHEN v_method = 'card' AND p_reference IS NOT NULL THEN 'CARD-' || p_reference ELSE NULL END,
    v_status,
    NOW(),
    CASE WHEN p_confirmed THEN NOW() ELSE NULL END,
    v_customer.next_due_date
  )
  RETURNING id INTO v_payment_id;

  IF v_status = 'confirmed' THEN
    PERFORM public.finalize_officer_collection(v_payment_id);
  END IF;

  RETURN jsonb_build_object('payment_id', v_payment_id, 'status', v_status::text);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_manual_payment(uuid, numeric, text, text, text, boolean) TO authenticated;

-- ============================================================
-- 10. Notification test flag
-- ============================================================
ALTER TABLE public.broadcast_notifications
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.portal_notifications
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_portal_notifications_prod_feed
  ON public.portal_notifications(recipient_auth_id, is_test, created_at DESC);
