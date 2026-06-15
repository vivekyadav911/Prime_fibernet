-- Officer collections: assigned-only (unassigned customers are admin queue only)

DROP POLICY IF EXISTS payments_officer_insert ON public.payments;
CREATE POLICY payments_officer_insert ON public.payments
  FOR INSERT WITH CHECK (
    collected_by = public.current_officer_id()
    AND customer_id IN (
      SELECT u.id FROM public.users u
      WHERE u.assigned_officer_id = public.current_officer_id()
    )
    AND method = 'cash'
    AND channel IN ('officer_cash', 'office_cash')
  );

CREATE OR REPLACE FUNCTION public.get_officer_collectible_customers(p_query text DEFAULT '')
RETURNS TABLE (
  id uuid,
  name text,
  customer_id text,
  phone text,
  outstanding_amount numeric,
  next_due_date date,
  payment_status text,
  assignment_type text
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
    'assigned'::text AS assignment_type
  FROM public.users u
  WHERE u.assigned_officer_id = public.current_officer_id()
    AND COALESCE(u.role, 'customer') = 'customer'
    AND (
      trim(COALESCE(p_query, '')) = ''
      OR u.name ILIKE '%' || trim(p_query) || '%'
      OR u.customer_id ILIKE '%' || trim(p_query) || '%'
      OR u.phone ILIKE '%' || trim(p_query) || '%'
    )
  ORDER BY u.next_due_date ASC NULLS LAST, u.name ASC
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
  payment_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.customer_id,
    c.phone,
    c.outstanding_amount,
    c.next_due_date,
    c.payment_status
  FROM public.get_officer_collectible_customers(p_query) c;
$$;

GRANT EXECUTE ON FUNCTION public.get_officer_assigned_customers(text) TO authenticated;

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
    AND u.assigned_officer_id = public.current_officer_id()
    AND p.collected_by = public.current_officer_id()
    AND p.channel = 'officer_cash'
  ORDER BY p.created_at DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_officer_customer_payment_history(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.search_officer_customers(text);
CREATE OR REPLACE FUNCTION public.search_officer_customers(p_query text DEFAULT '')
RETURNS TABLE (
  id uuid,
  name text,
  customer_id text,
  phone text,
  outstanding_amount numeric,
  next_due_date date,
  payment_status text,
  assignment_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.get_officer_collectible_customers(p_query);
$$;

GRANT EXECUTE ON FUNCTION public.search_officer_customers(text) TO authenticated;
