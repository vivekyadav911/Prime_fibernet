-- Employment contracts: structured Indian-style employment contracts for officers.
-- LEGAL NOTE: Clause templates are starting points only. Have contracts reviewed by
-- legal counsel before use. Non-compete clauses may be limited under Section 27 of
-- the Indian Contract Act. PF/ESI thresholds and rates change periodically.

CREATE TABLE IF NOT EXISTS public.employment_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES public.officers(id) ON DELETE CASCADE,

  company_name TEXT NOT NULL,
  company_address TEXT NOT NULL,
  company_cin TEXT,
  company_pan TEXT,
  authorized_signatory_name TEXT NOT NULL,
  authorized_signatory_designation TEXT NOT NULL,

  employee_full_name TEXT NOT NULL,
  employee_address TEXT NOT NULL,
  employee_phone TEXT,
  employee_email TEXT,
  employee_pan TEXT,
  employee_aadhaar_last4 TEXT,
  employee_designation TEXT NOT NULL,
  employee_department TEXT,

  employment_type TEXT NOT NULL DEFAULT 'full_time'
    CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'probation', 'intern')),
  date_of_joining DATE NOT NULL,
  probation_period_months INTEGER DEFAULT 0,
  contract_end_date DATE,
  reporting_manager TEXT,
  work_location TEXT NOT NULL,

  ctc_annual NUMERIC(12, 2) NOT NULL,
  basic_salary_monthly NUMERIC(12, 2),
  hra_monthly NUMERIC(12, 2),
  special_allowance_monthly NUMERIC(12, 2),
  pf_employer_contribution NUMERIC(12, 2),
  gratuity_applicable BOOLEAN DEFAULT true,
  bonus_terms TEXT,
  salary_payment_date TEXT DEFAULT '1st of every month',
  salary_revision_clause TEXT DEFAULT 'Subject to annual performance review',

  working_days_per_week INTEGER DEFAULT 6,
  working_hours_per_day TEXT DEFAULT '9:00 AM to 6:00 PM',
  weekly_off TEXT DEFAULT 'Sunday',
  leave_policy TEXT,

  notice_period_days INTEGER DEFAULT 30,
  notice_period_probation_days INTEGER DEFAULT 15,
  termination_clause TEXT,
  resignation_clause TEXT,

  confidentiality_clause TEXT,
  non_compete_clause TEXT,
  non_compete_months INTEGER DEFAULT 0,
  ip_assignment_clause TEXT,

  pf_applicable BOOLEAN DEFAULT true,
  esi_applicable BOOLEAN DEFAULT false,
  professional_tax_applicable BOOLEAN DEFAULT true,
  tds_applicable BOOLEAN DEFAULT true,

  custom_clauses JSONB DEFAULT '[]'::jsonb,

  governing_law_jurisdiction TEXT DEFAULT 'Courts of [City], India',

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'generated', 'sent', 'signed', 'active', 'terminated', 'archived')),
  generated_pdf_url TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT employment_contracts_officer_id_unique UNIQUE (officer_id)
);

CREATE TABLE IF NOT EXISTS public.employment_contract_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.employment_contracts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  pdf_url TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employment_contract_versions_contract_id
  ON public.employment_contract_versions(contract_id, version_number DESC);

CREATE TABLE IF NOT EXISTS public.company_contract_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_address TEXT NOT NULL,
  company_cin TEXT,
  company_pan TEXT,
  default_signatory_name TEXT,
  default_signatory_designation TEXT,
  logo_url TEXT,
  default_governing_law TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.employment_contracts_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employment_contracts_updated_at ON public.employment_contracts;
CREATE TRIGGER employment_contracts_updated_at
  BEFORE UPDATE ON public.employment_contracts
  FOR EACH ROW EXECUTE FUNCTION public.employment_contracts_set_updated_at();

DROP TRIGGER IF EXISTS company_contract_defaults_updated_at ON public.company_contract_defaults;
CREATE TRIGGER company_contract_defaults_updated_at
  BEFORE UPDATE ON public.company_contract_defaults
  FOR EACH ROW EXECUTE FUNCTION public.employment_contracts_set_updated_at();

ALTER TABLE public.employment_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_contract_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_contract_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY employment_contracts_admin_all ON public.employment_contracts
  FOR ALL USING (public.is_admin_user());

CREATE POLICY employment_contracts_officer_select ON public.employment_contracts
  FOR SELECT USING (officer_id = public.current_officer_id());

CREATE POLICY employment_contract_versions_admin_all ON public.employment_contract_versions
  FOR ALL USING (public.is_admin_user());

CREATE POLICY employment_contract_versions_officer_select ON public.employment_contract_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employment_contracts c
      WHERE c.id = contract_id AND c.officer_id = public.current_officer_id()
    )
  );

CREATE POLICY company_contract_defaults_admin ON public.company_contract_defaults
  FOR ALL USING (public.is_admin_user());

INSERT INTO storage.buckets (id, name, public)
VALUES ('employment-contracts', 'employment-contracts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY employment_contracts_storage_admin ON storage.objects
  FOR ALL USING (
    bucket_id = 'employment-contracts'
    AND public.is_admin_user()
  );

CREATE POLICY employment_contracts_storage_officer_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'employment-contracts'
    AND (storage.foldername(name))[1] = public.current_officer_id()::text
  );

CREATE POLICY employment_contracts_storage_admin_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'employment-contracts'
    AND public.is_admin_user()
  );

CREATE POLICY employment_contracts_storage_admin_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'employment-contracts'
    AND public.is_admin_user()
  );

CREATE POLICY employment_contracts_storage_admin_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'employment-contracts'
    AND public.is_admin_user()
  );
