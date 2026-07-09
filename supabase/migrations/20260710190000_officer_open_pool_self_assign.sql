-- Officer open-pool claim = self-assign; preserve collection target on pool release;
-- show assigned work and overdue open-pool customers in officer queue.

CREATE OR REPLACE FUNCTION public.claim_collection_customer(p_customer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_officer_id uuid;
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
    IF v_customer.assigned_officer_id = v_officer_id THEN
      RETURN jsonb_build_object('customer_id', p_customer_id, 'already_assigned', true, 'claimed', true);
    END IF;
    RAISE EXCEPTION 'Customer is assigned to another officer';
  END IF;

  IF v_customer.collection_status IS DISTINCT FROM 'open' THEN
    IF v_customer.claimed_by_officer_id = v_officer_id THEN
      NULL;
    ELSIF v_customer.claimed_by_officer_id IS NOT NULL THEN
      RAISE EXCEPTION 'Customer already claimed by another officer';
    ELSE
      RAISE EXCEPTION 'Customer is not in the open pool';
    END IF;
  END IF;

  UPDATE public.users
  SET
    assigned_officer_id = v_officer_id,
    claimed_by_officer_id = NULL,
    claimed_at = NULL,
    collection_status = 'assigned',
    collection_updated_at = NOW(),
    updated_at = NOW()
  WHERE id = p_customer_id;

  PERFORM public.log_collection_assignment_event(
    p_customer_id, v_officer_id, NULL, 'assigned', v_officer_id, 'officer', 'Self-assigned from open pool'
  );

  PERFORM public.notify_collection_admins(
    'claim',
    'Customer assigned from pool',
    format('An officer self-assigned %s from the open pool', v_customer.name),
    jsonb_build_object('customer_id', p_customer_id, 'officer_id', v_officer_id)
  );

  RETURN jsonb_build_object('customer_id', p_customer_id, 'claimed', true, 'assigned', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.bulk_assign_collection_officer(
  p_customer_ids uuid[],
  p_officer_id uuid DEFAULT NULL,
  p_collection_amount numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count int := 0;
  v_customer_id uuid;
  v_customer_name text;
  v_officer_name text;
  v_amount numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_admin() AND NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_collection_amount IS NOT NULL AND p_collection_amount <= 0 THEN
    RAISE EXCEPTION 'Collection amount must be greater than zero';
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

    v_amount := p_collection_amount;

    UPDATE public.users
    SET
      assigned_officer_id = p_officer_id,
      claimed_by_officer_id = NULL,
      claimed_at = NULL,
      collection_status = CASE WHEN p_officer_id IS NULL THEN 'open' ELSE 'assigned' END,
      collection_target_amount = CASE
        WHEN v_amount IS NOT NULL THEN v_amount
        ELSE collection_target_amount
      END,
      collection_updated_at = NOW(),
      updated_at = NOW()
    WHERE id = v_customer_id
      AND role = 'customer';

    IF FOUND THEN
      v_count := v_count + 1;

      PERFORM public.log_collection_assignment_event(
        v_customer_id,
        p_officer_id,
        NULL,
        CASE WHEN p_officer_id IS NULL THEN 'open' ELSE 'assigned' END,
        auth.uid(),
        'admin',
        CASE
          WHEN v_amount IS NOT NULL THEN format('Collection target set to ₹%s', v_amount)
          WHEN p_officer_id IS NULL THEN 'Released to open pool'
          ELSE NULL
        END
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('updated_count', v_count);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_officer_collectible_customers(p_query text DEFAULT ''::text)
RETURNS TABLE(
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
SET search_path TO 'public'
AS $function$
  SELECT
    u.id,
    u.name,
    u.customer_id,
    u.phone,
    public.resolve_customer_collection_amount(u.id) AS outstanding_amount,
    COALESCE(u.next_due_date::date, u.expiry_date::date) AS next_due_date,
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
        AND u.claimed_by_officer_id IS NULL
        AND u.collection_status = 'open'
        AND COALESCE(u.payment_status, 'pending') NOT IN ('suspended')
        AND (
          public.resolve_customer_collection_amount(u.id) > 0
          OR u.payment_status = 'overdue'
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
    COALESCE(u.next_due_date, u.expiry_date) ASC NULLS LAST,
    u.name ASC
  LIMIT 500;
$function$;

CREATE OR REPLACE FUNCTION public.count_collection_open_pool()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::bigint
  FROM public.users u
  WHERE COALESCE(u.role, 'customer') = 'customer'
    AND u.assigned_officer_id IS NULL
    AND u.claimed_by_officer_id IS NULL
    AND u.collection_status = 'open'
    AND COALESCE(u.payment_status, 'pending') NOT IN ('suspended')
    AND (
      public.resolve_customer_collection_amount(u.id) > 0
      OR u.payment_status = 'overdue'
    );
$$;

-- ponytail: migrate legacy claim-only rows to self-assignment model
UPDATE public.users
SET
  assigned_officer_id = claimed_by_officer_id,
  claimed_by_officer_id = NULL,
  claimed_at = NULL,
  collection_status = 'assigned',
  collection_updated_at = NOW(),
  updated_at = NOW()
WHERE role = 'customer'
  AND claimed_by_officer_id IS NOT NULL
  AND assigned_officer_id IS NULL
  AND collection_status IN ('claimed', 'assigned');
