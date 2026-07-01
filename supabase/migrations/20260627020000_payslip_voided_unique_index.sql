-- Voided payslips should not block regenerating a new payslip for the same period.

DROP INDEX IF EXISTS public.idx_payslips_officer_period;

CREATE UNIQUE INDEX idx_payslips_officer_period
  ON public.payslips (officer_id, pay_period_start, pay_period_end)
  WHERE status NOT IN ('cancelled', 'voided');
