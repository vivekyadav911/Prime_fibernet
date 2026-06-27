-- Payroll audit trail, extended payslip statuses, and calculation snapshot fields.

CREATE TABLE IF NOT EXISTS public.payroll_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id UUID NOT NULL REFERENCES public.payslips(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES public.profiles(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_payroll_audit_log_payslip
  ON public.payroll_audit_log (payslip_id, performed_at DESC);

ALTER TABLE public.payslips
  ADD COLUMN IF NOT EXISTS calculation_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attendance_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS void_reason TEXT;

ALTER TABLE public.payslips DROP CONSTRAINT IF EXISTS payslips_status_check;

ALTER TABLE public.payslips
  ADD CONSTRAINT payslips_status_check
  CHECK (
    status IN (
      'draft',
      'pending_review',
      'needs_review',
      'flagged_zero_pay',
      'approved',
      'paid',
      'cancelled',
      'voided'
    )
  );

ALTER TABLE public.payroll_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payroll_audit_log_admin ON public.payroll_audit_log;

CREATE POLICY payroll_audit_log_admin ON public.payroll_audit_log
  FOR ALL USING (public.is_admin_user());
