-- Payslip generation module: hourly-rate payroll from shifts attendance (read-only).
-- Statutory PF/ESI/TDS compliance is out of scope — deductions are admin line items only.

-- ─── Shift schedule: per-definition working days (0=Sun … 6=Sat) ─────────────

ALTER TABLE public.shift_definitions
  ADD COLUMN IF NOT EXISTS working_days SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5,6}';

-- ─── Employee compensation (officer_id — payroll identity matches attendance) ───

CREATE TABLE IF NOT EXISTS public.employee_compensation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES public.officers(id) ON DELETE CASCADE,
  monthly_salary NUMERIC(12, 2) NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_compensation_officer_dates
  ON public.employee_compensation (officer_id, effective_from DESC);

-- ─── Pay type rules ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pay_type_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_status TEXT NOT NULL UNIQUE,
  pay_fraction NUMERIC(4, 3) NOT NULL DEFAULT 1.000,
  uses_scheduled_hours BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.pay_type_rules (attendance_status, pay_fraction, uses_scheduled_hours, description)
VALUES
  ('on_leave', 1.000, true, 'Approved leave — paid in full'),
  ('holiday', 1.000, true, 'Company holiday — paid in full'),
  ('absent', 0.000, true, 'Unmarked absence — unpaid'),
  ('half_day', 0.500, false, 'Half day — pay from actual hours with fraction fallback'),
  ('late', 1.000, false, 'Late arrival — pay from actual hours'),
  ('present', 1.000, false, 'Present — pay from actual hours')
ON CONFLICT (attendance_status) DO NOTHING;

-- ─── Display label thresholds ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.attendance_label_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  min_hours_fraction NUMERIC(4, 3) NOT NULL,
  max_hours_fraction NUMERIC(4, 3),
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.attendance_label_thresholds (label, min_hours_fraction, max_hours_fraction, sort_order)
SELECT * FROM (VALUES
  ('Present (Extra Hours)'::text, 1.001::numeric, NULL::numeric, 60),
  ('Present', 0.900, 1.000, 50),
  ('Half Day', 0.500, 0.899, 40),
  ('Quarter Day', 0.250, 0.499, 30),
  ('Partial', 0.001, 0.249, 20)
) AS v(label, min_hours_fraction, max_hours_fraction, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.attendance_label_thresholds LIMIT 1);

-- ─── Company holidays ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.company_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  applies_to_all BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Upgrade payslips table ───────────────────────────────────────────────────

ALTER TABLE public.payslips
  ADD COLUMN IF NOT EXISTS pay_period_start DATE,
  ADD COLUMN IF NOT EXISTS pay_period_end DATE,
  ADD COLUMN IF NOT EXISTS pay_period_label TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS company_address TEXT,
  ADD COLUMN IF NOT EXISTS company_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS employee_name TEXT,
  ADD COLUMN IF NOT EXISTS employee_designation TEXT,
  ADD COLUMN IF NOT EXISTS employee_id_display TEXT,
  ADD COLUMN IF NOT EXISTS employee_department TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_last4 TEXT,
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS total_scheduled_days INTEGER,
  ADD COLUMN IF NOT EXISTS total_worked_days INTEGER,
  ADD COLUMN IF NOT EXISTS total_actual_hours NUMERIC(7, 2),
  ADD COLUMN IF NOT EXISTS gross_earnings NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS total_additions NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_deductions NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payslip_status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS generated_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS authorized_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS authorized_signature_name TEXT,
  ADD COLUMN IF NOT EXISTS authorized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS generated_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS negative_pay_override_note TEXT;

-- Migrate legacy month column into pay period where possible
UPDATE public.payslips
SET
  pay_period_start = COALESCE(pay_period_start, date_trunc('month', month::timestamp)::date),
  pay_period_end = COALESCE(
    pay_period_end,
    (date_trunc('month', month::timestamp) + interval '1 month' - interval '1 day')::date
  ),
  pay_period_label = COALESCE(
    pay_period_label,
    to_char(month::timestamp, 'FMMonth YYYY')
  ),
  gross_earnings = COALESCE(gross_earnings, base),
  total_additions = COALESCE(total_additions, bonuses),
  total_deductions = COALESCE(total_deductions, deductions),
  payslip_status = COALESCE(payslip_status, 'approved'),
  generated_pdf_url = COALESCE(generated_pdf_url, pdf_url)
WHERE month IS NOT NULL;

ALTER TABLE public.payslips DROP COLUMN IF EXISTS month;
ALTER TABLE public.payslips DROP COLUMN IF EXISTS base;
ALTER TABLE public.payslips DROP COLUMN IF EXISTS bonuses;
ALTER TABLE public.payslips DROP COLUMN IF EXISTS pdf_url;

-- Rename payslip_status to status if old status column absent; use payslip_status as canonical
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payslips' AND column_name = 'payslip_status'
  ) THEN
    ALTER TABLE public.payslips RENAME COLUMN payslip_status TO status;
  END IF;
END $$;

ALTER TABLE public.payslips
  DROP CONSTRAINT IF EXISTS payslips_status_check;

ALTER TABLE public.payslips
  ADD CONSTRAINT payslips_status_check
  CHECK (status IN ('draft', 'pending_review', 'approved', 'paid', 'cancelled'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_payslips_officer_period
  ON public.payslips (officer_id, pay_period_start, pay_period_end)
  WHERE status NOT IN ('cancelled');

-- ─── Daily breakdown ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payslip_daily_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id UUID NOT NULL REFERENCES public.payslips(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  attendance_record_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  is_scheduled_working_day BOOLEAN NOT NULL,
  actual_hours NUMERIC(5, 2) NOT NULL DEFAULT 0,
  display_label TEXT NOT NULL,
  day_pay NUMERIC(10, 2) NOT NULL DEFAULT 0,
  hourly_rate_applied NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (payslip_id, date)
);

CREATE INDEX IF NOT EXISTS idx_payslip_daily_breakdown_payslip
  ON public.payslip_daily_breakdown (payslip_id, date);

-- ─── Line items (no statutory engine — admin-entered only) ────────────────────

CREATE TABLE IF NOT EXISTS public.payslip_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id UUID NOT NULL REFERENCES public.payslips(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('addition', 'deduction')),
  label TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  notes TEXT,
  added_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payslip_line_items_payslip
  ON public.payslip_line_items (payslip_id);

-- ─── Backfill employee_compensation ───────────────────────────────────────────

INSERT INTO public.employee_compensation (officer_id, monthly_salary, effective_from)
SELECT
  o.id,
  COALESCE(
    ec.basic_salary_monthly,
    osc.basic_salary,
    o.base_salary,
    0
  ),
  COALESCE(ec.date_of_joining, o.created_at::date, CURRENT_DATE)
FROM public.officers o
LEFT JOIN public.employment_contracts ec ON ec.officer_id = o.id
LEFT JOIN public.officer_salary_config osc ON osc.officer_id = o.id
WHERE COALESCE(ec.basic_salary_monthly, osc.basic_salary, o.base_salary) IS NOT NULL
  AND COALESCE(ec.basic_salary_monthly, osc.basic_salary, o.base_salary) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.employee_compensation ec2 WHERE ec2.officer_id = o.id
  );

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.employee_compensation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_type_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_label_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslip_daily_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslip_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payslips_officer_read ON public.payslips;

CREATE POLICY employee_compensation_admin ON public.employee_compensation
  FOR ALL USING (public.is_admin_user());

CREATE POLICY pay_type_rules_admin ON public.pay_type_rules
  FOR ALL USING (public.is_admin_user());

CREATE POLICY pay_type_rules_read ON public.pay_type_rules
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY attendance_label_thresholds_admin ON public.attendance_label_thresholds
  FOR ALL USING (public.is_admin_user());

CREATE POLICY attendance_label_thresholds_read ON public.attendance_label_thresholds
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY company_holidays_admin ON public.company_holidays
  FOR ALL USING (public.is_admin_user());

CREATE POLICY company_holidays_read ON public.company_holidays
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY payslips_admin ON public.payslips
  FOR ALL USING (public.is_admin_user());

CREATE POLICY payslips_officer_read ON public.payslips
  FOR SELECT USING (
    officer_id = public.current_officer_id()
    AND status IN ('approved', 'paid')
  );

CREATE POLICY payslip_daily_breakdown_admin ON public.payslip_daily_breakdown
  FOR ALL USING (public.is_admin_user());

CREATE POLICY payslip_daily_breakdown_officer_read ON public.payslip_daily_breakdown
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.payslips p
      WHERE p.id = payslip_id
        AND p.officer_id = public.current_officer_id()
        AND p.status IN ('approved', 'paid')
    )
  );

CREATE POLICY payslip_line_items_admin ON public.payslip_line_items
  FOR ALL USING (public.is_admin_user());

CREATE POLICY payslip_line_items_officer_read ON public.payslip_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.payslips p
      WHERE p.id = payslip_id
        AND p.officer_id = public.current_officer_id()
        AND p.status IN ('approved', 'paid')
    )
  );

-- ─── Storage: payslips bucket private + RLS ───────────────────────────────────

UPDATE storage.buckets SET public = false WHERE id = 'payslips';

DROP POLICY IF EXISTS payslips_storage_admin ON storage.objects;
DROP POLICY IF EXISTS payslips_storage_officer_read ON storage.objects;

CREATE POLICY payslips_storage_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payslips' AND (public.is_admin_user() OR public.is_admin()));

CREATE POLICY payslips_storage_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payslips' AND (public.is_admin_user() OR public.is_admin()));

CREATE POLICY payslips_storage_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'payslips' AND (public.is_admin_user() OR public.is_admin()));

CREATE POLICY payslips_storage_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'payslips' AND (public.is_admin_user() OR public.is_admin()));

CREATE POLICY payslips_storage_officer_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payslips'
    AND (storage.foldername(name))[1] = public.current_officer_id()::text
  );
