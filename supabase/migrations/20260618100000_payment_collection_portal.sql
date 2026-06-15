-- Enterprise Payment Collection Portal

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Helper: resolve app user id from auth.uid()
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_customer_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid() LIMIT 1),
    (SELECT u.id FROM public.users u WHERE u.id = auth.uid() LIMIT 1),
    auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.current_officer_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id
  FROM public.officers o
  WHERE o.auth_user_id = auth.uid() OR o.user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- Users billing extensions
-- ============================================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS assigned_officer_id UUID REFERENCES public.officers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('paid', 'pending', 'overdue', 'suspended')),
  ADD COLUMN IF NOT EXISTS outstanding_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_paid_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS last_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_due_date DATE,
  ADD COLUMN IF NOT EXISTS billing_cycle_day INTEGER DEFAULT 1
    CHECK (billing_cycle_day BETWEEN 1 AND 28);

UPDATE public.users
SET assigned_officer_id = owner_id
WHERE assigned_officer_id IS NULL AND owner_id IS NOT NULL;

-- ============================================================
-- Payment gateways
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  display_name TEXT,
  logo_url TEXT,
  supported_methods TEXT[] DEFAULT ARRAY['card', 'upi', 'netbanking', 'wallet'],
  credentials JSONB DEFAULT '{}',
  test_mode BOOLEAN DEFAULT FALSE,
  webhook_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_default_gateway
  ON public.payment_gateways(is_default) WHERE is_default = TRUE;

INSERT INTO public.payment_gateways (name, slug, display_name, supported_methods) VALUES
  ('Razorpay',  'razorpay',  'Pay with Razorpay',  ARRAY['card','upi','netbanking','wallet']),
  ('Easebuzz',  'easebuzz',  'Pay with Easebuzz',  ARRAY['card','upi','netbanking']),
  ('PayU',      'payu',      'Pay with PayU',      ARRAY['card','upi','netbanking','wallet']),
  ('Cashfree',  'cashfree',  'Pay with Cashfree',  ARRAY['card','upi','netbanking','upi_qr']),
  ('Paytm',     'paytm',     'Pay with Paytm',     ARRAY['card','upi','wallet','netbanking'])
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ensure_single_default_gateway()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE public.payment_gateways SET is_default = FALSE, updated_at = NOW()
    WHERE id <> NEW.id AND is_default = TRUE;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_default_gateway ON public.payment_gateways;
CREATE TRIGGER trg_single_default_gateway
  BEFORE INSERT OR UPDATE ON public.payment_gateways
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_default_gateway();

-- ============================================================
-- Payments core
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM (
    'initiated', 'pending_review', 'cash_collected', 'confirmed',
    'failed', 'refunded', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM (
    'card', 'upi', 'netbanking', 'wallet', 'cash', 'cheque'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_channel AS ENUM (
    'online_app', 'online_web', 'officer_cash', 'office_cash',
    'officer_online', 'auto_debit'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  account_number TEXT NOT NULL,
  plan_name TEXT,
  amount NUMERIC(12,2) NOT NULL,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  method public.payment_method NOT NULL,
  channel public.payment_channel NOT NULL,
  gateway_id UUID REFERENCES public.payment_gateways(id),
  gateway_slug TEXT,
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  gateway_signature TEXT,
  gateway_raw_response JSONB,
  gateway_fee NUMERIC(10,2),
  collected_by UUID REFERENCES public.officers(id),
  cash_collection_notes TEXT,
  cash_denominations JSONB,
  receipt_number TEXT,
  collection_latitude DECIMAL(10, 8),
  collection_longitude DECIMAL(11, 8),
  evidence_photo_url TEXT,
  status public.payment_status DEFAULT 'initiated',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  failure_reason TEXT,
  billing_period_start DATE,
  billing_period_end DATE,
  due_date DATE,
  next_due_date DATE,
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  legacy_user_payment_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS payment_seq START 1;

CREATE OR REPLACE FUNCTION public.set_payment_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.payment_number IS NULL OR NEW.payment_number = '' THEN
    NEW.payment_number := 'PAY-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
      LPAD(CAST(nextval('payment_seq') AS TEXT), 6, '0');
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_number ON public.payments;
CREATE TRIGGER trg_payment_number
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_payment_number();

CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_officer ON public.payments(collected_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_gateway ON public.payments(gateway_id);
CREATE INDEX IF NOT EXISTS idx_payments_created ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_account ON public.payments(account_number);
CREATE INDEX IF NOT EXISTS idx_payments_method ON public.payments(method);
CREATE INDEX IF NOT EXISTS idx_payments_channel ON public.payments(channel);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_order ON public.payments(gateway_order_id);

-- ============================================================
-- Payment confirmation trigger
-- ============================================================
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

DROP TRIGGER IF EXISTS trg_payment_confirmed ON public.payments;
CREATE TRIGGER trg_payment_confirmed
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.on_payment_confirmed();

-- ============================================================
-- Payment receipts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE UNIQUE,
  receipt_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL,
  billing_period TEXT,
  next_due_date DATE,
  company_name TEXT DEFAULT 'Prime Fibernet',
  company_address TEXT,
  company_gstin TEXT,
  pdf_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS receipt_seq START 1;

CREATE OR REPLACE FUNCTION public.set_receipt_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    NEW.receipt_number := 'RCP-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
      LPAD(CAST(nextval('receipt_seq') AS TEXT), 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_receipt_number ON public.payment_receipts;
CREATE TRIGGER trg_receipt_number
  BEFORE INSERT ON public.payment_receipts
  FOR EACH ROW EXECUTE FUNCTION public.set_receipt_number();

-- ============================================================
-- Payment refunds
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  refund_number TEXT UNIQUE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  reason TEXT NOT NULL,
  gateway_refund_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  initiated_by UUID,
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS refund_seq START 1;

CREATE OR REPLACE FUNCTION public.set_refund_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.refund_number IS NULL OR NEW.refund_number = '' THEN
    NEW.refund_number := 'REF-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
      LPAD(CAST(nextval('refund_seq') AS TEXT), 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refund_number ON public.payment_refunds;
CREATE TRIGGER trg_refund_number
  BEFORE INSERT ON public.payment_refunds
  FOR EACH ROW EXECUTE FUNCTION public.set_refund_number();

-- ============================================================
-- Analytics view
-- ============================================================
CREATE OR REPLACE VIEW public.payment_analytics AS
SELECT
  DATE_TRUNC('day', created_at)::DATE AS date,
  COUNT(*) AS total_transactions,
  COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed_count,
  COUNT(*) FILTER (WHERE status = 'pending_review') AS pending_review_count,
  COUNT(*) FILTER (WHERE status = 'cash_collected') AS cash_pending_count,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
  SUM(total_amount) FILTER (WHERE status = 'confirmed') AS confirmed_revenue,
  SUM(total_amount) FILTER (WHERE status IN ('pending_review', 'cash_collected')) AS pending_revenue,
  COUNT(*) FILTER (WHERE method = 'card') AS card_count,
  COUNT(*) FILTER (WHERE method = 'upi') AS upi_count,
  COUNT(*) FILTER (WHERE method = 'netbanking') AS netbanking_count,
  COUNT(*) FILTER (WHERE method = 'cash') AS cash_count,
  COUNT(*) FILTER (WHERE channel = 'officer_cash') AS officer_collected_count,
  ROUND(AVG(total_amount) FILTER (WHERE status = 'confirmed'), 2) AS avg_payment_amount
FROM public.payments
GROUP BY DATE_TRUNC('day', created_at)::DATE
ORDER BY date DESC;

-- ============================================================
-- Migrate legacy user_payments
-- ============================================================
ALTER TABLE public.user_payments ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.user_payments ADD COLUMN IF NOT EXISTS user_phone TEXT;
ALTER TABLE public.user_payments ADD COLUMN IF NOT EXISTS plan_name TEXT;
ALTER TABLE public.user_payments ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE public.user_payments ADD COLUMN IF NOT EXISTS gateway_transaction_id TEXT;
ALTER TABLE public.user_payments ADD COLUMN IF NOT EXISTS collection_timestamp TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.map_legacy_payment_method(raw TEXT)
RETURNS public.payment_method
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE LOWER(COALESCE(raw, 'upi'))
    WHEN 'cash' THEN 'cash'::public.payment_method
    WHEN 'card' THEN 'card'::public.payment_method
    WHEN 'credit_card' THEN 'card'::public.payment_method
    WHEN 'upi' THEN 'upi'::public.payment_method
    WHEN 'netbanking' THEN 'netbanking'::public.payment_method
    WHEN 'wallet' THEN 'wallet'::public.payment_method
    WHEN 'cheque' THEN 'cheque'::public.payment_method
    WHEN 'razorpay' THEN 'upi'::public.payment_method
    WHEN 'easybuzz' THEN 'upi'::public.payment_method
    WHEN 'easebuzz' THEN 'upi'::public.payment_method
    ELSE 'upi'::public.payment_method
  END;
END;
$$;

INSERT INTO public.payments (
  payment_number,
  customer_id,
  customer_name,
  customer_phone,
  account_number,
  plan_name,
  amount,
  total_amount,
  method,
  channel,
  gateway_slug,
  gateway_order_id,
  gateway_payment_id,
  status,
  paid_at,
  confirmed_at,
  legacy_user_payment_id,
  created_at,
  initiated_at
)
SELECT
  'PAY-LEGACY-' || SUBSTRING(up.id::TEXT, 1, 8),
  up.user_id,
  COALESCE(up.user_name, u.name, 'Customer'),
  COALESCE(up.user_phone, u.phone),
  COALESCE(u.customer_id, 'ACC-' || SUBSTRING(up.user_id::TEXT, 1, 8)),
  up.plan_name,
  COALESCE(up.amount, 0),
  COALESCE(up.amount, 0),
  public.map_legacy_payment_method(up.payment_method),
  CASE
    WHEN LOWER(COALESCE(up.created_by, '')) = 'officer' THEN 'officer_cash'::public.payment_channel
    ELSE 'online_app'::public.payment_channel
  END,
  up.gateway,
  up.transaction_id,
  COALESCE(up.gateway_transaction_id, up.transaction_id),
  CASE up.payment_status
    WHEN 'success' THEN 'confirmed'::public.payment_status
    WHEN 'failed' THEN 'failed'::public.payment_status
    WHEN 'refunded' THEN 'refunded'::public.payment_status
    WHEN 'pending' THEN
      CASE WHEN COALESCE(up.gateway_transaction_id, up.transaction_id) IS NOT NULL
        THEN 'pending_review'::public.payment_status
        ELSE 'initiated'::public.payment_status
      END
    ELSE 'initiated'::public.payment_status
  END,
  CASE WHEN up.payment_status = 'success' THEN up.collection_timestamp END,
  CASE WHEN up.payment_status = 'success' THEN COALESCE(up.collection_timestamp, up.created_at) END,
  up.id,
  up.created_at,
  up.created_at
FROM public.user_payments up
LEFT JOIN public.users u ON u.id = up.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.payments p WHERE p.legacy_user_payment_id = up.id
);

-- ============================================================
-- Public gateway RPC (no secrets)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_active_payment_gateway()
RETURNS TABLE (
  slug TEXT,
  display_name TEXT,
  logo_url TEXT,
  supported_methods TEXT[],
  test_mode BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.slug, g.display_name, g.logo_url, g.supported_methods, g.test_mode
  FROM public.payment_gateways g
  WHERE g.is_active = TRUE AND g.is_default = TRUE
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_payment_gateway() TO authenticated, anon;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_gateways_admin ON public.payment_gateways;
CREATE POLICY payment_gateways_admin ON public.payment_gateways
  FOR ALL USING (public.is_admin_user());

DROP POLICY IF EXISTS payments_admin_all ON public.payments;
CREATE POLICY payments_admin_all ON public.payments
  FOR ALL USING (public.is_admin_user());

DROP POLICY IF EXISTS payments_customer_select ON public.payments;
CREATE POLICY payments_customer_select ON public.payments
  FOR SELECT USING (customer_id = public.current_customer_user_id());

DROP POLICY IF EXISTS payments_customer_insert ON public.payments;
CREATE POLICY payments_customer_insert ON public.payments
  FOR INSERT WITH CHECK (customer_id = public.current_customer_user_id());

DROP POLICY IF EXISTS payments_officer_select ON public.payments;
CREATE POLICY payments_officer_select ON public.payments
  FOR SELECT USING (
    collected_by = public.current_officer_id()
    OR customer_id IN (
      SELECT u.id FROM public.users u
      WHERE u.assigned_officer_id = public.current_officer_id()
    )
  );

DROP POLICY IF EXISTS payments_officer_insert ON public.payments;
CREATE POLICY payments_officer_insert ON public.payments
  FOR INSERT WITH CHECK (
    collected_by = public.current_officer_id()
    AND method = 'cash'
    AND channel IN ('officer_cash', 'office_cash')
  );

DROP POLICY IF EXISTS payment_receipts_admin ON public.payment_receipts;
CREATE POLICY payment_receipts_admin ON public.payment_receipts
  FOR ALL USING (public.is_admin_user());

DROP POLICY IF EXISTS payment_receipts_customer ON public.payment_receipts;
CREATE POLICY payment_receipts_customer ON public.payment_receipts
  FOR SELECT USING (customer_id = public.current_customer_user_id());

DROP POLICY IF EXISTS payment_refunds_admin ON public.payment_refunds;
CREATE POLICY payment_refunds_admin ON public.payment_refunds
  FOR ALL USING (public.is_admin_user());

-- ============================================================
-- Storage buckets
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('payment-evidence', 'payment-evidence', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('exports', 'exports', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS payment_evidence_admin ON storage.objects;
CREATE POLICY payment_evidence_admin ON storage.objects
  FOR ALL USING (bucket_id = 'payment-evidence' AND public.is_admin_user());

DROP POLICY IF EXISTS payment_evidence_officer ON storage.objects;
CREATE POLICY payment_evidence_officer ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'payment-evidence' AND public.current_officer_id() IS NOT NULL);

DROP POLICY IF EXISTS exports_admin ON storage.objects;
CREATE POLICY exports_admin ON storage.objects
  FOR ALL USING (bucket_id = 'exports' AND public.is_admin_user());

-- Feature flag default
UPDATE public.general_settings
SET feature_flags = COALESCE(feature_flags, '{}'::jsonb) || '{"payment_collection_v2": true}'::jsonb
WHERE feature_flags IS NULL OR NOT (feature_flags ? 'payment_collection_v2');
