-- Attendance & geofence enterprise rebuild
-- Fixes: assignment soft-delete, shifts RLS aligned with current_officer_id(),
-- approval insert policies, geofence radius server validation, realtime publication.

-- ─── 1. Assignment table hardening (soft deactivate, audit fields) ───────────
-- Before: assignments were hard-deleted on re-assign; no active flag or audit trail.

ALTER TABLE public.geofence_officer_assignments
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.geofence_officer_assignments
SET assigned_at = COALESCE(created_at, NOW())
WHERE assigned_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_geofence_assignments_active_officer
  ON public.geofence_officer_assignments(officer_id) WHERE active;
CREATE INDEX IF NOT EXISTS idx_geofence_assignments_active_geofence
  ON public.geofence_officer_assignments(geofence_id) WHERE active;

-- ─── 2. Shifts RLS — use current_officer_id() ────────────────────────────────
-- Before: policies only matched officers.user_id / officers.auth_user_id directly,
-- missing officers linked via users.auth_user_id (silent INSERT/UPDATE denial).

DROP POLICY IF EXISTS officer_insert_shifts ON public.shifts;
CREATE POLICY officer_insert_shifts ON public.shifts
  FOR INSERT WITH CHECK (
    officer_id = public.current_officer_id()
    OR public.is_admin_user()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS officer_own_shifts ON public.shifts;
CREATE POLICY officer_own_shifts ON public.shifts
  FOR SELECT USING (
    officer_id = public.current_officer_id()
    OR public.is_admin_user()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS officer_update_shifts ON public.shifts;
CREATE POLICY officer_update_shifts ON public.shifts
  FOR UPDATE USING (
    officer_id = public.current_officer_id()
    OR public.is_admin_user()
    OR public.is_admin()
  );

-- ─── 3. Geofence assignment RLS ──────────────────────────────────────────────
-- Before: admin FOR ALL had no explicit WITH CHECK; officers saw inactive rows.

DROP POLICY IF EXISTS geofence_assignments_admin ON public.geofence_officer_assignments;
CREATE POLICY geofence_assignments_admin ON public.geofence_officer_assignments
  FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS geofence_assignments_officer_read ON public.geofence_officer_assignments;
CREATE POLICY geofence_assignments_officer_read ON public.geofence_officer_assignments
  FOR SELECT USING (
    public.is_admin_user()
    OR (officer_id = public.current_officer_id() AND active = true)
  );

-- Officers read assigned geofences (unchanged intent, ensure active assignments only)
DROP POLICY IF EXISTS geofences_officer_read ON public.geofences;
CREATE POLICY geofences_officer_read ON public.geofences
  FOR SELECT USING (
    public.is_admin_user()
    OR id IN (
      SELECT geofence_id FROM public.geofence_officer_assignments
      WHERE officer_id = public.current_officer_id()
        AND active = true
    )
  );

-- ─── 4. Approval requests — split officer write vs read ──────────────────────
-- Before: single FOR ALL policy could block INSERT when USING didn't match on check.

DROP POLICY IF EXISTS approval_requests_officer ON public.attendance_approval_requests;

CREATE POLICY approval_requests_officer_select ON public.attendance_approval_requests
  FOR SELECT USING (officer_id = public.current_officer_id());

CREATE POLICY approval_requests_officer_insert ON public.attendance_approval_requests
  FOR INSERT WITH CHECK (officer_id = public.current_officer_id());

CREATE POLICY approval_requests_officer_update ON public.attendance_approval_requests
  FOR UPDATE USING (officer_id = public.current_officer_id());

-- ─── 5. Server-side geofence radius validation (50–500m) ─────────────────────

CREATE OR REPLACE FUNCTION public.validate_geofence_geometry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_radius NUMERIC;
BEGIN
  IF NEW.geometry IS NULL THEN
    RAISE EXCEPTION 'Geofence geometry is required';
  END IF;

  IF (NEW.geometry ->> 'shape') = 'circle' THEN
    v_radius := (NEW.geometry ->> 'radius')::NUMERIC;
    IF v_radius IS NULL OR v_radius < 50 OR v_radius > 500 THEN
      RAISE EXCEPTION 'Geofence radius must be between 50 and 500 meters (got %)', COALESCE(v_radius::TEXT, 'null');
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_geofence_geometry ON public.geofences;
CREATE TRIGGER trg_validate_geofence_geometry
  BEFORE INSERT OR UPDATE OF geometry ON public.geofences
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_geofence_geometry();

-- ─── 6. Realtime publication for admin live dashboards ───────────────────────

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_approval_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.geofence_officer_assignments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
