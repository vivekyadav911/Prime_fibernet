-- Payment system enterprise fix: gateway GRANTs, portal invoice linkage, invoice sync on confirm.

-- ================================================================
-- Part A: payment_gateways — table-level GRANT for authenticated
-- ================================================================
GRANT SELECT ON public.payment_gateways TO authenticated;

DROP POLICY IF EXISTS payment_gateways_admin ON public.payment_gateways;
CREATE POLICY payment_gateways_admin ON public.payment_gateways
  FOR ALL
  TO authenticated
  USING (public.is_admin_user() OR public.is_admin())
  WITH CHECK (public.is_admin_user() OR public.is_admin());

-- ================================================================
-- Part B: Link portal payments to invoices (keep legacy payment_id FK)
-- ================================================================
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS portal_payment_id UUID
    REFERENCES public.payments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS invoices_portal_payment_id_idx
  ON public.invoices(portal_payment_id);

-- ================================================================
-- Part C: Extend on_payment_confirmed — sync invoices + zero outstanding
-- ================================================================
CREATE OR REPLACE FUNCTION public.on_payment_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
    NEW.confirmed_at := COALESCE(NEW.confirmed_at, NOW());

    UPDATE public.users SET
      payment_status = 'paid',
      last_paid_amount = NEW.total_amount,
      last_paid_at = NOW(),
      next_due_date = NEW.next_due_date,
      outstanding_amount = GREATEST(0, COALESCE(outstanding_amount, 0) - NEW.total_amount),
      updated_at = NOW()
    WHERE id = NEW.customer_id;

    -- Sync invoices linked to this portal payment
    UPDATE public.invoices
    SET
      status = 'paid',
      paid_at = COALESCE(NEW.confirmed_at, NOW()),
      portal_payment_id = NEW.id,
      updated_at = NOW()
    WHERE portal_payment_id = NEW.id
       OR (
         portal_payment_id IS NULL
         AND user_id = NEW.customer_id
         AND status IN ('unpaid', 'pending', 'overdue', 'draft')
         AND (
           total_amount = NEW.total_amount
           OR amount = NEW.total_amount
           OR subtotal = NEW.total_amount
         )
       );

    -- Zero outstanding when no open payments remain
    IF NOT EXISTS (
      SELECT 1
      FROM public.payments p
      WHERE p.customer_id = NEW.customer_id
        AND p.status IN ('initiated', 'pending_review', 'cash_collected')
    ) THEN
      UPDATE public.users
      SET outstanding_amount = 0, payment_status = 'paid', updated_at = NOW()
      WHERE id = NEW.customer_id;
    END IF;

    INSERT INTO public.audit_logs (
      actor_id, actor_role, action, target_entity, category, description, metadata, status
    ) VALUES (
      NEW.reviewed_by,
      'admin',
      'UPDATE',
      'payment',
      'payment',
      'Payment confirmed: ' || NEW.payment_number || ' for ' || NEW.customer_name,
      jsonb_build_object(
        'payment_id', NEW.id,
        'payment_number', NEW.payment_number,
        'amount', NEW.total_amount,
        'method', NEW.method,
        'customer_id', NEW.customer_id
      ),
      'SUCCESS'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill: mark invoices paid for already-confirmed portal payments
UPDATE public.invoices i
SET
  status = 'paid',
  paid_at = p.confirmed_at,
  portal_payment_id = p.id,
  updated_at = NOW()
FROM public.payments p
WHERE p.status = 'confirmed'
  AND p.customer_id = i.user_id
  AND i.status IN ('unpaid', 'pending', 'overdue', 'draft')
  AND i.portal_payment_id IS NULL
  AND (
    i.total_amount = p.total_amount
    OR i.amount = p.total_amount
    OR i.subtotal = p.total_amount
  );

-- Dev Customer GST invoice: subtotal 499 matches confirmed payment amount
UPDATE public.invoices i
SET
  status = 'paid',
  paid_at = p.confirmed_at,
  portal_payment_id = p.id,
  updated_at = NOW()
FROM public.payments p
WHERE p.status = 'confirmed'
  AND p.customer_id = i.user_id
  AND i.invoice_number = 'INV-2026-0008'
  AND p.payment_number = 'PAY-2026-000031'
  AND i.status = 'unpaid';

-- ================================================================
-- Part D: Branding seed — Prime Fibernet email sender
-- ================================================================
UPDATE public.general_settings
SET
  company_name = COALESCE(NULLIF(TRIM(company_name), ''), 'Prime Fibernet'),
  company_email = COALESCE(NULLIF(TRIM(company_email), ''), 'billing@primefiber.net'),
  smtp_user = CASE
    WHEN smtp_user IS NULL OR smtp_user ILIKE '%dizitel%' THEN 'Prime Fibernet Billing <billing@primefiber.net>'
    ELSE smtp_user
  END,
  updated_at = NOW()
WHERE id IS NOT NULL;
