-- Open pool is admin-explicit only: customers default to inactive until admin releases to pool.

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_collection_status_check;

ALTER TABLE public.users
  ALTER COLUMN collection_status SET DEFAULT 'inactive';

ALTER TABLE public.users
  ADD CONSTRAINT users_collection_status_check
  CHECK (collection_status IN ('inactive', 'open', 'assigned', 'claimed', 'collected', 'failed'));

-- Customers not assigned, claimed, or admin-placed in pool → inactive
UPDATE public.users u
SET
  collection_status = 'inactive',
  collection_updated_at = NOW()
WHERE COALESCE(u.role, 'customer') = 'customer'
  AND u.assigned_officer_id IS NULL
  AND u.claimed_by_officer_id IS NULL
  AND COALESCE(u.collection_status, 'open') IN ('open', 'inactive');

UPDATE public.users u
SET collection_status = 'assigned'
WHERE COALESCE(u.role, 'customer') = 'customer'
  AND u.assigned_officer_id IS NOT NULL
  AND u.collection_status IS DISTINCT FROM 'assigned';

UPDATE public.users u
SET collection_status = 'claimed'
WHERE COALESCE(u.role, 'customer') = 'customer'
  AND u.claimed_by_officer_id IS NOT NULL
  AND u.assigned_officer_id IS NULL
  AND u.collection_status IS DISTINCT FROM 'claimed';

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

  IF v_customer.collection_status IS DISTINCT FROM 'open'
     AND v_customer.claimed_by_officer_id IS DISTINCT FROM v_officer_id THEN
    RAISE EXCEPTION 'Customer is not in the open pool';
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
        AND u.claimed_by_officer_id IS NULL
        AND u.collection_status = 'open'
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
