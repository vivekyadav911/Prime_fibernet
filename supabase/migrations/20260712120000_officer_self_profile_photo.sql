-- Officer self-service profile photo: table UPDATE + storage policies on officer-documents.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Allow officers to update their own profile row (photo + display name only)
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS officers_self_update ON public.officers;
CREATE POLICY officers_self_update ON public.officers
  FOR UPDATE TO authenticated
  USING (id = public.current_officer_id())
  WITH CHECK (id = public.current_officer_id());

CREATE OR REPLACE FUNCTION public.guard_officer_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_photo text;
  v_phone text;
BEGIN
  IF public.is_admin_user() OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  v_full_name := NEW.full_name;
  v_photo := NEW.profile_photo_url;
  v_phone := NEW.phone;

  NEW := OLD;
  NEW.full_name := v_full_name;
  NEW.profile_photo_url := v_photo;
  NEW.phone := v_phone;
  NEW.updated_at := now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_officer_self_update ON public.officers;
CREATE TRIGGER trg_guard_officer_self_update
  BEFORE UPDATE ON public.officers
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_officer_self_update();

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Storage: officer may manage own profile_photo.* under {officer_id}/
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS officer_documents_storage_self_insert ON storage.objects;
CREATE POLICY officer_documents_storage_self_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'officer-documents'
    AND (storage.foldername(name))[1] = public.current_officer_id()::text
    AND name ~ ('^' || public.current_officer_id()::text || '/profile_photo\.(jpg|jpeg|png)$')
  );

DROP POLICY IF EXISTS officer_documents_storage_self_update ON storage.objects;
CREATE POLICY officer_documents_storage_self_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'officer-documents'
    AND (storage.foldername(name))[1] = public.current_officer_id()::text
    AND name ~ ('^' || public.current_officer_id()::text || '/profile_photo\.(jpg|jpeg|png)$')
  )
  WITH CHECK (
    bucket_id = 'officer-documents'
    AND (storage.foldername(name))[1] = public.current_officer_id()::text
    AND name ~ ('^' || public.current_officer_id()::text || '/profile_photo\.(jpg|jpeg|png)$')
  );

DROP POLICY IF EXISTS officer_documents_storage_self_select ON storage.objects;
CREATE POLICY officer_documents_storage_self_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'officer-documents'
    AND (storage.foldername(name))[1] = public.current_officer_id()::text
  );

-- Authenticated readers can SELECT profile photos for maps / live attendance.
DROP POLICY IF EXISTS officer_documents_storage_profile_photo_read ON storage.objects;
CREATE POLICY officer_documents_storage_profile_photo_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'officer-documents'
    AND name ~ '/profile_photo\.(jpg|jpeg|png)$'
  );
