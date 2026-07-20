-- Use company timezone (general_settings.timezone) for attendance "today" boundaries.
-- Fixes false "future date" rejections when UTC date lags behind company local date.

CREATE OR REPLACE FUNCTION public.company_local_today()
RETURNS DATE
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (NOW() AT TIME ZONE COALESCE(
    (SELECT gs.timezone FROM public.general_settings gs ORDER BY gs.updated_at DESC NULLS LAST LIMIT 1),
    'Asia/Kolkata'
  ))::DATE;
$$;

GRANT EXECUTE ON FUNCTION public.company_local_today() TO authenticated;

-- Patch future-date guard in admin manual entry
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
  v_today DATE := public.company_local_today();
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

  IF p_shift_date > v_today AND p_status NOT IN ('on_leave', 'holiday') THEN
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

-- Patch status RPC to use company-local today for not_yet_recorded boundaries
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
  ),
  local_today AS (
    SELECT public.company_local_today() AS today
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
      WHEN g.shift_date > (SELECT today FROM local_today) THEN 'not_yet_recorded'
      WHEN g.shift_date = (SELECT today FROM local_today) THEN 'not_yet_recorded'
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
