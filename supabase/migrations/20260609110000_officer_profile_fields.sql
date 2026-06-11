-- Officer profile fields, bank details, documents, RLS, storage policies, role seeds

-- Step 1 & 2 & 3 fields on officers
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS current_address TEXT;
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS permanent_address TEXT;
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS base_salary NUMERIC(12, 2);

CREATE UNIQUE INDEX IF NOT EXISTS idx_officers_employee_id
  ON public.officers(employee_id) WHERE employee_id IS NOT NULL;

-- FK on role_id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'officers_role_id_fkey'
  ) THEN
    ALTER TABLE public.officers
      ADD CONSTRAINT officers_role_id_fkey
      FOREIGN KEY (role_id) REFERENCES public.officer_roles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Bank details (1:1)
CREATE TABLE IF NOT EXISTS public.officer_bank_details (
  officer_id UUID PRIMARY KEY REFERENCES public.officers(id) ON DELETE CASCADE,
  bank_name TEXT,
  account_holder_name TEXT,
  account_number TEXT,
  ifsc_code VARCHAR(11),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents (1:many)
CREATE TABLE IF NOT EXISTS public.officer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES public.officers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('profile_photo', 'id_proof', 'address_proof')),
  file_url TEXT NOT NULL,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_officer_documents_officer_id
  ON public.officer_documents(officer_id);

-- RLS on new tables
ALTER TABLE public.officer_bank_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officer_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY officer_bank_details_admin ON public.officer_bank_details
  FOR ALL USING (public.is_admin_user());

CREATE POLICY officer_bank_details_self_read ON public.officer_bank_details
  FOR SELECT USING (
    officer_id IN (
      SELECT id FROM public.officers
      WHERE auth_user_id = auth.uid() OR user_id = auth.uid()
    )
    OR public.is_admin_user()
  );

CREATE POLICY officer_documents_admin ON public.officer_documents
  FOR ALL USING (public.is_admin_user());

CREATE POLICY officer_documents_self_read ON public.officer_documents
  FOR SELECT USING (
    officer_id IN (
      SELECT id FROM public.officers
      WHERE auth_user_id = auth.uid() OR user_id = auth.uid()
    )
    OR public.is_admin_user()
  );

-- Officers self-read policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'officers' AND policyname = 'officers_self_read'
  ) THEN
    CREATE POLICY officers_self_read ON public.officers
      FOR SELECT USING (
        auth_user_id = auth.uid()
        OR user_id = auth.uid()
        OR public.is_admin_user()
      );
  END IF;
END $$;

-- Storage policies for officer-documents bucket
CREATE POLICY officer_documents_storage_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'officer-documents'
    AND public.is_admin_user()
  );

CREATE POLICY officer_documents_storage_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'officer-documents'
    AND (
      public.is_admin_user()
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[1] = 'pending'
    )
  );

CREATE POLICY officer_documents_storage_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'officer-documents'
    AND public.is_admin_user()
  );

CREATE POLICY officer_documents_storage_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'officer-documents'
    AND public.is_admin_user()
  );

-- Seed officer roles if empty
INSERT INTO public.officer_roles (name, description)
SELECT v.name, v.description
FROM (VALUES
  ('Fiber Engineer', 'Field installation and fiber network maintenance'),
  ('Field Technician', 'On-site service and repair technician'),
  ('Support Officer', 'Customer support and coordination')
) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM public.officer_roles LIMIT 1);
