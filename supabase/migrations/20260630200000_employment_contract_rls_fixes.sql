-- Employment contract RLS fixes: officer resolution, SECURITY DEFINER RPCs, storage policies.

-- ============================================================
-- Fix current_officer_id() to resolve via users.auth_user_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_officer_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id
  FROM public.officers o
  LEFT JOIN public.users u ON u.id = o.user_id
  WHERE o.auth_user_id = auth.uid()
     OR o.user_id = auth.uid()
     OR u.auth_user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_officer_id() TO authenticated;

-- ============================================================
-- portal_notifications: explicit WITH CHECK for admin INSERT
-- ============================================================
DROP POLICY IF EXISTS portal_notifications_admin_all ON public.portal_notifications;
CREATE POLICY portal_notifications_admin_all ON public.portal_notifications
  FOR ALL TO authenticated
  USING (public.is_admin_user() OR public.is_admin())
  WITH CHECK (public.is_admin_user() OR public.is_admin());

-- ============================================================
-- RPC: notify officer to sign employment contract
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_officer_contract_signature(p_contract_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_officer_id UUID;
  v_auth_id UUID;
BEGIN
  IF NOT public.is_admin_user() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT c.officer_id
  INTO v_officer_id
  FROM public.employment_contracts c
  WHERE c.id = p_contract_id;

  IF v_officer_id IS NULL THEN
    RAISE EXCEPTION 'Contract not found';
  END IF;

  SELECT COALESCE(o.auth_user_id, u.auth_user_id)
  INTO v_auth_id
  FROM public.officers o
  LEFT JOIN public.users u ON u.id = o.user_id
  WHERE o.id = v_officer_id;

  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Officer has no linked login account for notifications';
  END IF;

  INSERT INTO public.portal_notifications (
    recipient_auth_id,
    recipient_officer_id,
    type,
    category,
    title,
    body,
    action_url,
    data
  ) VALUES (
    v_auth_id,
    v_officer_id,
    'system',
    'hr',
    'Sign your employment contract',
    'Please review and sign your employment contract.',
    '/officer/profile/employment-contract',
    jsonb_build_object(
      'contractId', p_contract_id,
      'officerId', v_officer_id,
      'action', 'sign_contract'
    )
  );

  UPDATE public.employment_contracts
  SET signature_request_sent_at = now()
  WHERE id = p_contract_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_officer_contract_signature(UUID) TO authenticated;

-- ============================================================
-- RPC: submit employment contract signature (employee or employer)
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_employment_contract_signature(
  p_contract_id UUID,
  p_role TEXT,
  p_signature_path TEXT,
  p_signed_by UUID DEFAULT NULL
)
RETURNS public.employment_contracts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract public.employment_contracts%ROWTYPE;
  v_has_employee BOOLEAN;
  v_has_employer BOOLEAN;
  v_status TEXT;
  v_signed_by UUID;
BEGIN
  SELECT * INTO v_contract
  FROM public.employment_contracts
  WHERE id = p_contract_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found';
  END IF;

  v_signed_by := COALESCE(p_signed_by, auth.uid());

  IF p_role = 'employee' THEN
    IF v_contract.officer_id IS DISTINCT FROM public.current_officer_id() THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
    v_has_employee := TRUE;
    v_has_employer := v_contract.employer_signature_path IS NOT NULL;
  ELSIF p_role = 'employer' THEN
    IF NOT public.is_admin_user() AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
    v_has_employee := v_contract.employee_signature_path IS NOT NULL;
    v_has_employer := TRUE;
  ELSE
    RAISE EXCEPTION 'Invalid signature role';
  END IF;

  v_status := CASE
    WHEN v_has_employee AND v_has_employer THEN 'fully_signed'
    WHEN v_has_employee THEN 'employee_signed'
    WHEN v_has_employer THEN 'employer_signed'
    ELSE 'unsigned'
  END;

  IF p_role = 'employee' THEN
    UPDATE public.employment_contracts
    SET
      employee_signature_path = p_signature_path,
      employee_signed_at = now(),
      employee_signed_by = v_signed_by,
      signature_status = v_status
    WHERE id = p_contract_id
    RETURNING * INTO v_contract;
  ELSE
    UPDATE public.employment_contracts
    SET
      employer_signature_path = p_signature_path,
      employer_signed_at = now(),
      employer_signed_by = v_signed_by,
      signature_status = v_status
    WHERE id = p_contract_id
    RETURNING * INTO v_contract;
  END IF;

  RETURN v_contract;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_employment_contract_signature(UUID, TEXT, TEXT, UUID) TO authenticated;

-- ============================================================
-- RPC: publish fully signed contract PDF (archive + bump version)
-- ============================================================
CREATE OR REPLACE FUNCTION public.publish_signed_employment_contract_pdf(
  p_contract_id UUID,
  p_storage_path TEXT,
  p_new_version INTEGER,
  p_archived_version INTEGER DEFAULT NULL,
  p_archived_snapshot JSONB DEFAULT NULL,
  p_archived_pdf_url TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS public.employment_contracts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract public.employment_contracts%ROWTYPE;
  v_created_by UUID;
BEGIN
  SELECT * INTO v_contract
  FROM public.employment_contracts
  WHERE id = p_contract_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found';
  END IF;

  IF NOT (
    public.is_admin_user()
    OR public.is_admin()
    OR v_contract.officer_id = public.current_officer_id()
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_created_by := COALESCE(p_created_by, auth.uid());

  IF p_archived_version IS NOT NULL AND p_archived_snapshot IS NOT NULL THEN
    INSERT INTO public.employment_contract_versions (
      contract_id,
      version_number,
      snapshot,
      pdf_url,
      created_by
    ) VALUES (
      p_contract_id,
      p_archived_version,
      p_archived_snapshot,
      p_archived_pdf_url,
      v_created_by
    );
  END IF;

  UPDATE public.employment_contracts
  SET
    generated_pdf_url = p_storage_path,
    version = p_new_version,
    status = 'signed',
    signature_status = 'fully_signed'
  WHERE id = p_contract_id
  RETURNING * INTO v_contract;

  RETURN v_contract;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_signed_employment_contract_pdf(UUID, TEXT, INTEGER, INTEGER, JSONB, TEXT, UUID) TO authenticated;

-- ============================================================
-- Storage: drop legacy employment-contracts policies
-- ============================================================
DROP POLICY IF EXISTS employment_contracts_storage_admin ON storage.objects;
DROP POLICY IF EXISTS employment_contracts_storage_officer_read ON storage.objects;
DROP POLICY IF EXISTS employment_contracts_storage_admin_insert ON storage.objects;
DROP POLICY IF EXISTS employment_contracts_storage_admin_update ON storage.objects;
DROP POLICY IF EXISTS employment_contracts_storage_admin_delete ON storage.objects;
DROP POLICY IF EXISTS employment_contracts_storage_officer_signature_upload ON storage.objects;
DROP POLICY IF EXISTS employment_contracts_storage_officer_signature_update ON storage.objects;

-- Admin storage access
CREATE POLICY employment_contracts_storage_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'employment-contracts'
    AND (public.is_admin_user() OR public.is_admin())
  );

CREATE POLICY employment_contracts_storage_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'employment-contracts'
    AND (public.is_admin_user() OR public.is_admin())
  );

CREATE POLICY employment_contracts_storage_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'employment-contracts'
    AND (public.is_admin_user() OR public.is_admin())
  );

CREATE POLICY employment_contracts_storage_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'employment-contracts'
    AND (public.is_admin_user() OR public.is_admin())
  );

-- Officer read own folder
CREATE POLICY employment_contracts_storage_officer_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'employment-contracts'
    AND (storage.foldername(name))[1] = public.current_officer_id()::text
  );

-- Officer signature upload/update
CREATE POLICY employment_contracts_storage_officer_signature_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'employment-contracts'
    AND (storage.foldername(name))[1] = public.current_officer_id()::text
    AND (storage.foldername(name))[3] = 'signatures'
    AND storage.filename(name) IN ('employee.png', 'employer.png')
  );

CREATE POLICY employment_contracts_storage_officer_signature_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'employment-contracts'
    AND (storage.foldername(name))[1] = public.current_officer_id()::text
    AND (storage.foldername(name))[3] = 'signatures'
    AND storage.filename(name) IN ('employee.png', 'employer.png')
  );

-- Officer versioned PDF upload/update after fully signed
CREATE POLICY employment_contracts_storage_officer_pdf_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'employment-contracts'
    AND (storage.foldername(name))[1] = public.current_officer_id()::text
    AND storage.filename(name) ~ '^v[0-9]+\.pdf$'
  );

CREATE POLICY employment_contracts_storage_officer_pdf_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'employment-contracts'
    AND (storage.foldername(name))[1] = public.current_officer_id()::text
    AND storage.filename(name) ~ '^v[0-9]+\.pdf$'
  );
