-- Fix bulk_assign updated_count and broaden admin check for collection RPCs

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
  v_count int := 0;
  v_customer_id uuid;
  v_customer_name text;
  v_officer_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

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

  RETURN jsonb_build_object('updated_count', v_count);
END;
$$;

-- Increase officer collectible list cap for large customer bases
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
  LIMIT 500;
$$;
