-- Re-flag invalid approved payslips, fix overlapping compensation ranges, holiday scope label

ALTER TABLE public.company_holidays
  ADD COLUMN IF NOT EXISTS scope_label TEXT NOT NULL DEFAULT 'Company-wide';

COMMENT ON COLUMN public.company_holidays.scope_label IS
  'Human-readable scope, e.g. Company-wide or Delhi branch officers';

-- Close overlapping compensation records (keep newest per officer per day unambiguous)
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

-- Re-flag approved payslips with inconsistent snapshots (stale pre-fix data)
WITH breakdown_totals AS (
  SELECT
    p.id AS payslip_id,
    p.gross_earnings,
    p.net_pay,
    p.total_additions,
    p.total_deductions,
    p.total_actual_hours,
    p.hourly_rate,
    p.employee_name,
    COUNT(b.id) AS breakdown_rows,
    COALESCE(SUM(b.day_pay), 0) AS breakdown_gross,
    COALESCE(SUM(b.actual_hours), 0) AS breakdown_hours
  FROM public.payslips p
  LEFT JOIN public.payslip_daily_breakdown b ON b.payslip_id = p.id
  WHERE p.status = 'approved'
  GROUP BY p.id
),
invalid AS (
  SELECT
    payslip_id,
    CASE
      WHEN breakdown_rows = 0 AND gross_earnings > 0 THEN 'Empty daily breakdown with non-zero gross (stale snapshot)'
      WHEN ABS(breakdown_gross - gross_earnings) > 0.02 THEN 'Daily breakdown gross does not match summary gross'
      WHEN ABS(breakdown_hours - total_actual_hours) > 0.05 THEN 'Daily breakdown hours do not match summary hours'
      WHEN ABS((gross_earnings + total_additions - total_deductions) - net_pay) > 0.02 THEN 'Net pay does not reconcile with gross + additions - deductions'
      WHEN hourly_rate <= 0 AND gross_earnings > 0 THEN 'Hourly rate is zero but gross earnings is non-zero'
      WHEN employee_name IS NULL OR TRIM(employee_name) = '' OR LOWER(TRIM(employee_name)) = 'unknown officer' THEN 'Missing or invalid officer profile on payslip'
      ELSE 'Payslip failed post-fix validation'
    END AS reason
  FROM breakdown_totals
  WHERE
    (breakdown_rows = 0 AND gross_earnings > 0)
    OR ABS(breakdown_gross - gross_earnings) > 0.02
    OR ABS(breakdown_hours - total_actual_hours) > 0.05
    OR ABS((gross_earnings + total_additions - total_deductions) - net_pay) > 0.02
    OR (hourly_rate <= 0 AND gross_earnings > 0)
    OR employee_name IS NULL
    OR TRIM(employee_name) = ''
    OR LOWER(TRIM(employee_name)) = 'unknown officer'
),
reflagged AS (
  UPDATE public.payslips p
  SET
    status = 'needs_review',
    calculation_warnings = COALESCE(p.calculation_warnings, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object('code', 'snapshot_invalid', 'message', invalid.reason)
    ),
    authorized_by = NULL,
    authorized_signature_name = NULL,
    authorized_at = NULL,
    generated_pdf_url = NULL,
    updated_at = now()
  FROM invalid
  WHERE p.id = invalid.payslip_id
  RETURNING p.id AS payslip_id, invalid.reason
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
  reflagged.payslip_id,
  'auto_reflagged',
  NULL,
  'approved',
  'needs_review',
  reflagged.reason,
  jsonb_build_object('migration', '20260637000000_payroll_revalidate_and_compensation')
FROM reflagged;
