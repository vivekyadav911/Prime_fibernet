-- Store signature PNG data on the contract row for reliable PDF embedding.

ALTER TABLE public.employment_contracts
  ADD COLUMN IF NOT EXISTS employee_signature_base64 TEXT,
  ADD COLUMN IF NOT EXISTS employer_signature_base64 TEXT;

CREATE OR REPLACE FUNCTION public.submit_employment_contract_signature(
  p_contract_id UUID,
  p_role TEXT,
  p_signature_path TEXT,
  p_signed_by UUID DEFAULT NULL,
  p_signature_base64 TEXT DEFAULT NULL
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
      employee_signature_base64 = NULLIF(TRIM(p_signature_base64), ''),
      employee_signed_at = now(),
      employee_signed_by = v_signed_by,
      signature_status = v_status
    WHERE id = p_contract_id
    RETURNING * INTO v_contract;
  ELSE
    UPDATE public.employment_contracts
    SET
      employer_signature_path = p_signature_path,
      employer_signature_base64 = NULLIF(TRIM(p_signature_base64), ''),
      employer_signed_at = now(),
      employer_signed_by = v_signed_by,
      signature_status = v_status
    WHERE id = p_contract_id
    RETURNING * INTO v_contract;
  END IF;

  RETURN v_contract;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_employment_contract_signature(UUID, TEXT, TEXT, UUID, TEXT) TO authenticated;
