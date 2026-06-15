-- Officer fixes: users RLS for collections, shifts RLS auth_user_id, customer search RPC

-- Officers can read customers assigned to them
DROP POLICY IF EXISTS users_officer_assigned_read ON public.users;
CREATE POLICY users_officer_assigned_read ON public.users
  FOR SELECT USING (
    assigned_officer_id = public.current_officer_id()
  );

-- Shifts: allow officers linked via auth_user_id (not just user_id)
DROP POLICY IF EXISTS officer_insert_shifts ON public.shifts;
CREATE POLICY officer_insert_shifts ON public.shifts
  FOR INSERT WITH CHECK (
    officer_id IN (
      SELECT id FROM public.officers
      WHERE user_id = auth.uid() OR auth_user_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS officer_own_shifts ON public.shifts;
CREATE POLICY officer_own_shifts ON public.shifts
  FOR SELECT USING (
    officer_id IN (
      SELECT id FROM public.officers
      WHERE user_id = auth.uid() OR auth_user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Scoped customer search for field collection
CREATE OR REPLACE FUNCTION public.search_officer_customers(p_query text DEFAULT '')
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
    u.id,
    u.name,
    u.customer_id,
    u.phone,
    u.outstanding_amount,
    u.next_due_date::date,
    u.payment_status
  FROM public.users u
  WHERE u.assigned_officer_id = public.current_officer_id()
    AND COALESCE(u.role, 'customer') = 'customer'
    AND (
      trim(COALESCE(p_query, '')) = ''
      OR u.name ILIKE '%' || trim(p_query) || '%'
      OR u.customer_id ILIKE '%' || trim(p_query) || '%'
      OR u.phone ILIKE '%' || trim(p_query) || '%'
    )
  ORDER BY u.name
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.search_officer_customers(text) TO authenticated;
