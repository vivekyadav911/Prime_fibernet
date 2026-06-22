-- Ensure admin storage SELECT works for officer-documents (view/download)

DROP POLICY IF EXISTS officer_documents_storage_admin_select ON storage.objects;

CREATE POLICY officer_documents_storage_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'officer-documents'
    AND (
      public.is_admin_user()
      OR public.is_admin()
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[1] = 'pending'
    )
  );
