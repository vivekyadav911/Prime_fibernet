-- Expose collection_updated_at for officer dashboard assignment preview ordering.

DROP FUNCTION IF EXISTS public.get_officer_collectible_customers(text);

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
  collection_status text,
  collection_updated_at timestamptz
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
    u.next_due_date::date,
    u.payment_status,
    CASE
      WHEN u.assigned_officer_id = public.current_officer_id() THEN 'assigned'
      WHEN u.claimed_by_officer_id = public.current_officer_id() THEN 'claimed'
      ELSE 'open_pool'
    END AS assignment_type,
    u.collection_status,
    u.collection_updated_at
  FROM public.users u
  WHERE u.role = 'customer'
    AND public.resolve_customer_collection_amount(u.id) > 0
    AND u.collection_status NOT IN ('collected', 'inactive')
    AND (
      u.assigned_officer_id = public.current_officer_id()
      OR u.claimed_by_officer_id = public.current_officer_id()
      OR (
        u.assigned_officer_id IS NULL
        AND u.collection_status = 'open'
        AND u.claimed_by_officer_id IS NULL
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
    u.collection_updated_at DESC NULLS LAST,
    u.next_due_date ASC NULLS LAST,
    u.name ASC
  LIMIT 500;
$function$;

GRANT EXECUTE ON FUNCTION public.get_officer_collectible_customers(text) TO authenticated;
