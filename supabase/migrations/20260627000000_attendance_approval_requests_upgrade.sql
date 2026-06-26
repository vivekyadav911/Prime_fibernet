-- Upgrade legacy attendance_approval_requests (created before geofence migration)
-- so PostgREST can expose geofence_id FK and full approval metadata.

ALTER TABLE public.attendance_approval_requests
  ADD COLUMN IF NOT EXISTS geofence_id UUID REFERENCES public.geofences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS requested_latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS requested_longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS distance_from_fence DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS photo_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS attendance_date DATE DEFAULT CURRENT_DATE;

UPDATE public.attendance_approval_requests
SET
  requested_at = COALESCE(requested_at, created_at, NOW()),
  attendance_date = COALESCE(attendance_date, (created_at AT TIME ZONE 'UTC')::date, CURRENT_DATE),
  type = COALESCE(type, 'manual_correction'),
  reason = COALESCE(reason, '')
WHERE requested_at IS NULL
   OR attendance_date IS NULL
   OR type IS NULL
   OR reason IS NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_approvals_geofence
  ON public.attendance_approval_requests(geofence_id);

NOTIFY pgrst, 'reload schema';
