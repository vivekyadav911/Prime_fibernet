-- Void corrupt stale payslip and repair compensation effective date ranges

-- Void the June 2026 payslip with empty breakdown (snapshot_invalid)
WITH voided AS (
  UPDATE public.payslips
  SET
    status = 'voided',
    voided_at = now(),
    void_reason = 'snapshot_invalid — auto cleanup',
    generated_pdf_url = NULL,
    authorized_by = NULL,
    authorized_signature_name = NULL,
    authorized_at = NULL,
    updated_at = now()
  WHERE id = '77777777-7777-7777-7777-777777777701'
    AND status != 'voided'
  RETURNING id, status
)
INSERT INTO public.payroll_audit_log (
  payslip_id,
  action,
  performed_by,
  previous_status,
  new_status,
  reason,
  metadata
)
SELECT
  '77777777-7777-7777-7777-777777777701',
  'voided',
  NULL,
  'needs_review',
  'voided',
  'snapshot_invalid — auto cleanup',
  jsonb_build_object('migration', '20260638000000_fix_compensation_ranges')
FROM voided;

-- Clear inverted effective_to values before re-applying supersession
UPDATE public.employee_compensation
SET effective_to = NULL
WHERE effective_to IS NOT NULL AND effective_to < effective_from;

-- Re-apply supersession: close each prior record the day before the next starts
WITH ranked AS (
  SELECT
    id,
    officer_id,
    effective_from,
    LEAD(effective_from) OVER (
      PARTITION BY officer_id ORDER BY effective_from ASC
    ) AS next_from
  FROM public.employee_compensation
)
UPDATE public.employee_compensation ec
SET effective_to = (ranked.next_from - INTERVAL '1 day')::date
FROM ranked
WHERE ec.id = ranked.id
  AND ranked.next_from IS NOT NULL
  AND (ec.effective_to IS NULL OR ec.effective_to >= ranked.next_from);

-- Prevent future inverted ranges
ALTER TABLE public.employee_compensation
  DROP CONSTRAINT IF EXISTS employee_compensation_effective_range_check;

ALTER TABLE public.employee_compensation
  ADD CONSTRAINT employee_compensation_effective_range_check
  CHECK (effective_to IS NULL OR effective_to >= effective_from);
