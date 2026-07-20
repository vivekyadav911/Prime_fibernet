-- Allow assigned officers to insert activity notes on their tickets (location updates, notes).
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
