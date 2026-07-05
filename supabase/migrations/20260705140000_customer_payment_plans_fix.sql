-- Customer payment + plans production fix: account IDs and gateway metadata RLS

-- Backfill human-readable customer account IDs
UPDATE public.users
SET customer_id = 'PFN-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8))
WHERE customer_id IS NULL OR TRIM(customer_id) = '';

-- Auto-assign customer_id for new customer rows
CREATE OR REPLACE FUNCTION public.set_user_customer_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.customer_id IS NULL OR TRIM(NEW.customer_id) = '')
     AND COALESCE(NEW.role, 'customer') = 'customer' THEN
    NEW.customer_id := 'PFN-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_user_customer_id ON public.users;
CREATE TRIGGER trg_set_user_customer_id
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_user_customer_id();

-- Allow customers to read active gateway metadata (no credentials in client selects)
DROP POLICY IF EXISTS payment_gateways_customer_read_metadata ON public.payment_gateways;
CREATE POLICY payment_gateways_customer_read_metadata ON public.payment_gateways
  FOR SELECT TO authenticated
  USING (is_active = TRUE);
