-- Fix officer ticket claim: officers.full_name (not name), activity insert under SECURITY DEFINER,
-- and allow claim even when activity note insert is blocked.

CREATE OR REPLACE FUNCTION public.claim_officer_ticket(p_ticket_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_officer_id uuid;
  v_officer_name text;
  v_ticket RECORD;
BEGIN
  v_officer_id := public.current_officer_id();
  IF v_officer_id IS NULL THEN
    RAISE EXCEPTION 'Officer access required';
  END IF;

  SELECT COALESCE(NULLIF(trim(o.full_name), ''), NULLIF(trim(o.email), ''), 'Officer')
  INTO v_officer_name
  FROM public.officers o
  WHERE o.id = v_officer_id;

  SELECT t.id, t.ticket_number, t.status, t.assigned_officer_id
  INTO v_ticket
  FROM public.tickets t
  WHERE t.id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  IF v_ticket.status IN ('Resolved', 'Closed') THEN
    RAISE EXCEPTION 'Closed tickets cannot be claimed';
  END IF;

  IF v_ticket.assigned_officer_id IS NOT NULL THEN
    IF v_ticket.assigned_officer_id = v_officer_id THEN
      RETURN jsonb_build_object(
        'ticket_id', p_ticket_id,
        'already_assigned', true,
        'claimed', true
      );
    END IF;
    RAISE EXCEPTION 'Ticket already assigned to another officer';
  END IF;

  UPDATE public.tickets
  SET
    assigned_officer_id = v_officer_id,
    assigned_officer_name = COALESCE(v_officer_name, 'Officer'),
    assigned_officer_role = COALESCE(assigned_officer_role, 'Field Technician'),
    assigned_at = NOW(),
    updated_at = NOW()
  WHERE id = p_ticket_id;

  -- ponytail: claim must succeed even if activity insert is blocked by RLS
  BEGIN
    INSERT INTO public.ticket_activity_events (
      ticket_id,
      type,
      description,
      performed_by,
      performed_by_role,
      metadata,
      timestamp
    ) VALUES (
      p_ticket_id,
      'officer_assigned',
      format('Officer self-assigned ticket %s from open pool', COALESCE(v_ticket.ticket_number, p_ticket_id::text)),
      COALESCE(v_officer_name, 'Officer'),
      'Officer',
      jsonb_build_object('officer_id', v_officer_id, 'source', 'open_pool'),
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'ticket_id', p_ticket_id,
    'claimed', true,
    'assigned', true
  );
END;
$function$;

-- Allow officers to claim unassigned open tickets (direct update path / WITH CHECK).
DROP POLICY IF EXISTS officers_update_assigned_tickets ON public.tickets;
CREATE POLICY officers_update_assigned_tickets ON public.tickets
  FOR UPDATE
  USING (
    public.current_officer_id() IS NOT NULL
    AND (
      assigned_officer_id = public.current_officer_id()
      OR (
        assigned_officer_id IS NULL
        AND status NOT IN ('Resolved', 'Closed')
      )
    )
  )
  WITH CHECK (
    public.current_officer_id() IS NOT NULL
    AND assigned_officer_id = public.current_officer_id()
  );

-- After claim, officers can insert activity on tickets they own.
DROP POLICY IF EXISTS officers_insert_ticket_activity ON public.ticket_activity_events;
CREATE POLICY officers_insert_ticket_activity ON public.ticket_activity_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tickets t
      WHERE t.id = ticket_id
        AND public.current_officer_id() IS NOT NULL
        AND t.assigned_officer_id = public.current_officer_id()
    )
  );
