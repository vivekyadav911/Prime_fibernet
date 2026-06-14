-- Geofence-based attendance: geofences, approvals, shift definitions, extended shifts/leave

-- Helper: resolve officer id for current auth user
CREATE OR REPLACE FUNCTION public.current_officer_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.officers
  WHERE user_id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_officer_id() TO authenticated;

-- ─── Geofences ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  geometry JSONB NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.geofence_officer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geofence_id UUID NOT NULL REFERENCES public.geofences(id) ON DELETE CASCADE,
  officer_id UUID NOT NULL REFERENCES public.officers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (geofence_id, officer_id)
);

-- ─── Attendance approval requests ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.attendance_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES public.officers(id) ON DELETE CASCADE,
  geofence_id UUID REFERENCES public.geofences(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN (
    'out_of_zone_checkin', 'out_of_zone_checkout', 'manual_correction',
    'late_checkin', 'early_checkout', 'missed_checkout'
  )),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_latitude DECIMAL(10, 8) NOT NULL,
  requested_longitude DECIMAL(11, 8) NOT NULL,
  distance_from_fence DECIMAL(12, 2) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  photo_proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Attendance exceptions (referenced by existing client code) ────────────────

CREATE TABLE IF NOT EXISTS public.attendance_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES public.officers(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  check_in_time TIMESTAMPTZ,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Shift definitions (templates) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shift_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'fixed' CHECK (type IN ('fixed', 'flexible', 'rotational')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  grace_minutes INT NOT NULL DEFAULT 15,
  break_minutes INT NOT NULL DEFAULT 60,
  overtime_threshold_minutes INT NOT NULL DEFAULT 30,
  is_overnight BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shift_definition_officers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_definition_id UUID NOT NULL REFERENCES public.shift_definitions(id) ON DELETE CASCADE,
  officer_id UUID NOT NULL REFERENCES public.officers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shift_definition_id, officer_id)
);

-- ─── Officer location events (background sync audit) ───────────────────────────

CREATE TABLE IF NOT EXISTS public.officer_location_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES public.officers(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  event_type TEXT NOT NULL DEFAULT 'location_update',
  geofence_status JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Leave balances ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES public.officers(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  total_days INT NOT NULL DEFAULT 12,
  used_days INT NOT NULL DEFAULT 0,
  UNIQUE (officer_id, leave_type)
);

-- ─── Extend shifts (attendance records) ────────────────────────────────────────

ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS geofence_id UUID REFERENCES public.geofences(id) ON DELETE SET NULL;
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS check_in_method TEXT;
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS check_out_method TEXT;
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS check_in_distance_m DECIMAL(12, 2);
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS check_out_distance_m DECIMAL(12, 2);
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS check_out_location GEOGRAPHY(POINT, 4326);
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS working_hours DECIMAL(8, 2);
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS overtime_hours DECIMAL(8, 2);
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT false;
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS late_by_minutes INT;
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS approval_request_id UUID REFERENCES public.attendance_approval_requests(id) ON DELETE SET NULL;
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS location_mocked BOOLEAN DEFAULT false;
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS attendance_status TEXT;

-- ─── Extend leave_requests ─────────────────────────────────────────────────────

ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS is_half_day BOOLEAN DEFAULT false;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS half_day_period TEXT CHECK (half_day_period IS NULL OR half_day_period IN ('morning', 'afternoon'));
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS days INT;

-- ─── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_geofences_active ON public.geofences(is_active);
CREATE INDEX IF NOT EXISTS idx_geofence_assignments_officer ON public.geofence_officer_assignments(officer_id);
CREATE INDEX IF NOT EXISTS idx_attendance_approvals_status ON public.attendance_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_attendance_approvals_officer ON public.attendance_approval_requests(officer_id);
CREATE INDEX IF NOT EXISTS idx_shifts_geofence ON public.shifts(geofence_id);
CREATE INDEX IF NOT EXISTS idx_officer_location_events_officer ON public.officer_location_events(officer_id, recorded_at DESC);

-- ─── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_officer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_definition_officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officer_location_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

-- Geofences: admin full access; officers read assigned only
CREATE POLICY geofences_admin ON public.geofences FOR ALL USING (public.is_admin_user());
CREATE POLICY geofences_officer_read ON public.geofences FOR SELECT USING (
  public.is_admin_user()
  OR id IN (
    SELECT geofence_id FROM public.geofence_officer_assignments
    WHERE officer_id = public.current_officer_id()
  )
);

CREATE POLICY geofence_assignments_admin ON public.geofence_officer_assignments FOR ALL USING (public.is_admin_user());
CREATE POLICY geofence_assignments_officer_read ON public.geofence_officer_assignments FOR SELECT USING (
  public.is_admin_user() OR officer_id = public.current_officer_id()
);

CREATE POLICY approval_requests_admin ON public.attendance_approval_requests FOR ALL USING (public.is_admin_user());
CREATE POLICY approval_requests_officer ON public.attendance_approval_requests FOR ALL USING (
  officer_id = public.current_officer_id()
);

CREATE POLICY attendance_exceptions_admin ON public.attendance_exceptions FOR ALL USING (public.is_admin_user());
CREATE POLICY attendance_exceptions_officer ON public.attendance_exceptions FOR SELECT USING (
  officer_id = public.current_officer_id()
);

CREATE POLICY shift_definitions_admin ON public.shift_definitions FOR ALL USING (public.is_admin_user());
CREATE POLICY shift_definitions_officer_read ON public.shift_definitions FOR SELECT USING (
  public.is_admin_user()
  OR id IN (
    SELECT shift_definition_id FROM public.shift_definition_officers
    WHERE officer_id = public.current_officer_id()
  )
);

CREATE POLICY shift_def_officers_admin ON public.shift_definition_officers FOR ALL USING (public.is_admin_user());
CREATE POLICY shift_def_officers_officer_read ON public.shift_definition_officers FOR SELECT USING (
  public.is_admin_user() OR officer_id = public.current_officer_id()
);

CREATE POLICY location_events_admin ON public.officer_location_events FOR SELECT USING (public.is_admin_user());
CREATE POLICY location_events_officer ON public.officer_location_events FOR ALL USING (
  officer_id = public.current_officer_id()
);

CREATE POLICY leave_balances_admin ON public.leave_balances FOR ALL USING (public.is_admin_user());
CREATE POLICY leave_balances_officer ON public.leave_balances FOR SELECT USING (
  officer_id = public.current_officer_id()
);

-- Storage bucket for attendance photo proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-proofs', 'attendance-proofs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY attendance_proofs_officer_upload ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attendance-proofs'
  AND auth.role() = 'authenticated'
);

CREATE POLICY attendance_proofs_admin_read ON storage.objects FOR SELECT
USING (
  bucket_id = 'attendance-proofs'
  AND (public.is_admin_user() OR auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY attendance_proofs_officer_read ON storage.objects FOR SELECT
USING (
  bucket_id = 'attendance-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
