-- Enterprise support workflow: tickets ↔ requests ↔ customers graph, canonical views, activity parity

-- ============================================================
-- 1. Request numbers (human-readable, collision-safe)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.request_number_sequences (
  year INT PRIMARY KEY,
  last_number INT NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.generate_request_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year INT := EXTRACT(YEAR FROM NOW())::INT;
  next_number INT;
BEGIN
  INSERT INTO public.request_number_sequences (year, last_number)
  VALUES (current_year, 0)
  ON CONFLICT (year) DO NOTHING;

  UPDATE public.request_number_sequences
  SET last_number = last_number + 1
  WHERE year = current_year
  RETURNING last_number INTO next_number;

  RETURN 'REQ-' || current_year::TEXT || '-' || LPAD(next_number::TEXT, 5, '0');
END;
$$;

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS request_number TEXT,
  ADD COLUMN IF NOT EXISTS linked_ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS officer_name TEXT,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_requests_request_number
  ON public.service_requests(request_number)
  WHERE request_number IS NOT NULL;

-- Backfill request_number in creation order
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id FROM public.service_requests
    WHERE request_number IS NULL
    ORDER BY created_at ASC NULLS LAST, id ASC
  LOOP
    UPDATE public.service_requests
    SET request_number = public.generate_request_number()
    WHERE id = rec.id;
  END LOOP;
END;
$$;

ALTER TABLE public.service_requests
  ALTER COLUMN request_number SET NOT NULL;

CREATE OR REPLACE FUNCTION public.service_requests_set_request_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    NEW.request_number := public.generate_request_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS service_requests_set_request_number ON public.service_requests;
CREATE TRIGGER service_requests_set_request_number
  BEFORE INSERT ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.service_requests_set_request_number();

-- ============================================================
-- 2. Tickets: plan_id, ad-hoc contact flag
-- ============================================================
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_ad_hoc_contact BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill plan_id from active subscription when customer_id is set
UPDATE public.tickets t
SET plan_id = s.plan_id
FROM public.subscriptions s
WHERE t.plan_id IS NULL
  AND t.customer_id IS NOT NULL
  AND s.user_id = t.customer_id
  AND s.status = 'active';

-- ============================================================
-- 3. request_activities: align with ticket_activity_events schema
-- ============================================================
ALTER TABLE public.request_activities
  ADD COLUMN IF NOT EXISTS actor_name TEXT,
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS performed_by_role TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

-- Migrate legacy note-only rows
UPDATE public.request_activities
SET
  actor_name = COALESCE(actor_name, 'System'),
  action = COALESCE(action, 'note_added')
WHERE actor_name IS NULL OR action IS NULL;

-- Backfill denormalized customer/plan on service_requests from users graph
UPDATE public.service_requests r
SET
  user_name = COALESCE(r.user_name, u.name),
  user_email = COALESCE(r.user_email, u.email),
  user_phone = COALESCE(r.user_phone, u.phone),
  city = COALESCE(r.city, u.city),
  address = COALESCE(r.address, u.address, r.location_address),
  location_address = COALESCE(r.location_address, u.address, r.address)
FROM public.users u
WHERE r.user_id = u.id
  AND (
    r.user_name IS NULL
    OR r.user_email IS NULL
    OR r.user_phone IS NULL
    OR (r.plan_id IS NULL AND r.user_id IS NOT NULL)
  );

UPDATE public.service_requests r
SET plan_id = s.plan_id
FROM public.subscriptions s
WHERE r.plan_id IS NULL
  AND r.user_id IS NOT NULL
  AND s.user_id = r.user_id
  AND s.status = 'active';

-- Backfill officer_name on requests
UPDATE public.service_requests r
SET officer_name = COALESCE(r.officer_name, o.full_name, u.name)
FROM public.officers o
LEFT JOIN public.users u ON u.id = o.user_id
WHERE r.officer_id = o.id
  AND r.officer_name IS NULL;

-- Sync linked_ticket_id from tickets.linked_request_id
UPDATE public.service_requests r
SET linked_ticket_id = t.id
FROM public.tickets t
WHERE t.linked_request_id = r.id
  AND r.linked_ticket_id IS DISTINCT FROM t.id;

-- ============================================================
-- 4. Shared activity logging function
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_support_activity(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action TEXT,
  p_description TEXT,
  p_actor_name TEXT DEFAULT 'System',
  p_actor_role TEXT DEFAULT '',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_entity_type = 'ticket' THEN
    INSERT INTO public.ticket_activity_events (
      ticket_id, type, description, performed_by, performed_by_role, metadata, timestamp
    ) VALUES (
      p_entity_id, p_action, p_description, p_actor_name, p_actor_role, p_metadata, NOW()
    )
    RETURNING id INTO v_id;
  ELSIF p_entity_type = 'request' THEN
    INSERT INTO public.request_activities (
      request_id, action, note, actor_name, performed_by_role, metadata, created_at
    ) VALUES (
      p_entity_id, p_action, p_description, p_actor_name, p_actor_role, p_metadata, NOW()
    )
    RETURNING id INTO v_id;
  ELSE
    RAISE EXCEPTION 'Unknown entity_type: %', p_entity_type;
  END IF;

  RETURN v_id;
END;
$$;

-- ============================================================
-- 5. Request change triggers: activity + assignment/status sync
-- ============================================================
CREATE OR REPLACE FUNCTION public.service_requests_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor TEXT;
  v_officer_name TEXT;
BEGIN
  v_actor := COALESCE(NEW.officer_name, 'System');

  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_support_activity(
      'request', NEW.id, 'created',
      'Request ' || COALESCE(NEW.request_number, NEW.id::text) || ' created',
      COALESCE(NEW.user_name, 'System'), 'system'
    );
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.log_support_activity(
      'request', NEW.id, 'status_updated',
      'Status changed from ' || COALESCE(OLD.status, 'unknown') || ' to ' || NEW.status,
      v_actor, 'officer'
    );

    -- Request completed → linked ticket toward Resolved
    IF NEW.status IN ('resolved', 'completed') THEN
      UPDATE public.tickets
      SET
        status = CASE
          WHEN status IN ('Closed') THEN status
          ELSE 'Resolved'
        END,
        resolved_at = COALESCE(resolved_at, NOW()),
        updated_at = NOW()
      WHERE linked_request_id = NEW.id
        AND status NOT IN ('Closed', 'Resolved');

      IF NEW.linked_ticket_id IS NOT NULL THEN
        UPDATE public.tickets
        SET
          status = CASE WHEN status IN ('Closed') THEN status ELSE 'Resolved' END,
          resolved_at = COALESCE(resolved_at, NOW()),
          updated_at = NOW()
        WHERE id = NEW.linked_ticket_id
          AND status NOT IN ('Closed', 'Resolved');
      END IF;
    END IF;
  END IF;

  IF NEW.officer_id IS DISTINCT FROM OLD.officer_id THEN
    SELECT COALESCE(o.full_name, u.name, 'Officer')
    INTO v_officer_name
    FROM public.officers o
    LEFT JOIN public.users u ON u.id = o.user_id
    WHERE o.id = NEW.officer_id;

    IF OLD.officer_id IS NULL AND NEW.officer_id IS NOT NULL THEN
      PERFORM public.log_support_activity(
        'request', NEW.id, 'officer_assigned',
        COALESCE(v_officer_name, 'Officer') || ' assigned to request',
        v_actor, 'admin'
      );
    ELSIF NEW.officer_id IS NOT NULL THEN
      PERFORM public.log_support_activity(
        'request', NEW.id, 'officer_reassigned',
        'Reassigned to ' || COALESCE(v_officer_name, 'Officer'),
        v_actor, 'admin'
      );
    END IF;

    -- Sync officer to linked ticket
    UPDATE public.tickets
    SET
      assigned_officer_id = NEW.officer_id,
      assigned_officer_name = COALESCE(v_officer_name, assigned_officer_name),
      assigned_at = COALESCE(assigned_at, NOW()),
      updated_at = NOW()
    WHERE linked_request_id = NEW.id
       OR id = NEW.linked_ticket_id;

    IF NEW.linked_ticket_id IS NOT NULL THEN
      PERFORM public.log_support_activity(
        'ticket', NEW.linked_ticket_id, 'officer_assigned',
        COALESCE(v_officer_name, 'Officer') || ' assigned via linked request',
        v_actor, 'system'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS service_requests_audit ON public.service_requests;
CREATE TRIGGER service_requests_audit
  AFTER INSERT OR UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.service_requests_audit_trigger();

-- Ticket status/officer sync back to linked request
CREATE OR REPLACE FUNCTION public.tickets_linked_sync_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_officer_name TEXT;
BEGIN
  IF NEW.linked_request_id IS NULL AND OLD.linked_request_id IS NULL
     AND NEW.assigned_officer_id IS NOT DISTINCT FROM OLD.assigned_officer_id
     AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.linked_request_id IS NOT NULL THEN
    UPDATE public.service_requests
    SET linked_ticket_id = NEW.id
    WHERE id = NEW.linked_request_id
      AND linked_ticket_id IS DISTINCT FROM NEW.id;
  END IF;

  IF NEW.assigned_officer_id IS DISTINCT FROM OLD.assigned_officer_id AND NEW.linked_request_id IS NOT NULL THEN
    SELECT COALESCE(o.full_name, u.name, NEW.assigned_officer_name, 'Officer')
    INTO v_officer_name
    FROM public.officers o
    LEFT JOIN public.users u ON u.id = o.user_id
    WHERE o.id = NEW.assigned_officer_id;

    UPDATE public.service_requests
    SET
      officer_id = NEW.assigned_officer_id,
      officer_name = COALESCE(v_officer_name, officer_name),
      assigned_at = COALESCE(assigned_at, NOW()),
      status = CASE WHEN status = 'pending' THEN 'assigned' ELSE status END,
      updated_at = NOW()
    WHERE id = NEW.linked_request_id;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.linked_request_id IS NOT NULL THEN
    IF NEW.status IN ('Resolved', 'Closed') THEN
      UPDATE public.service_requests
      SET status = 'resolved', completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()
      WHERE id = NEW.linked_request_id
        AND status NOT IN ('resolved', 'completed', 'cancelled');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_linked_sync ON public.tickets;
CREATE TRIGGER tickets_linked_sync
  AFTER INSERT OR UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.tickets_linked_sync_trigger();

-- Seed activity for existing requests that moved through workflow without logs
INSERT INTO public.request_activities (request_id, action, note, actor_name, created_at)
SELECT
  r.id,
  'status_updated',
  'Migrated: request is ' || r.status,
  COALESCE(r.officer_name, 'System'),
  COALESCE(r.updated_at, r.created_at, NOW())
FROM public.service_requests r
WHERE NOT EXISTS (
  SELECT 1 FROM public.request_activities ra WHERE ra.request_id = r.id
);

-- ============================================================
-- 6. Canonical support_items_view (tickets + orphan requests)
-- ============================================================
CREATE OR REPLACE VIEW public.support_items_view
WITH (security_invoker = true)
AS
SELECT
  'ticket'::text AS item_kind,
  t.id AS ticket_id,
  t.ticket_number,
  t.status AS ticket_status,
  t.priority AS ticket_priority,
  t.linked_request_id,
  r.id AS request_id,
  r.request_number,
  r.status AS request_status,
  COALESCE(t.customer_id, r.user_id) AS customer_id,
  COALESCE(u.name, r.user_name, t.contact_name) AS customer_name,
  COALESCE(u.email, r.user_email, t.contact_email) AS customer_email,
  COALESCE(u.phone, r.user_phone, t.contact_phone) AS customer_phone,
  COALESCE(u.address, r.location_address, r.address, t.address) AS customer_address,
  COALESCE(t.plan_id, r.plan_id) AS plan_id,
  p.name AS plan_name,
  COALESCE(p.is_active, TRUE) AS plan_is_active,
  COALESCE(t.assigned_officer_id, r.officer_id) AS officer_id,
  COALESCE(t.assigned_officer_name, r.officer_name, o.full_name, ou.name) AS officer_name,
  COALESCE(t.assigned_officer_role, o.roles->>0, 'Field Technician') AS officer_role,
  t.created_at AS ticket_created_at,
  r.created_at AS request_created_at,
  GREATEST(t.updated_at, r.updated_at) AS updated_at
FROM public.tickets t
LEFT JOIN public.service_requests r ON r.id = t.linked_request_id
LEFT JOIN public.users u ON u.id = COALESCE(t.customer_id, r.user_id)
LEFT JOIN public.plans p ON p.id = COALESCE(t.plan_id, r.plan_id)
LEFT JOIN public.officers o ON o.id = COALESCE(t.assigned_officer_id, r.officer_id)
LEFT JOIN public.users ou ON ou.id = o.user_id

UNION ALL

SELECT
  'request'::text AS item_kind,
  NULL::uuid AS ticket_id,
  NULL::text AS ticket_number,
  NULL::text AS ticket_status,
  NULL::text AS ticket_priority,
  NULL::uuid AS linked_request_id,
  r.id AS request_id,
  r.request_number,
  r.status AS request_status,
  r.user_id AS customer_id,
  COALESCE(u.name, r.user_name) AS customer_name,
  COALESCE(u.email, r.user_email) AS customer_email,
  COALESCE(u.phone, r.user_phone) AS customer_phone,
  COALESCE(u.address, r.location_address, r.address) AS customer_address,
  r.plan_id,
  p.name AS plan_name,
  COALESCE(p.is_active, TRUE) AS plan_is_active,
  r.officer_id AS officer_id,
  COALESCE(r.officer_name, o.full_name, ou.name) AS officer_name,
  COALESCE(o.roles->>0, 'Field Technician') AS officer_role,
  NULL::timestamptz AS ticket_created_at,
  r.created_at AS request_created_at,
  r.updated_at AS updated_at
FROM public.service_requests r
LEFT JOIN public.tickets t ON t.linked_request_id = r.id
LEFT JOIN public.users u ON u.id = r.user_id
LEFT JOIN public.plans p ON p.id = r.plan_id
LEFT JOIN public.officers o ON o.id = r.officer_id
LEFT JOIN public.users ou ON ou.id = o.user_id
WHERE t.id IS NULL;

GRANT SELECT ON public.support_items_view TO authenticated;

-- ============================================================
-- 7. RLS for new sequence table
-- ============================================================
ALTER TABLE public.request_number_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS request_number_sequences_admin ON public.request_number_sequences;
CREATE POLICY request_number_sequences_admin ON public.request_number_sequences
  FOR ALL USING (public.is_admin());
