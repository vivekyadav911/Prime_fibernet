-- Officer tracking: PostGIS live locations, dwells, daily activity, geofence events

-- ─── Extend officers ─────────────────────────────────────────────────────────

ALTER TABLE public.officers
  ADD COLUMN IF NOT EXISTS is_location_tracking_enabled BOOLEAN DEFAULT true;

-- ─── Extend officer_location_events (primary trail source) ───────────────────

ALTER TABLE public.officer_location_events
  ADD COLUMN IF NOT EXISTS heading DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS speed DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS altitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS is_moving BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS battery_level INTEGER,
  ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

CREATE INDEX IF NOT EXISTS idx_officer_location_events_geo
  ON public.officer_location_events USING GIST(location);

-- ─── Live officer locations (one row per officer) ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.officer_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES public.officers(id) ON DELETE CASCADE UNIQUE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  altitude DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  location GEOGRAPHY(POINT, 4326),
  battery_level INTEGER,
  is_online BOOLEAN DEFAULT true,
  is_moving BOOLEAN DEFAULT false,
  app_version TEXT,
  device_info JSONB,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_officer_locations_geo
  ON public.officer_locations USING GIST(location);

-- ─── Dwell / stop detection ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.officer_dwells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES public.officers(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  radius_metres DOUBLE PRECISION DEFAULT 50,
  arrived_at TIMESTAMPTZ NOT NULL,
  departed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  address TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dwells_officer_date
  ON public.officer_dwells(officer_id, date DESC);

CREATE TABLE IF NOT EXISTS public.officer_dwell_tracking (
  officer_id UUID PRIMARY KEY REFERENCES public.officers(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  started_at TIMESTAMPTZ NOT NULL
);

-- ─── Daily activity summary ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.officer_daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES public.officers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_distance_km DOUBLE PRECISION DEFAULT 0,
  total_time_active_minutes INTEGER DEFAULT 0,
  total_stops INTEGER DEFAULT 0,
  avg_speed_kmh DOUBLE PRECISION DEFAULT 0,
  max_speed_kmh DOUBLE PRECISION DEFAULT 0,
  first_ping_at TIMESTAMPTZ,
  last_ping_at TIMESTAMPTZ,
  total_pings INTEGER DEFAULT 0,
  geofence_violations INTEGER DEFAULT 0,
  UNIQUE(officer_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_activity_officer_date
  ON public.officer_daily_activity(officer_id, date DESC);

-- ─── Geofence events ───────────────────────────────────────────────────────────

ALTER TABLE public.geofences
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#4F46E5',
  ADD COLUMN IF NOT EXISTS alert_on_enter BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS alert_on_exit BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS public.geofence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES public.officers(id) ON DELETE CASCADE,
  geofence_id UUID NOT NULL REFERENCES public.geofences(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('enter', 'exit')),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofence_events_officer
  ON public.geofence_events(officer_id, occurred_at DESC);

-- ─── Geography sync triggers ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_location_geography()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'officer_locations' THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    NEW.updated_at := NOW();
  ELSIF TG_TABLE_NAME = 'officer_location_events' THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSIF TG_TABLE_NAME = 'officer_dwells' THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_officer_locations_geo ON public.officer_locations;
CREATE TRIGGER trg_sync_officer_locations_geo
  BEFORE INSERT OR UPDATE ON public.officer_locations
  FOR EACH ROW EXECUTE FUNCTION public.sync_location_geography();

DROP TRIGGER IF EXISTS trg_sync_location_events_geo ON public.officer_location_events;
CREATE TRIGGER trg_sync_location_events_geo
  BEFORE INSERT OR UPDATE ON public.officer_location_events
  FOR EACH ROW EXECUTE FUNCTION public.sync_location_geography();

DROP TRIGGER IF EXISTS trg_sync_dwells_geo ON public.officer_dwells;
CREATE TRIGGER trg_sync_dwells_geo
  BEFORE INSERT OR UPDATE ON public.officer_dwells
  FOR EACH ROW EXECUTE FUNCTION public.sync_location_geography();

-- Sync officer_locations when officers.current_latitude updates (backward compat)
CREATE OR REPLACE FUNCTION public.sync_officer_locations_from_officers()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_latitude IS NOT NULL AND NEW.current_longitude IS NOT NULL THEN
    INSERT INTO public.officer_locations (
      officer_id, latitude, longitude, last_seen_at, is_online, updated_at
    ) VALUES (
      NEW.id,
      NEW.current_latitude::double precision,
      NEW.current_longitude::double precision,
      COALESCE(NEW.last_location_update, NOW()),
      true,
      NOW()
    )
    ON CONFLICT (officer_id) DO UPDATE SET
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      last_seen_at = EXCLUDED.last_seen_at,
      is_online = true,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_officer_locations_from_officers ON public.officers;
CREATE TRIGGER trg_sync_officer_locations_from_officers
  AFTER INSERT OR UPDATE OF current_latitude, current_longitude, last_location_update
  ON public.officers
  FOR EACH ROW EXECUTE FUNCTION public.sync_officer_locations_from_officers();

-- Dwell detection on location event insert
CREATE OR REPLACE FUNCTION public.process_officer_dwell_on_event()
RETURNS TRIGGER AS $$
DECLARE
  v_tracking public.officer_dwell_tracking%ROWTYPE;
  v_dist DOUBLE PRECISION;
  v_duration_min INTEGER;
  v_is_moving BOOLEAN;
BEGIN
  v_is_moving := COALESCE(NEW.is_moving, false) OR COALESCE(NEW.speed, 0) > 0.5;

  SELECT * INTO v_tracking FROM public.officer_dwell_tracking WHERE officer_id = NEW.officer_id;

  IF v_is_moving THEN
    IF v_tracking.officer_id IS NOT NULL THEN
      v_dist := ST_Distance(
        ST_SetSRID(ST_MakePoint(v_tracking.longitude, v_tracking.latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(NEW.longitude::double precision, NEW.latitude::double precision), 4326)::geography
      );
      IF v_dist <= 50 THEN
        v_duration_min := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NEW.recorded_at - v_tracking.started_at)) / 60))::integer;
        IF v_duration_min >= 5 THEN
          UPDATE public.officer_dwells
          SET departed_at = NEW.recorded_at, duration_minutes = v_duration_min
          WHERE officer_id = NEW.officer_id AND departed_at IS NULL;
        END IF;
      END IF;
      DELETE FROM public.officer_dwell_tracking WHERE officer_id = NEW.officer_id;
    END IF;
    RETURN NEW;
  END IF;

  IF v_tracking.officer_id IS NULL THEN
    INSERT INTO public.officer_dwell_tracking (officer_id, latitude, longitude, started_at)
    VALUES (NEW.officer_id, NEW.latitude::double precision, NEW.longitude::double precision, NEW.recorded_at);
  ELSE
    v_dist := ST_Distance(
      ST_SetSRID(ST_MakePoint(v_tracking.longitude, v_tracking.latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(NEW.longitude::double precision, NEW.latitude::double precision), 4326)::geography
    );
    IF v_dist > 50 THEN
      v_duration_min := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NEW.recorded_at - v_tracking.started_at)) / 60))::integer;
      IF v_duration_min >= 5 THEN
        UPDATE public.officer_dwells
        SET departed_at = NEW.recorded_at, duration_minutes = v_duration_min
        WHERE officer_id = NEW.officer_id AND departed_at IS NULL;
      END IF;
      UPDATE public.officer_dwell_tracking
      SET latitude = NEW.latitude::double precision,
          longitude = NEW.longitude::double precision,
          started_at = NEW.recorded_at
      WHERE officer_id = NEW.officer_id;
    ELSE
      v_duration_min := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NEW.recorded_at - v_tracking.started_at)) / 60))::integer;
      IF v_duration_min >= 5 AND NOT EXISTS (
        SELECT 1 FROM public.officer_dwells
        WHERE officer_id = NEW.officer_id AND departed_at IS NULL
      ) THEN
        INSERT INTO public.officer_dwells (
          officer_id, latitude, longitude, radius_metres, arrived_at, date
        ) VALUES (
          NEW.officer_id,
          v_tracking.latitude,
          v_tracking.longitude,
          50,
          v_tracking.started_at,
          (NEW.recorded_at AT TIME ZONE 'Asia/Kolkata')::date
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_process_officer_dwell ON public.officer_location_events;
CREATE TRIGGER trg_process_officer_dwell
  AFTER INSERT ON public.officer_location_events
  FOR EACH ROW EXECUTE FUNCTION public.process_officer_dwell_on_event();

-- Backfill officer_locations from existing officers data
INSERT INTO public.officer_locations (officer_id, latitude, longitude, last_seen_at, is_online, updated_at)
SELECT
  id,
  current_latitude::double precision,
  current_longitude::double precision,
  COALESCE(last_location_update, NOW()),
  true,
  NOW()
FROM public.officers
WHERE current_latitude IS NOT NULL AND current_longitude IS NOT NULL
ON CONFLICT (officer_id) DO NOTHING;

-- Backfill geography on existing location events
UPDATE public.officer_location_events
SET location = ST_SetSRID(ST_MakePoint(longitude::double precision, latitude::double precision), 4326)::geography
WHERE location IS NULL;

-- ─── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.officer_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officer_dwells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officer_daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officer_dwell_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY officer_locations_admin ON public.officer_locations
  FOR SELECT USING (public.is_admin_user());
CREATE POLICY officer_locations_officer ON public.officer_locations
  FOR ALL USING (officer_id = public.current_officer_id());

CREATE POLICY officer_dwells_admin ON public.officer_dwells
  FOR SELECT USING (public.is_admin_user());
CREATE POLICY officer_dwells_officer ON public.officer_dwells
  FOR SELECT USING (officer_id = public.current_officer_id());

CREATE POLICY officer_daily_activity_admin ON public.officer_daily_activity
  FOR SELECT USING (public.is_admin_user());
CREATE POLICY officer_daily_activity_officer ON public.officer_daily_activity
  FOR SELECT USING (officer_id = public.current_officer_id());

CREATE POLICY geofence_events_admin ON public.geofence_events
  FOR SELECT USING (public.is_admin_user());
CREATE POLICY geofence_events_officer_insert ON public.geofence_events
  FOR INSERT WITH CHECK (officer_id = public.current_officer_id());
CREATE POLICY geofence_events_officer_select ON public.geofence_events
  FOR SELECT USING (officer_id = public.current_officer_id());

CREATE POLICY officer_dwell_tracking_officer ON public.officer_dwell_tracking
  FOR ALL USING (officer_id = public.current_officer_id());

-- Service role / edge functions use service key; daily activity upsert via admin policy
CREATE POLICY officer_daily_activity_service ON public.officer_daily_activity
  FOR ALL USING (public.is_admin_user());

-- ─── Realtime ──────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'officer_locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.officer_locations;
  END IF;
END $$;
