-- GST invoice requests from customer app after online payment
CREATE TABLE IF NOT EXISTS public.gst_invoice_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  gstin TEXT NOT NULL,
  business_name TEXT,
  billing_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'issued', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gst_invoice_requests_customer_id
  ON public.gst_invoice_requests(customer_id);

CREATE INDEX IF NOT EXISTS idx_gst_invoice_requests_payment_id
  ON public.gst_invoice_requests(payment_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gst_invoice_requests_payment_unique
  ON public.gst_invoice_requests(payment_id);

ALTER TABLE public.gst_invoice_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY gst_invoice_requests_customer_select
  ON public.gst_invoice_requests
  FOR SELECT
  USING (customer_id = public.current_customer_user_id());

CREATE POLICY gst_invoice_requests_customer_insert
  ON public.gst_invoice_requests
  FOR INSERT
  WITH CHECK (
    customer_id = public.current_customer_user_id()
    AND EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.id = payment_id
        AND p.customer_id = public.current_customer_user_id()
        AND p.status = 'confirmed'
    )
  );

CREATE POLICY gst_invoice_requests_admin_all
  ON public.gst_invoice_requests
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT ON public.gst_invoice_requests TO authenticated;
GRANT ALL ON public.gst_invoice_requests TO service_role;
