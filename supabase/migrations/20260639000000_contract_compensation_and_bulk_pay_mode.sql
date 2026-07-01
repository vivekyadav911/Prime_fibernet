-- Contract-sourced compensation terms + bulk override pay intent on shifts.
-- Does NOT auto-migrate legacy employee_compensation rows — orphans are flagged in app UI.

CREATE TABLE IF NOT EXISTS public.contract_compensation_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES public.officers(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.employment_contracts(id) ON DELETE CASCADE,
  contract_version_id UUID REFERENCES public.employment_contract_versions(id) ON DELETE SET NULL,
  monthly_salary NUMERIC(12, 2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  source TEXT NOT NULL DEFAULT 'initial_contract'
    CHECK (source IN ('initial_contract', 'amendment', 'revision')),
  reason TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_compensation_terms_officer_dates
  ON public.contract_compensation_terms (officer_id, effective_from DESC);

ALTER TABLE public.employee_compensation
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'legacy_manual',
  ADD COLUMN IF NOT EXISTS contract_term_id UUID REFERENCES public.contract_compensation_terms(id) ON DELETE SET NULL;

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS payroll_bulk_pay_mode TEXT
    CHECK (payroll_bulk_pay_mode IS NULL OR payroll_bulk_pay_mode IN ('paid', 'unpaid'));

COMMENT ON COLUMN public.employee_compensation.source IS
  'legacy_manual = payroll-only record needing contract reconciliation; contract = linked to contract_compensation_terms';

ALTER TABLE public.contract_compensation_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_compensation_terms_admin ON public.contract_compensation_terms
  FOR ALL
  USING (public.is_admin_user() OR public.is_admin())
  WITH CHECK (public.is_admin_user() OR public.is_admin());
