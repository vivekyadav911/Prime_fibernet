-- Payroll attendance triage: audit trail, resolution tagging, payslip override flags

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS payroll_resolution_type TEXT;

COMMENT ON COLUMN public.shifts.payroll_resolution_type IS
  'triage_correction | payroll_bulk_override when resolved from payroll triage';

ALTER TABLE public.payslips
  ADD COLUMN IF NOT EXISTS admin_override_day_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.payslips
  ADD COLUMN IF NOT EXISTS admin_override_dates JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.payroll_attendance_triage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES public.officers(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  action TEXT NOT NULL,
  resolution_type TEXT NOT NULL,
  previous_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  new_status TEXT,
  reason TEXT NOT NULL,
  performed_by UUID REFERENCES public.profiles(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_payroll_triage_log_officer_period
  ON public.payroll_attendance_triage_log(officer_id, pay_period_start, pay_period_end, performed_at DESC);

ALTER TABLE public.payroll_attendance_triage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payroll_triage_log_admin ON public.payroll_attendance_triage_log;
CREATE POLICY payroll_triage_log_admin ON public.payroll_attendance_triage_log
  FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
