-- Officers need SELECT on payment-evidence to create signed URLs after upload.

DROP POLICY IF EXISTS payment_evidence_officer_select ON storage.objects;
CREATE POLICY payment_evidence_officer_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-evidence'
    AND public.current_officer_id() IS NOT NULL
  );
