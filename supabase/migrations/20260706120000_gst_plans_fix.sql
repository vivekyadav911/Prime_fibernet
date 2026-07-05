-- Allow admins to update GST invoice request status via authenticated role
GRANT UPDATE ON public.gst_invoice_requests TO authenticated;

-- Hide soft-deleted plans from public customer read
DROP POLICY IF EXISTS plans_public_read ON public.plans;
CREATE POLICY plans_public_read ON public.plans
  FOR SELECT
  USING (
    (is_active = true AND COALESCE(is_deleted, false) = false)
    OR public.is_admin()
  );
