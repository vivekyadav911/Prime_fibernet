-- Officer collection queue: hide zero-balance customers, close assignments on full payment,
-- netbanking reference handling in record_manual_payment.

-- Reconcile stale rows: zero outstanding but still in active collection queue
UPDATE public.users
SET
  collection_status = 'collected',
  collection_updated_at = NOW(),
  updated_at = NOW()
WHERE role = 'customer'
  AND COALESCE(outstanding_amount, 0) <= 0
  AND collection_status IN ('open', 'assigned', 'claimed');

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
  collection_status text
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
    u.outstanding_amount,
    u.next_due_date::date,
    u.payment_status,
    CASE
      WHEN u.assigned_officer_id = public.current_officer_id() THEN 'assigned'
      WHEN u.claimed_by_officer_id = public.current_officer_id() THEN 'claimed'
      ELSE 'open_pool'
    END AS assignment_type,
    u.collection_status
  FROM public.users u
  WHERE u.role = 'customer'
    AND COALESCE(u.outstanding_amount, 0) > 0
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
    u.next_due_date ASC NULLS LAST,
    u.name ASC
  LIMIT 500;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_officer_collection(p_payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_payment RECORD;
  v_customer RECORD;
  v_officer_name TEXT;
  v_new_outstanding NUMERIC;
  v_new_collection_status TEXT;
BEGIN
  SELECT p.* INTO v_payment FROM public.payments p WHERE p.id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment.channel NOT IN ('officer_cash', 'office_cash') THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'not_officer_channel');
  END IF;

  SELECT u.* INTO v_customer FROM public.users u WHERE u.id = v_payment.customer_id FOR UPDATE;

  IF v_payment.collected_by IS NOT NULL THEN
    SELECT COALESCE(o.full_name, 'Officer') INTO v_officer_name
    FROM public.officers o
    WHERE o.id = v_payment.collected_by;
  END IF;

  IF v_payment.collected_by IS NOT NULL AND NOT (
    v_customer.assigned_officer_id = v_payment.collected_by
    OR v_customer.claimed_by_officer_id = v_payment.collected_by
    OR (v_customer.assigned_officer_id IS NULL AND v_customer.claimed_by_officer_id IS NULL)
  ) THEN
    RAISE EXCEPTION 'Officer not authorized for this customer';
  END IF;

  v_new_outstanding := GREATEST(0, COALESCE(v_customer.outstanding_amount, 0) - v_payment.total_amount);

  v_new_collection_status := CASE
    WHEN v_new_outstanding <= 0 THEN 'collected'
    ELSE COALESCE(v_customer.collection_status, 'assigned')
  END;

  UPDATE public.users
  SET
    outstanding_amount = v_new_outstanding,
    collection_status = v_new_collection_status,
    last_paid_amount = v_payment.total_amount,
    last_paid_at = NOW(),
    collection_updated_at = NOW(),
    updated_at = NOW()
  WHERE id = v_customer.id;

  PERFORM public.log_collection_assignment_event(
    v_customer.id,
    v_customer.assigned_officer_id,
    v_customer.claimed_by_officer_id,
    CASE WHEN v_new_outstanding <= 0 THEN 'collected' ELSE 'payment_partial' END,
    v_payment.collected_by,
    'officer',
    format('Payment %s via %s', v_payment.payment_number, v_payment.method)
  );

  PERFORM public.notify_collection_admins(
    'payment_success',
    'Payment collected',
    format(
      '%s collected ₹%s from %s via %s',
      COALESCE(v_officer_name, 'Officer'),
      v_payment.total_amount,
      v_payment.customer_name,
      v_payment.method
    ),
    jsonb_build_object(
      'payment_id', p_payment_id,
      'customer_id', v_customer.id,
      'officer_id', v_payment.collected_by,
      'amount', v_payment.total_amount,
      'method', v_payment.method
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'receipt_id', p_payment_id,
    'new_outstanding', v_new_outstanding,
    'collection_status', v_new_collection_status
  );
END;
$function$;

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
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  v_method := p_method::public.payment_method;
  v_verification := COALESCE(NULLIF(trim(p_verification_method), ''), 'manual');

  IF v_verification NOT IN ('manual', 'webhook', 'qr') THEN
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
