-- Allow officers to record netbanking field collections (method was missing from insert RLS).
DROP POLICY IF EXISTS payments_officer_insert ON public.payments;
CREATE POLICY payments_officer_insert ON public.payments
  FOR INSERT WITH CHECK (
    collected_by = public.current_officer_id()
    AND method IN ('cash', 'card', 'upi', 'netbanking', 'bank_transfer', 'other')
    AND channel IN ('officer_cash', 'office_cash', 'officer_online')
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
