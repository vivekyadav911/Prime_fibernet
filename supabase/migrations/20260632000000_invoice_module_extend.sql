-- Invoice management module: GST / Non-GST / Custom GST, delivery tracking, PDF storage.

-- ─── Extend invoices ───────────────────────────────────────────────────────────

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'gst'
    CHECK (invoice_type IN ('non_gst', 'gst', 'custom_gst')),
  ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'draft'
    CHECK (delivery_status IN ('draft', 'pending', 'sent')),
  ADD COLUMN IF NOT EXISTS delivery_channel TEXT
    CHECK (delivery_channel IS NULL OR delivery_channel IN ('email', 'whatsapp', 'manual')),
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS customer_state TEXT,
  ADD COLUMN IF NOT EXISTS customer_gstin TEXT,
  ADD COLUMN IF NOT EXISTS recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_amount DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.user_payments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_to TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Backfill total_amount from legacy amount column
UPDATE public.invoices
SET
  total_amount = COALESCE(total_amount, amount),
  subtotal = COALESCE(subtotal, amount),
  delivery_status = CASE
    WHEN status IN ('paid', 'sent') THEN 'sent'
    WHEN status = 'draft' THEN 'draft'
    ELSE COALESCE(delivery_status, 'pending')
  END
WHERE total_amount IS NULL OR subtotal IS NULL;

-- ─── Extend invoice_history for audit trail ────────────────────────────────────

ALTER TABLE public.invoice_history
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS channel TEXT,
  ADD COLUMN IF NOT EXISTS recipient TEXT,
  ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_history_invoice_id
  ON public.invoice_history (invoice_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_delivery_status
  ON public.invoices (delivery_status, invoice_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id
  ON public.invoices (user_id, created_at DESC);

-- ─── Invoice number sequence helper ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  yr TEXT;
  seq INT;
BEGIN
  yr := to_char(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO seq
  FROM public.invoices
  WHERE invoice_number LIKE 'INV-' || yr || '-%';
  RETURN 'INV-' || yr || '-' || lpad(seq::text, 4, '0');
END;
$$;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoices_admin ON public.invoices;
DROP POLICY IF EXISTS invoices_customer_read ON public.invoices;
DROP POLICY IF EXISTS invoice_history_admin ON public.invoice_history;
DROP POLICY IF EXISTS invoice_history_customer_read ON public.invoice_history;
DROP POLICY IF EXISTS invoice_settings_admin ON public.invoice_settings;
DROP POLICY IF EXISTS invoice_settings_read ON public.invoice_settings;

CREATE POLICY invoices_admin ON public.invoices
  FOR ALL USING (public.is_admin_user() OR public.is_admin());

CREATE POLICY invoices_customer_read ON public.invoices
  FOR SELECT USING (
    user_id IN (
      SELECT u.id FROM public.users u
      WHERE u.auth_user_id = auth.uid()
    )
    AND delivery_status = 'sent'
  );

CREATE POLICY invoice_history_admin ON public.invoice_history
  FOR ALL USING (public.is_admin_user() OR public.is_admin());

CREATE POLICY invoice_history_customer_read ON public.invoice_history
  FOR SELECT USING (
    user_id IN (
      SELECT u.id FROM public.users u
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY invoice_settings_admin ON public.invoice_settings
  FOR ALL USING (public.is_admin_user() OR public.is_admin());

CREATE POLICY invoice_settings_read ON public.invoice_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- ─── Storage: invoices bucket private + RLS ─────────────────────────────────

UPDATE storage.buckets SET public = false WHERE id = 'invoices';

DROP POLICY IF EXISTS invoices_storage_admin_select ON storage.objects;
DROP POLICY IF EXISTS invoices_storage_admin_insert ON storage.objects;
DROP POLICY IF EXISTS invoices_storage_admin_update ON storage.objects;
DROP POLICY IF EXISTS invoices_storage_admin_delete ON storage.objects;
DROP POLICY IF EXISTS invoices_storage_customer_read ON storage.objects;

CREATE POLICY invoices_storage_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'invoices' AND (public.is_admin_user() OR public.is_admin()));

CREATE POLICY invoices_storage_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'invoices' AND (public.is_admin_user() OR public.is_admin()));

CREATE POLICY invoices_storage_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'invoices' AND (public.is_admin_user() OR public.is_admin()));

CREATE POLICY invoices_storage_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'invoices' AND (public.is_admin_user() OR public.is_admin()));

CREATE POLICY invoices_storage_customer_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'invoices'
    AND (storage.foldername(name))[1] IN (
      SELECT u.id::text FROM public.users u WHERE u.auth_user_id = auth.uid()
    )
  );
