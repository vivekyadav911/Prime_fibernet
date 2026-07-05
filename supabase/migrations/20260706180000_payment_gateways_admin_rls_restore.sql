-- Restore admin RLS on payment_gateways (required for admin payments list embed + gateway config).
-- Customer metadata policy from 20260705140000 remains for authenticated reads of active gateways.

DROP POLICY IF EXISTS payment_gateways_admin ON public.payment_gateways;
CREATE POLICY payment_gateways_admin ON public.payment_gateways
  FOR ALL
  TO authenticated
  USING (public.is_admin_user() OR public.is_admin())
  WITH CHECK (public.is_admin_user() OR public.is_admin());
