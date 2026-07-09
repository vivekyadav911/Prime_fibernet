-- Fix QR verification_method constraint; officer payments stay pending_review until admin confirms.

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_verification_method_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_verification_method_check
  CHECK (verification_method = ANY (ARRAY['manual'::text, 'webhook'::text, 'qr'::text]));

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
SET search_path TO 'public'
AS $function$
DECLARE
  v_customer RECORD;
  v_officer_id uuid;
  v_payment_id uuid;
  v_status public.payment_status;
  v_method public.payment_method;
  v_account text;
  v_channel public.payment_channel;
  v_verification text;
  v_is_admin boolean;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  v_method := p_method::public.payment_method;
  v_verification := COALESCE(NULLIF(trim(p_verification_method), ''), 'manual');

  IF v_verification NOT IN ('manual', 'webhook', 'qr') THEN
    RAISE EXCEPTION 'Invalid verification_method';
  END IF;

  v_is_admin := public.is_admin() OR public.is_admin_user();

  IF p_ticket_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = p_ticket_id
        AND (
          t.assigned_officer_id = public.current_officer_id()
          OR v_is_admin
        )
    ) THEN
      RAISE EXCEPTION 'Ticket not found or not assigned to you';
    END IF;
  END IF;

  IF v_method <> 'cash'
    AND v_verification = 'manual'
    AND (p_reference IS NULL OR trim(p_reference) = '') THEN
    RAISE EXCEPTION 'Reference is required for non-cash manual payments';
  END IF;

  IF v_method = 'upi'
    AND v_verification = 'qr'
    AND (p_reference IS NULL OR trim(p_reference) = '') THEN
    RAISE EXCEPTION 'UPI transaction reference is required to confirm QR collection';
  END IF;

  SELECT * INTO v_customer
  FROM public.users u
  WHERE u.id = p_customer_id AND COALESCE(u.role, 'customer') = 'customer'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  v_officer_id := public.current_officer_id();
  IF NOT v_is_admin AND v_officer_id IS NULL THEN
    RAISE EXCEPTION 'Admin or officer access required';
  END IF;

  v_account := COALESCE(NULLIF(trim(v_customer.customer_id), ''), 'ACC-' || left(v_customer.id::text, 8));

  v_channel := CASE
    WHEN v_officer_id IS NOT NULL THEN 'officer_cash'::public.payment_channel
    ELSE 'office_cash'::public.payment_channel
  END;

  -- Officer field collections always require admin verification first.
  IF v_officer_id IS NOT NULL AND NOT v_is_admin THEN
    v_status := 'pending_review'::public.payment_status;
  ELSIF p_confirmed AND v_is_admin THEN
    v_status := 'confirmed'::public.payment_status;
  ELSIF v_method = 'cash' THEN
    v_status := 'cash_collected'::public.payment_status;
  ELSE
    v_status := 'pending_review'::public.payment_status;
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
    CASE
      WHEN v_method = 'netbanking' AND p_reference IS NOT NULL THEN 'NB-' || p_reference
      WHEN v_method = 'card' AND p_reference IS NOT NULL THEN 'CARD-' || p_reference
      ELSE NULL
    END,
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
$function$;
