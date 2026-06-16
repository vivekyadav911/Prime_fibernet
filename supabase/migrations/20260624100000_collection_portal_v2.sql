-- Collection Portal v2: open pool, claim flow, portal notifications, officer card/UPI

-- ============================================================
-- 1a. User collection state columns
-- ============================================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS collection_status TEXT DEFAULT 'open'
    CHECK (collection_status IN ('open', 'assigned', 'claimed', 'collected', 'failed')),
  ADD COLUMN IF NOT EXISTS claimed_by_officer_id UUID REFERENCES public.officers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS collection_updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.users
SET collection_status = CASE
  WHEN assigned_officer_id IS NOT NULL THEN 'assigned'
  WHEN claimed_by_officer_id IS NOT NULL THEN 'claimed'
  ELSE 'open'
END
WHERE COALESCE(role, 'customer') = 'customer'
  AND (collection_status IS NULL OR collection_status = 'open');

CREATE INDEX IF NOT EXISTS idx_users_collection_status
  ON public.users(collection_status)
  WHERE COALESCE(role, 'customer') = 'customer';

CREATE INDEX IF NOT EXISTS idx_users_claimed_officer
  ON public.users(claimed_by_officer_id)
  WHERE claimed_by_officer_id IS NOT NULL;

-- ============================================================
-- 1b. Assignment history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.collection_assignment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_officer_id UUID REFERENCES public.officers(id) ON DELETE SET NULL,
  claimed_by_officer_id UUID REFERENCES public.officers(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  actor_id UUID,
  actor_role TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collection_events_customer
  ON public.collection_assignment_events(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collection_events_assigned_officer
  ON public.collection_assignment_events(assigned_officer_id);

CREATE INDEX IF NOT EXISTS idx_collection_events_claimed_officer
  ON public.collection_assignment_events(claimed_by_officer_id);

-- ============================================================
-- 1c. Portal notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.portal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_auth_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_officer_id UUID REFERENCES public.officers(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_notifications_recipient
  ON public.portal_notifications(recipient_auth_id, is_read, created_at DESC);

-- ============================================================
-- Helper: insert portal notification for all active admins
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_collection_admins(
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.portal_notifications (recipient_auth_id, type, title, body, data)
  SELECT a.auth_user_id, p_type, p_title, p_body, p_data
  FROM public.admins a
  WHERE a.auth_user_id IS NOT NULL
    AND COALESCE(a.is_active, TRUE);
END;
$$;

-- Helper: notify a single officer by officer id
CREATE OR REPLACE FUNCTION public.notify_collection_officer(
  p_officer_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_id UUID;
BEGIN
  SELECT COALESCE(o.auth_user_id, o.user_id)
  INTO v_auth_id
  FROM public.officers o
  WHERE o.id = p_officer_id;

  IF v_auth_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.portal_notifications (
    recipient_auth_id, recipient_officer_id, type, title, body, data
  ) VALUES (
    v_auth_id, p_officer_id, p_type, p_title, p_body, p_data
  );
END;
$$;

-- ============================================================
-- Log assignment event
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_collection_assignment_event(
  p_customer_id UUID,
  p_assigned_officer_id UUID,
  p_claimed_by_officer_id UUID,
  p_status TEXT,
  p_actor_id UUID DEFAULT NULL,
  p_actor_role TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.collection_assignment_events (
    customer_id, assigned_officer_id, claimed_by_officer_id,
    status, actor_id, actor_role, notes
  ) VALUES (
    p_customer_id, p_assigned_officer_id, p_claimed_by_officer_id,
    p_status, p_actor_id, p_actor_role, p_notes
  );
END;
$$;

-- ============================================================
-- Claim open-pool customer (atomic)
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_collection_customer(p_customer_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_officer_id UUID;
  v_customer RECORD;
BEGIN
  v_officer_id := public.current_officer_id();
  IF v_officer_id IS NULL THEN
    RAISE EXCEPTION 'Officer access required';
  END IF;

  SELECT u.id, u.name, u.assigned_officer_id, u.claimed_by_officer_id, u.collection_status
  INTO v_customer
  FROM public.users u
  WHERE u.id = p_customer_id
    AND COALESCE(u.role, 'customer') = 'customer'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF v_customer.assigned_officer_id IS NOT NULL THEN
    RAISE EXCEPTION 'Customer is assigned to a specific officer';
  END IF;

  IF v_customer.claimed_by_officer_id IS NOT NULL
     AND v_customer.claimed_by_officer_id <> v_officer_id THEN
    RAISE EXCEPTION 'Customer already claimed by another officer';
  END IF;

  IF v_customer.claimed_by_officer_id = v_officer_id THEN
    RETURN jsonb_build_object('customer_id', p_customer_id, 'already_claimed', true);
  END IF;

  UPDATE public.users
  SET
    claimed_by_officer_id = v_officer_id,
    claimed_at = NOW(),
    collection_status = 'claimed',
    collection_updated_at = NOW()
  WHERE id = p_customer_id;

  PERFORM public.log_collection_assignment_event(
    p_customer_id, NULL, v_officer_id, 'claimed', v_officer_id, 'officer', NULL
  );

  PERFORM public.notify_collection_admins(
    'claim',
    'Customer claimed',
    format('An officer claimed %s for collection', v_customer.name),
    jsonb_build_object('customer_id', p_customer_id, 'officer_id', v_officer_id)
  );

  RETURN jsonb_build_object('customer_id', p_customer_id, 'claimed', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_collection_customer(UUID) TO authenticated;

-- ============================================================
-- Admin revoke claim back to open pool
-- ============================================================
CREATE OR REPLACE FUNCTION public.release_collection_claim(p_customer_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer RECORD;
BEGIN
  IF NOT public.is_admin() AND NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT u.id, u.assigned_officer_id, u.claimed_by_officer_id
  INTO v_customer
  FROM public.users u
  WHERE u.id = p_customer_id
    AND COALESCE(u.role, 'customer') = 'customer'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF v_customer.assigned_officer_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot release claim on directly assigned customer';
  END IF;

  UPDATE public.users
  SET
    claimed_by_officer_id = NULL,
    claimed_at = NULL,
    collection_status = 'open',
    collection_updated_at = NOW()
  WHERE id = p_customer_id;

  PERFORM public.log_collection_assignment_event(
    p_customer_id, NULL, NULL, 'open', auth.uid(), 'admin', 'Claim revoked'
  );

  RETURN jsonb_build_object('customer_id', p_customer_id, 'released', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_collection_claim(UUID) TO authenticated;

-- ============================================================
-- Extend bulk assign with status, events, notifications
-- ============================================================
CREATE OR REPLACE FUNCTION public.bulk_assign_collection_officer(
  p_customer_ids uuid[],
  p_officer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_customer_id uuid;
  v_customer_name text;
  v_officer_name text;
BEGIN
  IF NOT public.is_admin() AND NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_officer_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.officers o WHERE o.id = p_officer_id) THEN
      RAISE EXCEPTION 'Officer not found';
    END IF;
    SELECT COALESCE(o.full_name, 'Officer') INTO v_officer_name
    FROM public.officers o WHERE o.id = p_officer_id;
  END IF;

  IF p_customer_ids IS NULL OR array_length(p_customer_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('updated_count', 0);
  END IF;

  FOREACH v_customer_id IN ARRAY p_customer_ids LOOP
    SELECT u.name INTO v_customer_name FROM public.users u WHERE u.id = v_customer_id;

    UPDATE public.users
    SET
      assigned_officer_id = p_officer_id,
      claimed_by_officer_id = NULL,
      claimed_at = NULL,
      collection_status = CASE WHEN p_officer_id IS NULL THEN 'open' ELSE 'assigned' END,
      collection_updated_at = NOW()
    WHERE id = v_customer_id
      AND COALESCE(role, 'customer') = 'customer';

    IF FOUND THEN
      PERFORM public.log_collection_assignment_event(
        v_customer_id,
        p_officer_id,
        NULL,
        CASE WHEN p_officer_id IS NULL THEN 'open' ELSE 'assigned' END,
        auth.uid(),
        'admin',
        NULL
      );

      IF p_officer_id IS NOT NULL THEN
        PERFORM public.notify_collection_officer(
          p_officer_id,
          'assignment',
          'New collection assignment',
          format('You were assigned to collect from %s', COALESCE(v_customer_name, 'a customer')),
          jsonb_build_object('customer_id', v_customer_id, 'officer_id', p_officer_id)
        );
      END IF;
    END IF;
  END LOOP;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('updated_count', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_assign_collection_officer(uuid[], uuid) TO authenticated;

-- ============================================================
-- Officer collectible customers (assigned + open pool + claimed)
-- ============================================================
DROP FUNCTION IF EXISTS public.get_officer_assigned_customers(text);
DROP FUNCTION IF EXISTS public.search_officer_customers(text);
DROP FUNCTION IF EXISTS public.get_officer_collectible_customers(text);

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
  WHERE COALESCE(u.role, 'customer') = 'customer'
    AND u.collection_status NOT IN ('collected')
    AND (
      u.assigned_officer_id = public.current_officer_id()
      OR (
        u.assigned_officer_id IS NULL
        AND (
          u.claimed_by_officer_id IS NULL
          OR u.claimed_by_officer_id = public.current_officer_id()
        )
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
  LIMIT 200;
$$;

GRANT EXECUTE ON FUNCTION public.get_officer_collectible_customers(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_officer_assigned_customers(p_query text DEFAULT '')
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
  SELECT c.*
  FROM public.get_officer_collectible_customers(p_query) c
  WHERE c.assignment_type = 'assigned';
$$;

GRANT EXECUTE ON FUNCTION public.get_officer_assigned_customers(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.search_officer_customers(p_query text DEFAULT '')
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
  SELECT * FROM public.get_officer_collectible_customers(p_query);
$$;

GRANT EXECUTE ON FUNCTION public.search_officer_customers(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_officer_customer_payment_history(p_customer_id uuid)
RETURNS SETOF public.payments
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.payments p
  INNER JOIN public.users u ON u.id = p.customer_id
  WHERE p.customer_id = p_customer_id
    AND p.collected_by = public.current_officer_id()
    AND p.channel IN ('officer_cash', 'office_cash')
    AND (
      u.assigned_officer_id = public.current_officer_id()
      OR u.claimed_by_officer_id = public.current_officer_id()
      OR (u.assigned_officer_id IS NULL AND u.claimed_by_officer_id IS NULL)
    )
  ORDER BY p.created_at DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_officer_customer_payment_history(uuid) TO authenticated;

-- ============================================================
-- Admin collection dashboard KPIs
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
    'open_pool_count', COALESCE((
      SELECT COUNT(*)
      FROM public.users u
      WHERE COALESCE(u.role, 'customer') = 'customer'
        AND u.assigned_officer_id IS NULL
        AND u.collection_status IN ('open', 'claimed')
        AND COALESCE(u.outstanding_amount, 0) > 0
    ), 0),
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

GRANT EXECUTE ON FUNCTION public.get_collection_dashboard_kpis() TO authenticated;

-- Customer assignment history for admin detail screen
CREATE OR REPLACE FUNCTION public.get_customer_collection_history(p_customer_id uuid)
RETURNS SETOF public.collection_assignment_events
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.*
  FROM public.collection_assignment_events e
  WHERE e.customer_id = p_customer_id
  ORDER BY e.created_at DESC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_collection_history(uuid) TO authenticated;

-- ============================================================
-- Finalize officer collection after payment insert
-- ============================================================
CREATE OR REPLACE FUNCTION public.finalize_officer_collection(p_payment_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_customer RECORD;
  v_officer_name TEXT;
  v_new_outstanding NUMERIC;
BEGIN
  SELECT p.* INTO v_payment
  FROM public.payments p
  WHERE p.id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment.channel NOT IN ('officer_cash', 'office_cash') THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'not_officer_channel');
  END IF;

  SELECT u.* INTO v_customer
  FROM public.users u
  WHERE u.id = v_payment.customer_id
  FOR UPDATE;

  IF v_payment.collected_by IS NOT NULL THEN
    SELECT COALESCE(o.full_name, 'Officer') INTO v_officer_name
    FROM public.officers o
    WHERE o.id = v_payment.collected_by;
  END IF;

  -- Verify officer may collect from this customer
  IF v_payment.collected_by IS NOT NULL THEN
    IF NOT (
      v_customer.assigned_officer_id = v_payment.collected_by
      OR v_customer.claimed_by_officer_id = v_payment.collected_by
      OR (
        v_customer.assigned_officer_id IS NULL
        AND v_customer.claimed_by_officer_id IS NULL
      )
    ) THEN
      RAISE EXCEPTION 'Officer not authorized for this customer';
    END IF;
  END IF;

  v_new_outstanding := GREATEST(0, COALESCE(v_customer.outstanding_amount, 0) - v_payment.total_amount);

  UPDATE public.users
  SET
    outstanding_amount = v_new_outstanding,
    collection_status = 'collected',
    last_paid_amount = v_payment.total_amount,
    last_paid_at = NOW(),
    collection_updated_at = NOW(),
    updated_at = NOW()
  WHERE id = v_customer.id;

  PERFORM public.log_collection_assignment_event(
    v_customer.id,
    v_customer.assigned_officer_id,
    v_customer.claimed_by_officer_id,
    'collected',
    v_payment.collected_by,
    'officer',
    format('Payment %s via %s', v_payment.payment_number, v_payment.method)
  );

  PERFORM public.notify_collection_admins(
    'payment_success',
    'Payment collected',
    format(
      '%s collected ₹%s from %s via %s',
      COALESCE(v_officer_name, 'Officer'),
      v_payment.total_amount,
      v_payment.customer_name,
      v_payment.method
    ),
    jsonb_build_object(
      'payment_id', p_payment_id,
      'customer_id', v_customer.id,
      'officer_id', v_payment.collected_by,
      'amount', v_payment.total_amount,
      'method', v_payment.method
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'receipt_id', p_payment_id,
    'new_outstanding', v_new_outstanding
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_officer_collection(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.on_officer_payment_inserted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.channel IN ('officer_cash', 'office_cash') THEN
    PERFORM public.finalize_officer_collection(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_officer_payment_finalize ON public.payments;
CREATE TRIGGER trg_officer_payment_finalize
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.on_officer_payment_inserted();

-- ============================================================
-- RLS: users officer read (assigned + open pool + own claim)
-- ============================================================
DROP POLICY IF EXISTS users_officer_assigned_read ON public.users;
CREATE POLICY users_officer_assigned_read ON public.users
  FOR SELECT USING (
    assigned_officer_id = public.current_officer_id()
    OR (
      COALESCE(role, 'customer') = 'customer'
      AND assigned_officer_id IS NULL
      AND (
        claimed_by_officer_id IS NULL
        OR claimed_by_officer_id = public.current_officer_id()
      )
    )
  );

-- ============================================================
-- RLS: payments officer insert (cash, card, upi + claim rules)
-- ============================================================
DROP POLICY IF EXISTS payments_officer_insert ON public.payments;
CREATE POLICY payments_officer_insert ON public.payments
  FOR INSERT WITH CHECK (
    collected_by = public.current_officer_id()
    AND method IN ('cash', 'card', 'upi')
    AND channel IN ('officer_cash', 'office_cash')
    AND customer_id IN (
      SELECT u.id FROM public.users u
      WHERE COALESCE(u.role, 'customer') = 'customer'
        AND (
          u.assigned_officer_id = public.current_officer_id()
          OR u.claimed_by_officer_id = public.current_officer_id()
          OR (
            u.assigned_officer_id IS NULL
            AND u.claimed_by_officer_id IS NULL
          )
        )
    )
  );

-- ============================================================
-- RLS: portal_notifications
-- ============================================================
ALTER TABLE public.portal_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS portal_notifications_own_read ON public.portal_notifications;
CREATE POLICY portal_notifications_own_read ON public.portal_notifications
  FOR SELECT USING (recipient_auth_id = auth.uid());

DROP POLICY IF EXISTS portal_notifications_own_update ON public.portal_notifications;
CREATE POLICY portal_notifications_own_update ON public.portal_notifications
  FOR UPDATE USING (recipient_auth_id = auth.uid());

DROP POLICY IF EXISTS portal_notifications_admin_all ON public.portal_notifications;
CREATE POLICY portal_notifications_admin_all ON public.portal_notifications
  FOR ALL USING (public.is_admin_user() OR public.is_admin());

-- ============================================================
-- RLS: collection_assignment_events
-- ============================================================
ALTER TABLE public.collection_assignment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS collection_events_admin ON public.collection_assignment_events;
CREATE POLICY collection_events_admin ON public.collection_assignment_events
  FOR ALL USING (public.is_admin_user() OR public.is_admin());

DROP POLICY IF EXISTS collection_events_officer_read ON public.collection_assignment_events;
CREATE POLICY collection_events_officer_read ON public.collection_assignment_events
  FOR SELECT USING (
    assigned_officer_id = public.current_officer_id()
    OR claimed_by_officer_id = public.current_officer_id()
    OR customer_id IN (
      SELECT u.id FROM public.users u
      WHERE u.assigned_officer_id = public.current_officer_id()
        OR u.claimed_by_officer_id = public.current_officer_id()
    )
  );

-- ============================================================
-- Realtime publication
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'portal_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'collection_assignment_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.collection_assignment_events;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  END IF;
END $$;
