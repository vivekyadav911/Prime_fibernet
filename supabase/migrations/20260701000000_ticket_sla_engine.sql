-- Ticket SLA engine: frozen status columns, live view, triggers, backfill

-- ============================================================
-- 1. Schema additions
-- ============================================================
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS response_sla_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (response_sla_status IN ('pending', 'met', 'breached', 'na')),
  ADD COLUMN IF NOT EXISTS resolution_sla_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (resolution_sla_status IN ('pending', 'met', 'breached', 'na'));

-- Backfill responded_at from legacy first_response_at
UPDATE public.tickets
SET responded_at = first_response_at
WHERE responded_at IS NULL AND first_response_at IS NOT NULL;

-- Seed status columns from legacy booleans where already decided
UPDATE public.tickets
SET response_sla_status = CASE
  WHEN responded_at IS NOT NULL THEN
    CASE WHEN responded_at <= sla_response_deadline THEN 'met' ELSE 'breached' END
  WHEN sla_response_breached THEN 'breached'
  ELSE response_sla_status
END
WHERE response_sla_status = 'pending'
  AND (responded_at IS NOT NULL OR sla_response_breached);

UPDATE public.tickets
SET resolution_sla_status = CASE
  WHEN resolved_at IS NOT NULL THEN
    CASE WHEN resolved_at <= sla_resolution_deadline THEN 'met' ELSE 'breached' END
  WHEN closed_at IS NOT NULL AND status = 'Closed' THEN
    CASE WHEN COALESCE(resolved_at, closed_at) <= sla_resolution_deadline THEN 'met' ELSE 'breached' END
  WHEN sla_resolution_breached THEN 'breached'
  ELSE resolution_sla_status
END
WHERE resolution_sla_status = 'pending'
  AND (resolved_at IS NOT NULL OR closed_at IS NOT NULL OR sla_resolution_breached);

-- ============================================================
-- 2. Helpers
-- ============================================================
CREATE OR REPLACE FUNCTION public.ticket_resolution_hours(p_priority TEXT)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT resolution_hours FROM public.sla_policies WHERE priority = p_priority AND is_active LIMIT 1),
    CASE p_priority
      WHEN 'Critical' THEN 2
      WHEN 'High' THEN 4
      WHEN 'Medium' THEN 24
      WHEN 'Low' THEN 72
      ELSE 24
    END
  );
$$;

CREATE OR REPLACE FUNCTION public.ticket_response_hours(p_priority TEXT)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT first_response_hours FROM public.sla_policies WHERE priority = p_priority AND is_active LIMIT 1),
    CASE p_priority
      WHEN 'Critical' THEN 0.5
      WHEN 'High' THEN 1
      WHEN 'Medium' THEN 4
      WHEN 'Low' THEN 8
      ELSE 4
    END
  );
$$;

CREATE OR REPLACE FUNCTION public.tickets_record_first_response(p_ticket public.tickets)
RETURNS public.tickets
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_at TIMESTAMPTZ := NOW();
BEGIN
  IF p_ticket.responded_at IS NOT NULL THEN
    RETURN p_ticket;
  END IF;

  p_ticket.responded_at := v_at;
  p_ticket.first_response_at := COALESCE(p_ticket.first_response_at, v_at);

  IF p_ticket.responded_at <= p_ticket.sla_response_deadline THEN
    p_ticket.response_sla_status := 'met';
    p_ticket.sla_response_breached := FALSE;
  ELSE
    p_ticket.response_sla_status := 'breached';
    p_ticket.sla_response_breached := TRUE;
  END IF;

  RETURN p_ticket;
END;
$$;

CREATE OR REPLACE FUNCTION public.tickets_evaluate_resolution(
  p_ticket public.tickets,
  p_event_at TIMESTAMPTZ
)
RETURNS public.tickets
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF p_ticket.resolution_sla_status NOT IN ('pending') THEN
    RETURN p_ticket;
  END IF;

  IF p_event_at <= p_ticket.sla_resolution_deadline THEN
    p_ticket.resolution_sla_status := 'met';
    p_ticket.sla_resolution_breached := FALSE;
  ELSE
    p_ticket.resolution_sla_status := 'breached';
    p_ticket.sla_resolution_breached := TRUE;
  END IF;

  RETURN p_ticket;
END;
$$;

CREATE OR REPLACE FUNCTION public.tickets_insert_activity(
  p_ticket_id UUID,
  p_type TEXT,
  p_description TEXT,
  p_performed_by TEXT,
  p_performed_by_role TEXT DEFAULT '',
  p_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ticket_activity_events (
    ticket_id, type, description, performed_by, performed_by_role, timestamp
  ) VALUES (
    p_ticket_id, p_type, p_description, p_performed_by, p_performed_by_role, p_at
  );
END;
$$;

-- ============================================================
-- 3. Triggers — first response & resolution on ticket updates
-- ============================================================
CREATE OR REPLACE FUNCTION public.tickets_sla_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor TEXT;
  v_role TEXT;
  v_resolution_at TIMESTAMPTZ;
BEGIN
  v_actor := COALESCE(NEW.assigned_officer_name, NEW.created_by_admin_name, 'System');
  v_role := COALESCE(NEW.assigned_officer_role, 'Admin');

  -- First response: leaving Open/Reopened, or first assignment
  IF NEW.responded_at IS NULL AND (
    (OLD.status = 'Open' AND NEW.status <> 'Open')
    OR (OLD.status = 'Reopened' AND NEW.status NOT IN ('Open', 'Reopened'))
    OR (OLD.assigned_officer_id IS NULL AND NEW.assigned_officer_id IS NOT NULL)
  ) THEN
    NEW := public.tickets_record_first_response(NEW);
    PERFORM public.tickets_insert_activity(
      NEW.id,
      'status_changed',
      'First response recorded at ' || to_char(NEW.responded_at, 'YYYY-MM-DD HH24:MI'),
      v_actor,
      v_role,
      NEW.responded_at
    );
  END IF;

  -- Resolved
  IF NEW.status = 'Resolved' AND OLD.status <> 'Resolved' THEN
    IF NEW.resolved_at IS NULL THEN
      NEW.resolved_at := NOW();
    END IF;
    NEW := public.tickets_evaluate_resolution(NEW, NEW.resolved_at);
    PERFORM public.tickets_insert_activity(
      NEW.id,
      'resolved',
      'Ticket resolved',
      v_actor,
      v_role,
      NEW.resolved_at
    );
  END IF;

  -- Closed (lock resolution SLA if still pending)
  IF NEW.status = 'Closed' AND OLD.status <> 'Closed' THEN
    IF NEW.closed_at IS NULL THEN
      NEW.closed_at := NOW();
    END IF;
    v_resolution_at := COALESCE(NEW.resolved_at, NEW.closed_at);
    IF NEW.resolution_sla_status = 'pending' THEN
      NEW := public.tickets_evaluate_resolution(NEW, v_resolution_at);
    END IF;
    PERFORM public.tickets_insert_activity(
      NEW.id,
      'closed',
      'Ticket closed',
      v_actor,
      v_role,
      NEW.closed_at
    );
  END IF;

  -- Reopened: preserve response history, re-arm resolution SLA
  IF NEW.status = 'Reopened' AND OLD.status IN ('Resolved', 'Closed') THEN
    NEW.resolved_at := NULL;
    NEW.closed_at := NULL;
    NEW.resolution_sla_status := 'pending';
    NEW.sla_resolution_breached := FALSE;
    NEW.sla_resolution_deadline :=
      NOW() + (public.ticket_resolution_hours(NEW.priority) || ' hours')::INTERVAL;
    PERFORM public.tickets_insert_activity(
      NEW.id,
      'reopened',
      'Ticket reopened — resolution SLA re-armed until '
        || to_char(NEW.sla_resolution_deadline, 'YYYY-MM-DD HH24:MI'),
      v_actor,
      v_role,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_sla_before_update ON public.tickets;
CREATE TRIGGER tickets_sla_before_update
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.tickets_sla_before_update();

CREATE OR REPLACE FUNCTION public.tickets_sla_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_officer_id IS NOT NULL AND NEW.responded_at IS NULL THEN
    NEW.assigned_at := COALESCE(NEW.assigned_at, NOW());
    NEW := public.tickets_record_first_response(NEW);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_sla_before_insert ON public.tickets;
CREATE TRIGGER tickets_sla_before_insert
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.tickets_sla_before_insert();

-- First internal note counts as first response
CREATE OR REPLACE FUNCTION public.ticket_notes_first_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.tickets%ROWTYPE;
  v_actor TEXT;
  v_role TEXT;
BEGIN
  SELECT * INTO v_ticket FROM public.tickets WHERE id = NEW.ticket_id FOR UPDATE;
  IF v_ticket.responded_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_actor := NEW.author_name;
  v_role := NEW.author_role;

  UPDATE public.tickets
  SET
    responded_at = NOW(),
    first_response_at = COALESCE(first_response_at, NOW()),
    response_sla_status = CASE
      WHEN NOW() <= sla_response_deadline THEN 'met' ELSE 'breached' END,
    sla_response_breached = NOW() > sla_response_deadline,
    updated_at = NOW()
  WHERE id = NEW.ticket_id;

  PERFORM public.tickets_insert_activity(
    NEW.ticket_id,
    'note_added',
    'First response via internal note',
    v_actor,
    v_role,
    NOW()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ticket_notes_first_response ON public.ticket_internal_notes;
CREATE TRIGGER ticket_notes_first_response
  AFTER INSERT ON public.ticket_internal_notes
  FOR EACH ROW EXECUTE FUNCTION public.ticket_notes_first_response();

-- ============================================================
-- 4. Live SLA view (canonical read surface)
-- ============================================================
CREATE OR REPLACE VIEW public.ticket_sla_live AS
SELECT
  t.*,
  CASE
    WHEN t.response_sla_status <> 'pending' THEN t.response_sla_status
    WHEN NOW() > t.sla_response_deadline THEN 'breached'
    ELSE 'pending'
  END AS response_sla_live,
  CASE
    WHEN t.resolution_sla_status <> 'pending' THEN t.resolution_sla_status
    WHEN NOW() > t.sla_resolution_deadline THEN 'breached'
    ELSE 'pending'
  END AS resolution_sla_live
FROM public.tickets t;

GRANT SELECT ON public.ticket_sla_live TO authenticated;
GRANT SELECT ON public.ticket_sla_live TO service_role;

-- ============================================================
-- 5. Dashboard stats view (open breaches only)
-- ============================================================
CREATE OR REPLACE VIEW public.support_dashboard_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'Open') AS open_tickets,
  COUNT(*) FILTER (WHERE status = 'In Progress') AS in_progress_tickets,
  COUNT(*) FILTER (WHERE status IN ('Resolved', 'Closed')) AS resolved_tickets,
  COUNT(*) FILTER (
    WHERE status NOT IN ('Resolved', 'Closed')
      AND (
        response_sla_live = 'breached'
        OR resolution_sla_live = 'breached'
      )
  ) AS sla_breaches,
  COUNT(*) FILTER (
    WHERE status NOT IN ('Resolved', 'Closed')
      AND resolution_sla_live = 'breached'
  ) AS overdue_tickets,
  ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) FILTER (WHERE resolved_at IS NOT NULL), 2)
    AS avg_resolution_hours,
  ROUND(AVG(csat_score) FILTER (WHERE csat_score IS NOT NULL), 2) AS avg_csat_score,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS tickets_today,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS tickets_this_week,
  COUNT(DISTINCT assigned_officer_id) FILTER (
    WHERE status NOT IN ('Resolved', 'Closed') AND assigned_officer_id IS NOT NULL
  ) AS officers_with_assignments
FROM public.ticket_sla_live;

-- ============================================================
-- 6. Backfill from activity timeline (dry-run capable)
-- ============================================================
CREATE OR REPLACE FUNCTION public.backfill_ticket_sla(p_dry_run BOOLEAN DEFAULT TRUE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_responded_at TIMESTAMPTZ;
  v_resolved_at TIMESTAMPTZ;
  v_closed_at TIMESTAMPTZ;
  v_response_status TEXT;
  v_resolution_status TEXT;
  changes JSONB := '[]'::JSONB;
  v_change JSONB;
BEGIN
  FOR r IN SELECT * FROM public.tickets ORDER BY created_at LOOP
    v_responded_at := r.responded_at;
    v_resolved_at := r.resolved_at;
    v_closed_at := r.closed_at;

    IF v_responded_at IS NULL THEN
      SELECT MIN(e.timestamp) INTO v_responded_at
      FROM public.ticket_activity_events e
      WHERE e.ticket_id = r.id
        AND e.type IN ('status_changed', 'officer_assigned', 'note_added')
        AND e.description NOT ILIKE '%created%';
    END IF;

    IF v_responded_at IS NULL AND r.assigned_at IS NOT NULL THEN
      v_responded_at := r.assigned_at;
    END IF;

    IF v_resolved_at IS NULL THEN
      SELECT MIN(e.timestamp) INTO v_resolved_at
      FROM public.ticket_activity_events e
      WHERE e.ticket_id = r.id AND e.type = 'resolved';
    END IF;

    IF v_closed_at IS NULL THEN
      SELECT MIN(e.timestamp) INTO v_closed_at
      FROM public.ticket_activity_events e
      WHERE e.ticket_id = r.id AND e.type = 'closed';
    END IF;

    v_response_status := r.response_sla_status;
    IF v_responded_at IS NOT NULL THEN
      v_response_status := CASE
        WHEN v_responded_at <= r.sla_response_deadline THEN 'met' ELSE 'breached' END;
    ELSIF r.status IN ('Resolved', 'Closed') AND v_responded_at IS NULL THEN
      -- Closed without explicit response: use created_at as fallback only if status left Open
      v_responded_at := COALESCE(r.assigned_at, r.created_at);
      v_response_status := CASE
        WHEN v_responded_at <= r.sla_response_deadline THEN 'met' ELSE 'breached' END;
    END IF;

    v_resolution_status := r.resolution_sla_status;
    IF v_resolved_at IS NOT NULL THEN
      v_resolution_status := CASE
        WHEN v_resolved_at <= r.sla_resolution_deadline THEN 'met' ELSE 'breached' END;
    ELSIF r.status = 'Closed' AND v_closed_at IS NOT NULL THEN
      v_resolution_status := CASE
        WHEN COALESCE(v_resolved_at, v_closed_at) <= r.sla_resolution_deadline THEN 'met' ELSE 'breached' END;
    END IF;

    IF v_responded_at IS DISTINCT FROM r.responded_at
      OR v_resolved_at IS DISTINCT FROM r.resolved_at
      OR v_closed_at IS DISTINCT FROM r.closed_at
      OR v_response_status IS DISTINCT FROM r.response_sla_status
      OR v_resolution_status IS DISTINCT FROM r.resolution_sla_status
    THEN
      v_change := jsonb_build_object(
        'ticket_number', r.ticket_number,
        'responded_at', v_responded_at,
        'resolved_at', v_resolved_at,
        'closed_at', v_closed_at,
        'response_sla_status', v_response_status,
        'resolution_sla_status', v_resolution_status
      );
      changes := changes || jsonb_build_array(v_change);

      IF NOT p_dry_run THEN
        UPDATE public.tickets
        SET
          responded_at = v_responded_at,
          first_response_at = COALESCE(first_response_at, v_responded_at),
          resolved_at = COALESCE(v_resolved_at, resolved_at),
          closed_at = COALESCE(v_closed_at, closed_at),
          response_sla_status = v_response_status,
          resolution_sla_status = v_resolution_status,
          sla_response_breached = (v_response_status = 'breached'),
          sla_resolution_breached = (v_resolution_status = 'breached')
        WHERE id = r.id;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'dry_run', p_dry_run,
    'change_count', jsonb_array_length(changes),
    'changes', changes
  );
END;
$$;

-- Run backfill immediately (not dry-run)
SELECT public.backfill_ticket_sla(FALSE);
