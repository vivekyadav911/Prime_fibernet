-- Employment contract e-signatures + HR portal notifications category

ALTER TABLE public.employment_contracts
  ADD COLUMN IF NOT EXISTS employee_signature_path TEXT,
  ADD COLUMN IF NOT EXISTS employee_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS employee_signed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS employer_signature_path TEXT,
  ADD COLUMN IF NOT EXISTS employer_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS employer_signed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS signature_request_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signature_status TEXT NOT NULL DEFAULT 'unsigned'
    CHECK (signature_status IN ('unsigned', 'employee_signed', 'employer_signed', 'fully_signed'));

ALTER TABLE public.portal_notifications
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS action_url TEXT;

ALTER TABLE public.portal_notifications DROP CONSTRAINT IF EXISTS portal_notifications_category_check;
ALTER TABLE public.portal_notifications
  ADD CONSTRAINT portal_notifications_category_check
  CHECK (category IS NULL OR category IN ('payment', 'plan', 'ticket', 'outage', 'promo', 'system', 'hr'));

CREATE POLICY employment_contracts_storage_officer_signature_upload ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'employment-contracts'
    AND (storage.foldername(name))[1] = public.current_officer_id()::text
    AND (storage.foldername(name))[3] = 'signatures'
    AND (storage.foldername(name))[4] = 'employee.png'
  );

CREATE POLICY employment_contracts_storage_officer_signature_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'employment-contracts'
    AND (storage.foldername(name))[1] = public.current_officer_id()::text
    AND (storage.foldername(name))[3] = 'signatures'
    AND (storage.foldername(name))[4] = 'employee.png'
  );
