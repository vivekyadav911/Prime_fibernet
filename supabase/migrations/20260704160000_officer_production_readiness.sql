-- Officer app production readiness: bank accounts, payment verification, ticket geocoding

-- ============================================================
-- 1. Company bank accounts (static QR / gateway routing)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL,
  upi_vpa TEXT NOT NULL,
  bank_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_default_bank_account
  ON public.bank_accounts(is_default) WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS idx_bank_accounts_active
  ON public.bank_accounts(is_active) WHERE is_active = TRUE;

CREATE OR REPLACE FUNCTION public.ensure_single_default_bank_account()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE public.bank_accounts
    SET is_default = FALSE, updated_at = NOW()
    WHERE id <> NEW.id AND is_default = TRUE;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_default_bank_account ON public.bank_accounts;
CREATE TRIGGER trg_single_default_bank_account
  BEFORE INSERT OR UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_default_bank_account();

-- Link existing payment gateways to bank accounts (replaces separate gateway_configs table)
ALTER TABLE public.payment_gateways
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL;

-- ============================================================
-- 2. Payments: verification_method, bank_account_id, ticket_id, version
-- ============================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS verification_method TEXT DEFAULT 'manual'
    CHECK (verification_method IN ('manual', 'webhook')),
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_payments_ticket ON public.payments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_payments_bank_account ON public.payments(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_payments_verification ON public.payments(verification_method);

-- Gateway-verified online payments were confirmed via webhook
UPDATE public.payments
SET verification_method = 'webhook'
WHERE verification_method = 'manual'
  AND channel IN ('online_app', 'online_web', 'officer_online', 'auto_debit')
  AND gateway_order_id IS NOT NULL;

-- ============================================================
-- 3. Tickets: geocoding + optimistic concurrency
-- ============================================================
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_tickets_geo
  ON public.tickets(lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- ============================================================
-- 4. RLS: bank_accounts
-- ============================================================
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bank_accounts_admin ON public.bank_accounts;
CREATE POLICY bank_accounts_admin ON public.bank_accounts
  FOR ALL USING (public.is_admin_user() OR public.is_admin());

DROP POLICY IF EXISTS bank_accounts_officer_read ON public.bank_accounts;
CREATE POLICY bank_accounts_officer_read ON public.bank_accounts
  FOR SELECT USING (
    is_active = TRUE AND public.current_officer_id() IS NOT NULL
  );

-- ============================================================
-- 5. RLS: payments officer update (confirm manual digital payments)
-- ============================================================
DROP POLICY IF EXISTS payments_officer_update ON public.payments;
CREATE POLICY payments_officer_update ON public.payments
  FOR UPDATE USING (
    collected_by = public.current_officer_id()
    AND verification_method = 'manual'
    AND status IN ('initiated', 'pending_review', 'cash_collected')
  )
  WITH CHECK (collected_by = public.current_officer_id());

-- Allow officers to insert pending manual UPI QR payments
DROP POLICY IF EXISTS payments_officer_insert ON public.payments;
CREATE POLICY payments_officer_insert ON public.payments
  FOR INSERT WITH CHECK (
    collected_by = public.current_officer_id()
    AND method IN ('cash', 'card', 'upi', 'bank_transfer', 'other')
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

-- ============================================================
-- 6. record_manual_payment — ticket_id + verification_method
-- ============================================================
DROP FUNCTION IF EXISTS public.record_manual_payment(uuid, numeric, text, text, text, boolean);

CREATE OR REPLACE FUNCTION public.record_manual_payment(
  p_customer_id uuid,
  p_amount numeric,
  p_method text,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_confirmed boolean DEFAULT false,
  p_ticket_id uuid DEFAULT NULL,
  p_bank_account_id uuid DEFAULT NULL,
  p_verification_method text DEFAULT 'manual'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer RECORD;
  v_officer_id uuid;
  v_payment_id uuid;
  v_status public.payment_status;
  v_method public.payment_method;
  v_account text;
  v_channel public.payment_channel;
  v_verification text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  v_method := p_method::public.payment_method;
  v_verification := COALESCE(NULLIF(trim(p_verification_method), ''), 'manual');

  IF v_verification NOT IN ('manual', 'webhook') THEN
    RAISE EXCEPTION 'Invalid verification_method';
  END IF;

  IF p_ticket_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = p_ticket_id
        AND (
          t.assigned_officer_id = public.current_officer_id()
          OR public.is_admin()
          OR public.is_admin_user()
        )
    ) THEN
      RAISE EXCEPTION 'Ticket not found or not assigned to you';
    END IF;
  ELSIF NOT public.is_admin() AND NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ticket_id is required for officer field collections';
  END IF;

  IF v_method <> 'cash' AND v_verification = 'manual' AND (p_reference IS NULL OR trim(p_reference) = '') THEN
    RAISE EXCEPTION 'Reference is required for non-cash manual payments';
  END IF;

  SELECT * INTO v_customer
  FROM public.users u
  WHERE u.id = p_customer_id AND COALESCE(u.role, 'customer') = 'customer'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  v_officer_id := public.current_officer_id();
  IF NOT public.is_admin() AND NOT public.is_admin_user() AND v_officer_id IS NULL THEN
    RAISE EXCEPTION 'Admin or officer access required';
  END IF;

  v_account := COALESCE(NULLIF(trim(v_customer.customer_id), ''), 'ACC-' || left(v_customer.id::text, 8));

  v_channel := CASE
    WHEN v_officer_id IS NOT NULL THEN 'officer_cash'::public.payment_channel
    ELSE 'office_cash'::public.payment_channel
  END;

  v_status := CASE
    WHEN p_confirmed THEN 'confirmed'::public.payment_status
    WHEN v_method = 'cash' THEN 'cash_collected'::public.payment_status
    ELSE 'pending_review'::public.payment_status
  END;

  -- Cash collected in field: officer accountability, confirmed immediately
  IF v_method = 'cash' AND v_officer_id IS NOT NULL THEN
    v_status := 'confirmed'::public.payment_status;
  END IF;

  INSERT INTO public.payments (
    customer_id, customer_name, customer_phone, account_number,
    amount, total_amount, method, channel, collection_source,
    collected_by, cash_collection_notes, gateway_payment_id, receipt_number,
    status, paid_at, confirmed_at, due_date,
    verification_method, bank_account_id, ticket_id
  ) VALUES (
    v_customer.id,
    v_customer.name,
    v_customer.phone,
    v_account,
    p_amount,
    p_amount,
    v_method,
    v_channel,
    CASE WHEN v_officer_id IS NOT NULL THEN 'field_collection' ELSE 'manual_remote' END,
    v_officer_id,
    p_notes,
    CASE WHEN v_method = 'upi' THEN p_reference ELSE NULL END,
    CASE WHEN v_method = 'card' AND p_reference IS NOT NULL THEN 'CARD-' || p_reference ELSE NULL END,
    v_status,
    NOW(),
    CASE WHEN v_status = 'confirmed' THEN NOW() ELSE NULL END,
    v_customer.next_due_date,
    v_verification,
    p_bank_account_id,
    p_ticket_id
  )
  RETURNING id INTO v_payment_id;

  IF v_status = 'confirmed' THEN
    PERFORM public.finalize_officer_collection(v_payment_id);
  END IF;

  RETURN jsonb_build_object('payment_id', v_payment_id, 'status', v_status::text);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_manual_payment(
  uuid, numeric, text, text, text, boolean, uuid, uuid, text
) TO authenticated;

-- Officer field cash collection RPC with ticket_id
CREATE OR REPLACE FUNCTION public.record_officer_cash_collection(
  p_customer_id uuid,
  p_amount numeric,
  p_ticket_id uuid,
  p_notes text DEFAULT NULL,
  p_denominations jsonb DEFAULT NULL,
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL,
  p_evidence_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.record_manual_payment(
    p_customer_id,
    p_amount,
    'cash',
    NULL,
    p_notes,
    TRUE,
    p_ticket_id,
    NULL,
    'manual'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_officer_cash_collection TO authenticated;
