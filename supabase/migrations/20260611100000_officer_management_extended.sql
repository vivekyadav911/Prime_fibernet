-- Officer management extended: columns, document types, credentials, JSONB support

-- Additional officer profile columns
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(20);
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS pincode VARCHAR(10);
ALTER TABLE public.officers ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20);

-- Expand document_type constraint (drop old, add new with legacy + new types)
ALTER TABLE public.officer_documents DROP CONSTRAINT IF EXISTS officer_documents_document_type_check;
ALTER TABLE public.officer_documents ADD CONSTRAINT officer_documents_document_type_check
  CHECK (document_type IN (
    'profile_photo', 'id_proof', 'address_proof',
    'photo_id_front', 'photo_id_back', 'resume'
  ));

-- Migrate legacy document types
UPDATE public.officer_documents SET document_type = 'photo_id_front' WHERE document_type = 'id_proof';
UPDATE public.officer_documents SET document_type = 'photo_id_back' WHERE document_type = 'address_proof';

-- Officer credentials (encrypted password storage for admin reveal when allowed)
CREATE TABLE IF NOT EXISTS public.officer_credentials (
  officer_id UUID PRIMARY KEY REFERENCES public.officers(id) ON DELETE CASCADE,
  login_email TEXT NOT NULL,
  password_ciphertext TEXT NOT NULL,
  visible_to_admin BOOLEAN NOT NULL DEFAULT false,
  password_set_method TEXT NOT NULL DEFAULT 'auto' CHECK (password_set_method IN ('auto', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_at TIMESTAMPTZ
);

ALTER TABLE public.officer_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY officer_credentials_admin ON public.officer_credentials
  FOR ALL USING (public.is_admin_user());

-- Seed default role permissions if table exists and empty
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'officer_role_permissions') THEN
    INSERT INTO public.officer_role_permissions (role_id, permission)
    SELECT r.id, p.perm
    FROM public.officer_roles r
    CROSS JOIN (VALUES
      ('DASHBOARD'), ('REQUESTS'), ('ATTENDANCE'), ('INVENTORY'), ('SUPPORT'), ('SETTINGS')
    ) AS p(perm)
    WHERE r.name = 'Fiber Engineer'
      AND NOT EXISTS (SELECT 1 FROM public.officer_role_permissions LIMIT 1);
  END IF;
END $$;
