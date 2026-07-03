-- Canonical attendance status by day: one auditable source for calendar, stats, and exports.
-- Fixes: on_leave without approved leave, variable aggregate denominators, duplicate shifts per day.

-- ─── 1. Deduplicate shifts (keep geofence-verified / earliest check-in per officer+date) ───

DELETE FROM public.shifts s
WHERE s.id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY officer_id, shift_date
        ORDER BY
          CASE
            WHEN check_in_method IN ('geofence_auto', 'manual_inside', 'approved_outside') THEN 0
            WHEN check_in_time IS NOT NULL THEN 1
            ELSE 2
          END,
          check_in_time DESC NULLS LAST,
          id DESC
      ) AS rn
    FROM public.shifts
    WHERE shift_date IS NOT NULL
  ) ranked
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shifts_officer_shift_date_unique
  ON public.shifts (officer_id, shift_date);

-- ─── 2. Manual attendance audit log ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.attendance_manual_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES public.officers(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'override')),
  previous_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  new_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason TEXT NOT NULL,
  edited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  edited_by_name TEXT NOT NULL DEFAULT '',
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_attendance_manual_audit_officer_date
  ON public.attendance_manual_audit_log (officer_id, shift_date, edited_at DESC);

ALTER TABLE public.attendance_manual_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attendance_manual_audit_admin ON public.attendance_manual_audit_log;
CREATE POLICY attendance_manual_audit_admin ON public.attendance_manual_audit_log
  FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- ─── 3. Active headcount on a date ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.active_officer_headcount_on_date(p_date DATE)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.officers o
  WHERE o.is_active = true
    AND COALESCE(o.is_blocked, false) = false
    AND COALESCE(o.joining_date, (o.created_at AT TIME ZONE 'UTC')::DATE) <= p_date
    AND (o.terminated_at IS NULL OR (o.terminated_at AT TIME ZONE 'UTC')::DATE > p_date);
$$;

GRANT EXECUTE ON FUNCTION public.active_officer_headcount_on_date(DATE) TO authenticated;

-- ─── 4. Officer scheduled working day (from shift definition) ─────────────────

CREATE OR REPLACE FUNCTION public.officer_is_scheduled_working_day(
  p_officer_id UUID,
  p_date DATE
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT EXTRACT(DOW FROM p_date)::INT = ANY(sd.working_days)
      FROM public.shift_definition_officers sdo
      JOIN public.shift_definitions sd ON sd.id = sdo.shift_definition_id
      WHERE sdo.officer_id = p_officer_id
      ORDER BY sd.created_at DESC
      LIMIT 1
    ),
    -- Default Mon–Sat when no shift assignment
    EXTRACT(DOW FROM p_date)::INT BETWEEN 1 AND 6
  );
$$;

GRANT EXECUTE ON FUNCTION public.officer_is_scheduled_working_day(UUID, DATE) TO authenticated;

-- ─── 5. Canonical status RPC ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_attendance_status_by_day(
  p_from_date DATE,
  p_to_date DATE,
  p_officer_id UUID DEFAULT NULL
)
RETURNS TABLE (
  officer_id UUID,
  officer_name TEXT,
  shift_date DATE,
  status TEXT,
  is_scheduled_working_day BOOLEAN,
  shift_id UUID,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  check_in_method TEXT,
  geofence_verified BOOLEAN,
  active_headcount INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH dates AS (
    SELECT d::DATE AS shift_date
    FROM generate_series(p_from_date, p_to_date, INTERVAL '1 day') AS d
  ),
  officers_scope AS (
    SELECT
      o.id,
      COALESCE(NULLIF(TRIM(o.full_name), ''), 'Unknown officer') AS full_name,
      COALESCE(o.joining_date, (o.created_at AT TIME ZONE 'UTC')::DATE) AS employment_start,
      o.terminated_at
    FROM public.officers o
    WHERE o.is_active = true
      AND COALESCE(o.is_blocked, false) = false
      AND (p_officer_id IS NULL OR o.id = p_officer_id)
  ),
  grid AS (
    SELECT
      d.shift_date,
      os.id AS officer_id,
      os.full_name AS officer_name
    FROM dates d
    CROSS JOIN officers_scope os
    WHERE os.employment_start <= d.shift_date
      AND (os.terminated_at IS NULL OR (os.terminated_at AT TIME ZONE 'UTC')::DATE > d.shift_date)
  ),
  headcounts AS (
    SELECT d.shift_date, public.active_officer_headcount_on_date(d.shift_date) AS active_headcount
    FROM dates d
  ),
  holidays AS (
    SELECT ch.holiday_date
    FROM public.company_holidays ch
    WHERE ch.holiday_date BETWEEN p_from_date AND p_to_date
      AND COALESCE(ch.applies_to_all, true) = true
  ),
  approved_leave AS (
    SELECT
      lr.officer_id,
      gs.leave_date AS shift_date,
      lr.is_half_day,
      lr.half_day_period
    FROM public.leave_requests lr
    CROSS JOIN LATERAL generate_series(lr.start_date, lr.end_date, INTERVAL '1 day') AS gs(leave_date)
    WHERE lr.status = 'approved'
      AND lr.start_date <= p_to_date
      AND lr.end_date >= p_from_date
      AND (p_officer_id IS NULL OR lr.officer_id = p_officer_id)
  ),
  best_shifts AS (
    SELECT DISTINCT ON (s.officer_id, s.shift_date)
      s.id,
      s.officer_id,
      s.shift_date,
      s.check_in_time,
      s.check_out_time,
      s.check_in_method,
      s.attendance_status,
      s.is_late,
      s.late_by_minutes
    FROM public.shifts s
    WHERE s.shift_date BETWEEN p_from_date AND p_to_date
      AND (p_officer_id IS NULL OR s.officer_id = p_officer_id)
    ORDER BY
      s.officer_id,
      s.shift_date,
      CASE
        WHEN s.check_in_method IN ('geofence_auto', 'manual_inside', 'approved_outside') THEN 0
        WHEN s.check_in_time IS NOT NULL THEN 1
        ELSE 2
      END,
      s.check_in_time DESC NULLS LAST,
      s.id DESC
  )
  SELECT
    g.officer_id,
    g.officer_name,
    g.shift_date,
    CASE
      WHEN h.holiday_date IS NOT NULL THEN 'holiday'
      WHEN al.officer_id IS NOT NULL AND COALESCE(al.is_half_day, false) THEN 'half_day'
      WHEN al.officer_id IS NOT NULL THEN 'on_leave'
      WHEN bs.check_in_time IS NOT NULL AND COALESCE(bs.attendance_status, '') = 'absent' THEN 'absent'
      WHEN bs.check_in_time IS NOT NULL AND COALESCE(bs.attendance_status, '') = 'half_day' THEN 'half_day'
      WHEN bs.check_in_time IS NOT NULL AND (COALESCE(bs.is_late, false) OR COALESCE(bs.attendance_status, '') = 'late') THEN 'late'
      WHEN bs.check_in_time IS NOT NULL THEN 'present'
      WHEN g.shift_date > CURRENT_DATE THEN 'not_yet_recorded'
      WHEN g.shift_date = CURRENT_DATE THEN 'not_yet_recorded'
      WHEN NOT public.officer_is_scheduled_working_day(g.officer_id, g.shift_date) THEN 'not_yet_recorded'
      ELSE 'absent'
    END AS status,
    public.officer_is_scheduled_working_day(g.officer_id, g.shift_date) AS is_scheduled_working_day,
    bs.id AS shift_id,
    bs.check_in_time,
    bs.check_out_time,
    bs.check_in_method,
    COALESCE(bs.check_in_method IN ('geofence_auto', 'manual_inside', 'approved_outside'), false) AS geofence_verified,
    hc.active_headcount
  FROM grid g
  JOIN headcounts hc ON hc.shift_date = g.shift_date
  LEFT JOIN holidays h ON h.holiday_date = g.shift_date
  LEFT JOIN approved_leave al
    ON al.officer_id = g.officer_id AND al.shift_date = g.shift_date
  LEFT JOIN best_shifts bs
    ON bs.officer_id = g.officer_id AND bs.shift_date = g.shift_date;
$$;

GRANT EXECUTE ON FUNCTION public.get_attendance_status_by_day(DATE, DATE, UUID) TO authenticated;

-- ─── 6. Admin manual entry RPC (validated upsert + audit) ────────────────────

CREATE OR REPLACE FUNCTION public.admin_manual_attendance_entry(
  p_officer_id UUID,
  p_shift_date DATE,
  p_status TEXT,
  p_check_in_time TIMESTAMPTZ DEFAULT NULL,
  p_check_out_time TIMESTAMPTZ DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_confirm_override BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_admin_name TEXT := 'Admin';
  v_existing public.shifts%ROWTYPE;
  v_shift_id UUID;
  v_working_hours DECIMAL(8, 2);
  v_prev JSONB;
  v_new JSONB;
  v_action TEXT;
  v_geofence_verified BOOLEAN;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Not authorized for manual attendance entry';
  END IF;

  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 3 THEN
    RAISE EXCEPTION 'A reason of at least 3 characters is required';
  END IF;

  IF p_status NOT IN ('present', 'absent', 'late', 'half_day', 'on_leave', 'holiday') THEN
    RAISE EXCEPTION 'Invalid attendance status: %', p_status;
  END IF;

  IF p_shift_date > CURRENT_DATE AND p_status NOT IN ('on_leave', 'holiday') THEN
    RAISE EXCEPTION 'Cannot set future date to % — only on_leave or holiday may be scheduled ahead', p_status;
  END IF;

  IF p_status = 'on_leave' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.leave_requests lr
      WHERE lr.officer_id = p_officer_id
        AND lr.status = 'approved'
        AND lr.start_date <= p_shift_date
        AND lr.end_date >= p_shift_date
    ) THEN
      RAISE EXCEPTION 'on_leave requires an approved leave request covering this date';
    END IF;
  END IF;

  SELECT COALESCE(p.full_name, u.email, 'Admin')
  INTO v_admin_name
  FROM public.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = v_user_id;

  SELECT * INTO v_existing
  FROM public.shifts
  WHERE officer_id = p_officer_id AND shift_date = p_shift_date
  LIMIT 1;

  IF FOUND THEN
    v_geofence_verified := v_existing.check_in_method IN ('geofence_auto', 'manual_inside', 'approved_outside')
      AND v_existing.check_in_time IS NOT NULL;

    IF v_geofence_verified AND NOT p_confirm_override THEN
      RAISE EXCEPTION 'CONFIRM_OVERRIDE_REQUIRED:This date has a geofence-verified check-in. Confirm override with reason.';
    END IF;

    v_prev := jsonb_build_object(
      'attendance_status', v_existing.attendance_status,
      'check_in_time', v_existing.check_in_time,
      'check_out_time', v_existing.check_out_time,
      'check_in_method', v_existing.check_in_method
    );
    v_action := 'override';
  ELSE
    v_prev := '{}'::jsonb;
    v_action := 'create';
  END IF;

  IF p_check_in_time IS NOT NULL AND p_check_out_time IS NOT NULL THEN
    v_working_hours := ROUND(
      EXTRACT(EPOCH FROM (p_check_out_time - p_check_in_time)) / 3600.0,
      2
    );
  END IF;

  INSERT INTO public.shifts (
    officer_id,
    shift_date,
    check_in_time,
    check_out_time,
    attendance_status,
    check_in_method,
    status,
    working_hours,
    is_late,
    manual_entry_by,
    manual_entry_by_name,
    manual_entry_reason,
    manual_entry_at,
    notes
  ) VALUES (
    p_officer_id,
    p_shift_date,
    p_check_in_time,
    p_check_out_time,
    p_status,
    'admin_override',
    CASE WHEN p_check_out_time IS NOT NULL THEN 'completed' ELSE 'active' END,
    v_working_hours,
    p_status = 'late',
    v_user_id,
    v_admin_name,
    TRIM(p_reason),
    NOW(),
    'Manually entered by ' || v_admin_name || ': ' || TRIM(p_reason)
  )
  ON CONFLICT (officer_id, shift_date) DO UPDATE SET
    check_in_time = EXCLUDED.check_in_time,
    check_out_time = EXCLUDED.check_out_time,
    attendance_status = EXCLUDED.attendance_status,
    check_in_method = 'admin_override',
    status = EXCLUDED.status,
    working_hours = EXCLUDED.working_hours,
    is_late = EXCLUDED.is_late,
    manual_entry_by = EXCLUDED.manual_entry_by,
    manual_entry_by_name = EXCLUDED.manual_entry_by_name,
    manual_entry_reason = EXCLUDED.manual_entry_reason,
    manual_entry_at = EXCLUDED.manual_entry_at,
    notes = EXCLUDED.notes
  RETURNING id INTO v_shift_id;

  v_new := jsonb_build_object(
    'attendance_status', p_status,
    'check_in_time', p_check_in_time,
    'check_out_time', p_check_out_time,
    'check_in_method', 'admin_override'
  );

  INSERT INTO public.attendance_manual_audit_log (
    officer_id,
    shift_date,
    shift_id,
    action,
    previous_value,
    new_value,
    reason,
    edited_by,
    edited_by_name,
    metadata
  ) VALUES (
    p_officer_id,
    p_shift_date,
    v_shift_id,
    v_action,
    v_prev,
    v_new,
    TRIM(p_reason),
    v_user_id,
    COALESCE(v_admin_name, 'Admin'),
    jsonb_build_object('confirm_override', p_confirm_override)
  );

  RETURN v_shift_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_manual_attendance_entry(UUID, DATE, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, BOOLEAN) TO authenticated;

-- ─── 7. Bulk-edit anomaly signal (surface-only, last 24h) ────────────────────

CREATE OR REPLACE FUNCTION public.attendance_manual_edit_anomaly_count(p_hours INT DEFAULT 24)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.attendance_manual_audit_log
  WHERE edited_at >= NOW() - (p_hours || ' hours')::INTERVAL
    AND edited_by = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.attendance_manual_edit_anomaly_count(INT) TO authenticated;

-- ─── 8. Officer shift update guard (block direct status tampering) ─────────────

CREATE OR REPLACE FUNCTION public.guard_shift_officer_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.is_admin_user() OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.officer_id IS DISTINCT FROM OLD.officer_id THEN
    RAISE EXCEPTION 'Officers cannot reassign shifts';
  END IF;

  IF NEW.attendance_status IS DISTINCT FROM OLD.attendance_status THEN
    IF NOT (
      OLD.status = 'active'
      AND NEW.status = 'completed'
      AND NEW.attendance_status = 'present'
      AND OLD.attendance_status IN ('present', NULL)
    ) THEN
      RAISE EXCEPTION 'Officers cannot modify attendance status directly';
    END IF;
  END IF;

  IF NEW.check_in_method IS DISTINCT FROM OLD.check_in_method THEN
    RAISE EXCEPTION 'Officers cannot modify check-in method';
  END IF;

  IF NEW.manual_entry_by IS DISTINCT FROM OLD.manual_entry_by
     OR NEW.manual_entry_reason IS DISTINCT FROM OLD.manual_entry_reason THEN
    RAISE EXCEPTION 'Officers cannot modify manual entry audit fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_shift_officer_update ON public.shifts;
CREATE TRIGGER trg_guard_shift_officer_update
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_shift_officer_update();

-- ─── 9. Test seed: canonical mixed month (idempotent) ────────────────────────

CREATE OR REPLACE FUNCTION public.seed_attendance_canonical_test_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_officer_id UUID;
  v_admin_id UUID;
  v_leave_id UUID;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT id INTO v_admin_id FROM public.users WHERE email LIKE '%admin%' LIMIT 1;
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM public.users LIMIT 1;
  END IF;

  INSERT INTO public.officers (id, full_name, email, is_active, joining_date)
  VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Test Attendance Seed',
    'attendance.seed.test@primefibernet.local',
    true,
    '2026-05-01'::DATE
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    is_active = true,
    joining_date = EXCLUDED.joining_date;

  v_officer_id := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  INSERT INTO public.shift_definition_officers (shift_definition_id, officer_id)
  SELECT sd.id, v_officer_id
  FROM public.shift_definitions sd
  LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO public.company_holidays (holiday_date, name, applies_to_all, created_by)
  VALUES ('2026-07-15', 'Seed Test Holiday', true, v_admin_id)
  ON CONFLICT DO NOTHING;

  DELETE FROM public.shifts WHERE officer_id = v_officer_id AND shift_date BETWEEN '2026-07-01' AND '2026-07-31';

  DELETE FROM public.leave_requests
  WHERE officer_id = v_officer_id AND start_date = '2026-07-08';

  INSERT INTO public.leave_requests (
    officer_id, leave_type, start_date, end_date, days, reason, status, reviewed_by, reviewed_at
  ) VALUES (
    v_officer_id, 'casual', '2026-07-08', '2026-07-08', 1,
    'Seed approved leave', 'approved', v_admin_id, NOW()
  )
  RETURNING id INTO v_leave_id;

  INSERT INTO public.shifts (officer_id, shift_date, check_in_time, check_out_time, attendance_status, check_in_method, status, is_late)
  VALUES
    (v_officer_id, '2026-07-02', '2026-07-02 09:05:00+00', '2026-07-02 18:00:00+00', 'present', 'manual_inside', 'completed', false),
    (v_officer_id, '2026-07-03', '2026-07-03 09:45:00+00', '2026-07-03 18:00:00+00', 'late', 'manual_inside', 'completed', true),
    (v_officer_id, '2026-07-04', '2026-07-04 09:00:00+00', '2026-07-04 13:00:00+00', 'half_day', 'admin_override', 'completed', false),
    (v_officer_id, '2026-07-10', '2026-07-10 09:00:00+00', '2026-07-10 18:00:00+00', 'present', 'manual_inside', 'completed', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_attendance_canonical_test_data() TO authenticated;

NOTIFY pgrst, 'reload schema';
