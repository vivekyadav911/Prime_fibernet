-- Attendance: atomic approval review → shift materialization + active-shift uniqueness

CREATE UNIQUE INDEX IF NOT EXISTS idx_shifts_officer_date_active
  ON public.shifts (officer_id, shift_date)
  WHERE status = 'active';

CREATE OR REPLACE FUNCTION public.review_attendance_approval(
  p_request_id UUID,
  p_action TEXT,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.attendance_approval_requests%ROWTYPE;
  v_shift public.shifts%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_user_id UUID := auth.uid();
  v_point GEOGRAPHY(POINT, 4326);
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Not authorized to review attendance approvals';
  END IF;

  IF p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;

  SELECT * INTO v_req
  FROM public.attendance_approval_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval request not found';
  END IF;

  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Approval request already reviewed';
  END IF;

  UPDATE public.attendance_approval_requests
  SET
    status = CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END,
    reviewed_by = v_user_id,
    reviewed_at = v_now,
    review_notes = p_review_notes
  WHERE id = p_request_id;

  IF p_action = 'reject' THEN
    RETURN p_request_id;
  END IF;

  v_point := ST_SetSRID(
    ST_MakePoint(v_req.requested_longitude::DOUBLE PRECISION, v_req.requested_latitude::DOUBLE PRECISION),
    4326
  )::geography;

  IF v_req.type IN ('out_of_zone_checkin', 'late_checkin') THEN
    SELECT * INTO v_shift
    FROM public.shifts
    WHERE officer_id = v_req.officer_id
      AND shift_date = v_req.attendance_date
      AND status = 'active'
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.shifts
      SET
        check_in_time = COALESCE(check_in_time, v_req.requested_at),
        location = COALESCE(location, v_point),
        geofence_id = COALESCE(geofence_id, v_req.geofence_id),
        check_in_method = 'approved_outside',
        check_in_distance_m = v_req.distance_from_fence,
        attendance_status = 'present',
        approval_request_id = p_request_id
      WHERE id = v_shift.id;
    ELSE
      INSERT INTO public.shifts (
        officer_id,
        shift_date,
        check_in_time,
        status,
        attendance_status,
        location,
        geofence_id,
        check_in_method,
        check_in_distance_m,
        approval_request_id
      ) VALUES (
        v_req.officer_id,
        v_req.attendance_date,
        v_req.requested_at,
        'active',
        'present',
        v_point,
        v_req.geofence_id,
        'approved_outside',
        v_req.distance_from_fence,
        p_request_id
      );
    END IF;

  ELSIF v_req.type IN ('out_of_zone_checkout', 'early_checkout', 'missed_checkout') THEN
    SELECT * INTO v_shift
    FROM public.shifts
    WHERE officer_id = v_req.officer_id
      AND shift_date = v_req.attendance_date
      AND status = 'active'
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No active shift found for approved check-out';
    END IF;

    UPDATE public.shifts
    SET
      check_out_time = v_req.requested_at,
      check_out_location = v_point,
      check_out_method = 'approved_outside',
      check_out_distance_m = v_req.distance_from_fence,
      working_hours = ROUND(
        EXTRACT(EPOCH FROM (v_req.requested_at - v_shift.check_in_time)) / 3600.0,
        2
      ),
      status = 'completed',
      attendance_status = 'present',
      approval_request_id = p_request_id
    WHERE id = v_shift.id;

  ELSIF v_req.type = 'manual_correction' THEN
    SELECT * INTO v_shift
    FROM public.shifts
    WHERE officer_id = v_req.officer_id
      AND shift_date = v_req.attendance_date
    ORDER BY check_in_time DESC NULLS LAST
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.shifts
      SET
        check_in_time = COALESCE(check_in_time, v_req.requested_at),
        location = COALESCE(location, v_point),
        check_in_method = COALESCE(check_in_method, 'admin_override'),
        attendance_status = COALESCE(attendance_status, 'present'),
        approval_request_id = p_request_id,
        notes = COALESCE(notes, v_req.reason)
      WHERE id = v_shift.id;
    ELSE
      INSERT INTO public.shifts (
        officer_id,
        shift_date,
        check_in_time,
        status,
        attendance_status,
        location,
        geofence_id,
        check_in_method,
        check_in_distance_m,
        approval_request_id,
        notes
      ) VALUES (
        v_req.officer_id,
        v_req.attendance_date,
        v_req.requested_at,
        'active',
        'present',
        v_point,
        v_req.geofence_id,
        'admin_override',
        v_req.distance_from_fence,
        p_request_id,
        v_req.reason
      );
    END IF;
  END IF;

  RETURN p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_attendance_approval(UUID, TEXT, TEXT) TO authenticated;
