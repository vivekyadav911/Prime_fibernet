-- Allow HTML receipts in exports bucket and let customers read their own receipt files.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/html',
  'text/html; charset=utf-8'
]
WHERE id = 'exports';

DROP POLICY IF EXISTS exports_customer_receipts_read ON storage.objects;
CREATE POLICY exports_customer_receipts_read ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'exports'
    AND name LIKE 'receipt_%'
    AND EXISTS (
      SELECT 1
      FROM public.payment_receipts pr
      JOIN public.payments p ON p.id = pr.payment_id
      WHERE pr.customer_id = public.current_customer_user_id()
        AND storage.objects.name = 'receipt_' || p.payment_number || '.html'
    )
  );
