-- Allow customers to read subscriptions linked via current_customer_user_id()
-- (users.id may differ from auth.uid() when auth_user_id is set).

DROP POLICY IF EXISTS customers_own_subscriptions ON public.subscriptions;

CREATE POLICY customers_own_subscriptions ON public.subscriptions
  FOR SELECT
  USING (
    user_id = public.current_customer_user_id()
    OR public.is_admin()
  );
