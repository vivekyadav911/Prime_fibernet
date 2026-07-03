-- Customer ticket timeline: get_customer_id alias, activity RLS, realtime, in-app notifications

CREATE OR REPLACE FUNCTION public.get_customer_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_customer_user_id();
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_id() TO authenticated;

-- Customers can read activity on their own tickets (non-internal notes filtered in app)
DROP POLICY IF EXISTS ticket_activity_customer_select ON public.ticket_activity_events;
CREATE POLICY ticket_activity_customer_select ON public.ticket_activity_events
  FOR SELECT USING (
    ticket_id IN (
      SELECT t.id FROM public.tickets t
      WHERE t.customer_id = public.current_customer_user_id()
    )
  );

-- In-app notification when staff updates a ticket
CREATE OR REPLACE FUNCTION public.notify_customer_ticket_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_auth_id UUID;
  v_ticket_number TEXT;
  v_title TEXT;
  v_body TEXT;
BEGIN
  IF NEW.type = 'created' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.performed_by_role, '') ILIKE '%customer%' THEN
    RETURN NEW;
  END IF;

  IF NEW.type = 'note_added' AND COALESCE((NEW.metadata->>'internal')::boolean, false) THEN
    RETURN NEW;
  END IF;

  SELECT t.customer_id, t.ticket_number
  INTO v_customer_id, v_ticket_number
  FROM public.tickets t
  WHERE t.id = NEW.ticket_id;

  IF v_customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT u.auth_user_id INTO v_auth_id
  FROM public.users u
  WHERE u.id = v_customer_id;

  IF v_auth_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_title := CASE NEW.type
    WHEN 'officer_assigned' THEN 'Officer assigned to your ticket'
    WHEN 'officer_reassigned' THEN 'Ticket reassigned'
    WHEN 'status_changed' THEN 'Ticket status updated'
    WHEN 'resolved' THEN 'Ticket resolved'
    WHEN 'closed' THEN 'Ticket closed'
    WHEN 'reopened' THEN 'Ticket reopened'
    ELSE 'Ticket update'
  END;

  v_body := COALESCE(NULLIF(NEW.description, ''), v_title);
  IF v_ticket_number IS NOT NULL THEN
    v_body := v_ticket_number || ': ' || v_body;
  END IF;

  INSERT INTO public.portal_notifications (
    recipient_auth_id,
    type,
    category,
    title,
    body,
    action_url,
    data
  ) VALUES (
    v_auth_id,
    'ticket_update',
    'ticket',
    v_title,
    v_body,
    '/customer/tickets/' || NEW.ticket_id::text,
    jsonb_build_object(
      'ticket_id', NEW.ticket_id,
      'event_type', NEW.type,
      'event_id', NEW.id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_customer_ticket_activity ON public.ticket_activity_events;
CREATE TRIGGER trg_notify_customer_ticket_activity
  AFTER INSERT ON public.ticket_activity_events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_customer_ticket_activity();

-- Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ticket_activity_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_activity_events;
  END IF;
END $$;
