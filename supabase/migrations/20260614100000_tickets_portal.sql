-- Ticket Portal: dedicated tickets module (separate from service_requests kanban)

CREATE TABLE IF NOT EXISTS public.ticket_number_sequences (
  year INT PRIMARY KEY,
  last_number INT NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year INT := EXTRACT(YEAR FROM NOW())::INT;
  next_number INT;
BEGIN
  INSERT INTO public.ticket_number_sequences (year, last_number)
  VALUES (current_year, 0)
  ON CONFLICT (year) DO NOTHING;

  UPDATE public.ticket_number_sequences
  SET last_number = last_number + 1
  WHERE year = current_year
  RETURNING last_number INTO next_number;

  RETURN 'TKT-' || current_year::TEXT || '-' || LPAD(next_number::TEXT, 5, '0');
END;
$$;

CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  address TEXT,
  city TEXT,
  complaint_type TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN (
    'Open', 'In Progress', 'Awaiting Customer', 'Awaiting Parts',
    'Resolved', 'Closed', 'Reopened'
  )),
  source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN (
    'admin', 'walk_in', 'phone_call', 'email', 'portal'
  )),
  description TEXT NOT NULL,
  assigned_officer_id UUID REFERENCES public.officers(id) ON DELETE SET NULL,
  assigned_officer_name TEXT,
  assigned_officer_role TEXT,
  assigned_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_by_admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by_admin_name TEXT NOT NULL,
  linked_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,
  linked_request_number TEXT,
  customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  resolution_summary TEXT,
  customer_notified BOOLEAN NOT NULL DEFAULT FALSE,
  sla_response_deadline TIMESTAMPTZ NOT NULL,
  sla_resolution_deadline TIMESTAMPTZ NOT NULL,
  sla_response_breached BOOLEAN NOT NULL DEFAULT FALSE,
  sla_resolution_breached BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_officer ON public.tickets(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_linked_request ON public.tickets(linked_request_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at DESC);

CREATE TABLE IF NOT EXISTS public.ticket_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  performed_by_role TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_activity_events_ticket ON public.ticket_activity_events(ticket_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS public.ticket_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT '',
  is_internal BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_internal_notes_ticket ON public.ticket_internal_notes(ticket_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.portal_ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  note_id UUID REFERENCES public.ticket_internal_notes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'other',
  uploaded_by TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.tickets_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_updated_at ON public.tickets;
CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.tickets_set_updated_at();

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_number_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_tickets ON public.tickets
  FOR ALL USING (public.is_admin());

CREATE POLICY officers_view_assigned_tickets ON public.tickets
  FOR SELECT USING (
    assigned_officer_id IN (
      SELECT id FROM public.officers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY officers_update_assigned_tickets ON public.tickets
  FOR UPDATE USING (
    assigned_officer_id IN (
      SELECT id FROM public.officers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY admin_all_ticket_activity ON public.ticket_activity_events
  FOR ALL USING (public.is_admin());

CREATE POLICY officers_view_ticket_activity ON public.ticket_activity_events
  FOR SELECT USING (
    ticket_id IN (
      SELECT t.id FROM public.tickets t
      JOIN public.officers o ON o.id = t.assigned_officer_id
      WHERE o.user_id = auth.uid()
    )
  );

CREATE POLICY admin_all_ticket_notes ON public.ticket_internal_notes
  FOR ALL USING (public.is_admin());

CREATE POLICY officers_view_ticket_notes ON public.ticket_internal_notes
  FOR SELECT USING (
    ticket_id IN (
      SELECT t.id FROM public.tickets t
      JOIN public.officers o ON o.id = t.assigned_officer_id
      WHERE o.user_id = auth.uid()
    )
  );

CREATE POLICY admin_all_portal_ticket_attachments ON public.portal_ticket_attachments
  FOR ALL USING (public.is_admin());

CREATE POLICY admin_ticket_number_sequences ON public.ticket_number_sequences
  FOR ALL USING (public.is_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
