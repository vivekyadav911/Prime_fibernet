-- Customer Support System: extend tickets/faqs, add live chat, complaints, SLA, canned responses

-- ============================================================
-- 1a. Extend tickets table
-- ============================================================
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS sub_category TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_level INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS csat_score INTEGER CHECK (csat_score IS NULL OR (csat_score BETWEEN 1 AND 5)),
  ADD COLUMN IF NOT EXISTS csat_comment TEXT,
  ADD COLUMN IF NOT EXISTS csat_sent_at TIMESTAMPTZ;

-- ============================================================
-- 1b. FAQ categories + extend faqs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.faq_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT NOT NULL DEFAULT '#5B4FCF',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.faq_categories (name, slug, sort_order) VALUES
  ('Billing & Payment',   'billing',      1),
  ('Technical Support',   'technical',    2),
  ('Plans & Upgrades',    'plans',        3),
  ('Installation',        'installation', 4),
  ('Account Management',  'account',      5),
  ('Hardware & Equipment','hardware',     6),
  ('Speed & Performance', 'speed',        7),
  ('Outage & Downtime',   'outage',       8)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.faqs
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.faq_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS helpful_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS not_helpful_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.officers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.officers(id) ON DELETE SET NULL;

-- Migrate legacy category text to category_id
UPDATE public.faqs f
SET category_id = fc.id
FROM public.faq_categories fc
WHERE f.category_id IS NULL
  AND f.category IS NOT NULL
  AND (
    LOWER(REPLACE(f.category, ' ', '-')) = fc.slug
    OR LOWER(f.category) = LOWER(fc.name)
  );

UPDATE public.faqs
SET published_at = COALESCE(published_at, updated_at, created_at)
WHERE is_published = TRUE AND published_at IS NULL;

-- ============================================================
-- 1c. Live chat
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.chat_status AS ENUM ('waiting', 'active', 'resolved', 'missed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  account_number TEXT,
  agent_id UUID REFERENCES public.officers(id) ON DELETE SET NULL,
  agent_name TEXT,
  status public.chat_status NOT NULL DEFAULT 'waiting',
  channel TEXT NOT NULL DEFAULT 'app',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  wait_time_seconds INTEGER,
  duration_seconds INTEGER,
  linked_ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  csat_score INTEGER CHECK (csat_score IS NULL OR (csat_score BETWEEN 1 AND 5)),
  csat_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('agent', 'customer', 'system', 'bot')),
  sender_id UUID,
  sender_name TEXT NOT NULL,
  message TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  attachment_url TEXT,
  attachment_name TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON public.chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_agent ON public.chat_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id, created_at);

CREATE TABLE IF NOT EXISTS public.agent_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.officers(id) ON DELETE CASCADE UNIQUE,
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  is_available BOOLEAN NOT NULL DEFAULT FALSE,
  active_chat_count INTEGER NOT NULL DEFAULT 0,
  max_concurrent_chats INTEGER NOT NULL DEFAULT 3,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Complaints + interactions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.complaint_number_sequences (
  year INT PRIMARY KEY,
  last_number INT NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.generate_complaint_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year INT := EXTRACT(YEAR FROM NOW())::INT;
  next_number INT;
BEGIN
  INSERT INTO public.complaint_number_sequences (year, last_number)
  VALUES (current_year, 0)
  ON CONFLICT (year) DO NOTHING;

  UPDATE public.complaint_number_sequences
  SET last_number = last_number + 1
  WHERE year = current_year
  RETURNING last_number INTO next_number;

  RETURN 'CMP-' || current_year::TEXT || '-' || LPAD(next_number::TEXT, 5, '0');
END;
$$;

CREATE TABLE IF NOT EXISTS public.customer_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  account_number TEXT,
  complaint_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'normal' CHECK (severity IN ('normal', 'serious', 'regulatory')),
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'investigating', 'resolved', 'escalated')),
  assigned_to UUID REFERENCES public.officers(id) ON DELETE SET NULL,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  linked_ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  notes TEXT,
  duration_minutes INTEGER,
  agent_id UUID REFERENCES public.officers(id) ON DELETE SET NULL,
  linked_ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  linked_chat_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_customer ON public.customer_complaints(customer_id);
CREATE INDEX IF NOT EXISTS idx_interactions_customer ON public.customer_interactions(customer_id, created_at DESC);

-- ============================================================
-- SLA policies + breaches + canned responses
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sla_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  priority TEXT NOT NULL UNIQUE CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  first_response_hours NUMERIC NOT NULL,
  resolution_hours NUMERIC NOT NULL,
  escalation_after_hours NUMERIC,
  escalate_to_level INTEGER NOT NULL DEFAULT 1,
  notify_agent BOOLEAN NOT NULL DEFAULT TRUE,
  notify_supervisor BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.sla_policies (name, priority, first_response_hours, resolution_hours, escalation_after_hours) VALUES
  ('Critical SLA', 'Critical', 0.5, 2, 1),
  ('High SLA',     'High',     1,   4, 3),
  ('Medium SLA',   'Medium',   4,   24, 20),
  ('Low SLA',      'Low',      8,   72, 60)
ON CONFLICT (priority) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.sla_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  breach_type TEXT NOT NULL CHECK (breach_type IN ('first_response', 'resolution')),
  priority TEXT,
  breached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  minutes_overdue INTEGER,
  notified_agents TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  shortcut TEXT UNIQUE,
  body TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.officers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.canned_responses (title, shortcut, body, category) VALUES
  ('Greeting',           '#hi',      'Hello! Thank you for contacting Prime Fibernet support. How can I assist you today?', 'greeting'),
  ('Router Restart',     '#router',  'Please try restarting your router: 1. Unplug the power cable. 2. Wait 30 seconds. 3. Plug it back in. 4. Wait 2 minutes for the connection to restore. Does this resolve the issue?', 'technical'),
  ('Closing',            '#bye',     'Thank you for contacting Prime Fibernet. Your issue has been noted. Is there anything else I can help you with?', 'closing'),
  ('Speed Test Request', '#speed',   'Could you please run a speed test at www.fast.com and share the results (download speed, upload speed, and ping)?', 'technical'),
  ('Billing Query',      '#bill',    'Your latest invoice details are available in the app under Billing > Invoices. For payment, you can use UPI, net banking, or visit our nearest service centre.', 'billing')
ON CONFLICT (shortcut) DO NOTHING;

-- ============================================================
-- Analytics view
-- ============================================================
CREATE OR REPLACE VIEW public.support_dashboard_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'Open') AS open_tickets,
  COUNT(*) FILTER (WHERE status = 'In Progress') AS in_progress_tickets,
  COUNT(*) FILTER (WHERE status IN ('Resolved', 'Closed')) AS resolved_tickets,
  COUNT(*) FILTER (WHERE sla_resolution_breached = TRUE OR sla_response_breached = TRUE) AS sla_breaches,
  COUNT(*) FILTER (WHERE status NOT IN ('Resolved', 'Closed') AND sla_resolution_deadline < NOW()) AS overdue_tickets,
  ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) FILTER (WHERE resolved_at IS NOT NULL), 2) AS avg_resolution_hours,
  ROUND(AVG(csat_score) FILTER (WHERE csat_score IS NOT NULL), 2) AS avg_csat_score,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS tickets_today,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS tickets_this_week
FROM public.tickets;

-- ============================================================
-- Chat agent assignment trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.assign_chat_agent_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_agent RECORD;
BEGIN
  IF NEW.agent_id IS NOT NULL OR NEW.status != 'waiting' THEN
    RETURN NEW;
  END IF;

  SELECT aa.agent_id, o.full_name
  INTO selected_agent
  FROM public.agent_availability aa
  JOIN public.officers o ON o.id = aa.agent_id
  WHERE aa.is_online = TRUE
    AND aa.is_available = TRUE
    AND aa.active_chat_count < aa.max_concurrent_chats
  ORDER BY aa.active_chat_count ASC, aa.last_seen_at DESC
  LIMIT 1;

  IF selected_agent.agent_id IS NOT NULL THEN
    NEW.agent_id := selected_agent.agent_id;
    NEW.agent_name := selected_agent.full_name;
    NEW.status := 'active';
    NEW.accepted_at := NOW();

    UPDATE public.agent_availability
    SET active_chat_count = active_chat_count + 1,
        last_seen_at = NOW()
    WHERE agent_id = selected_agent.agent_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_sessions_assign_agent ON public.chat_sessions;
CREATE TRIGGER chat_sessions_assign_agent
  BEFORE INSERT ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.assign_chat_agent_on_insert();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_breaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_number_sequences ENABLE ROW LEVEL SECURITY;

-- FAQ categories: public read active, admin full
DROP POLICY IF EXISTS faq_categories_public_read ON public.faq_categories;
CREATE POLICY faq_categories_public_read ON public.faq_categories
  FOR SELECT USING (is_active = TRUE OR public.is_admin_user());

DROP POLICY IF EXISTS faq_categories_admin ON public.faq_categories;
CREATE POLICY faq_categories_admin ON public.faq_categories
  FOR ALL USING (public.is_admin_user());

-- FAQs: extend admin write
DROP POLICY IF EXISTS faqs_admin_write ON public.faqs;
CREATE POLICY faqs_admin_write ON public.faqs
  FOR ALL USING (public.is_admin_user());

-- Chat sessions
DROP POLICY IF EXISTS chat_sessions_admin ON public.chat_sessions;
CREATE POLICY chat_sessions_admin ON public.chat_sessions
  FOR ALL USING (public.is_admin_user());

DROP POLICY IF EXISTS chat_sessions_customer ON public.chat_sessions;
CREATE POLICY chat_sessions_customer ON public.chat_sessions
  FOR ALL USING (
    customer_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid() OR id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_sessions_agent ON public.chat_sessions;
CREATE POLICY chat_sessions_agent ON public.chat_sessions
  FOR ALL USING (
    agent_id IN (
      SELECT id FROM public.officers WHERE user_id = auth.uid() OR auth_user_id = auth.uid()
    )
  );

-- Chat messages
DROP POLICY IF EXISTS chat_messages_admin ON public.chat_messages;
CREATE POLICY chat_messages_admin ON public.chat_messages
  FOR ALL USING (public.is_admin_user());

DROP POLICY IF EXISTS chat_messages_participant ON public.chat_messages;
CREATE POLICY chat_messages_participant ON public.chat_messages
  FOR ALL USING (
    session_id IN (
      SELECT cs.id FROM public.chat_sessions cs
      WHERE cs.customer_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid() OR id = auth.uid())
         OR cs.agent_id IN (SELECT id FROM public.officers WHERE user_id = auth.uid() OR auth_user_id = auth.uid())
    )
  );

-- Agent availability
DROP POLICY IF EXISTS agent_availability_admin ON public.agent_availability;
CREATE POLICY agent_availability_admin ON public.agent_availability
  FOR ALL USING (public.is_admin_user());

DROP POLICY IF EXISTS agent_availability_self ON public.agent_availability;
CREATE POLICY agent_availability_self ON public.agent_availability
  FOR ALL USING (
    agent_id IN (SELECT id FROM public.officers WHERE user_id = auth.uid() OR auth_user_id = auth.uid())
  );

-- Complaints + interactions
DROP POLICY IF EXISTS complaints_admin ON public.customer_complaints;
CREATE POLICY complaints_admin ON public.customer_complaints
  FOR ALL USING (public.is_admin_user());

DROP POLICY IF EXISTS interactions_admin ON public.customer_interactions;
CREATE POLICY interactions_admin ON public.customer_interactions
  FOR ALL USING (public.is_admin_user());

-- SLA + canned
DROP POLICY IF EXISTS sla_policies_admin ON public.sla_policies;
CREATE POLICY sla_policies_admin ON public.sla_policies
  FOR ALL USING (public.is_admin_user());

DROP POLICY IF EXISTS sla_breaches_admin ON public.sla_breaches;
CREATE POLICY sla_breaches_admin ON public.sla_breaches
  FOR ALL USING (public.is_admin_user());

DROP POLICY IF EXISTS canned_responses_admin ON public.canned_responses;
CREATE POLICY canned_responses_admin ON public.canned_responses
  FOR ALL USING (public.is_admin_user());

DROP POLICY IF EXISTS canned_responses_agent_read ON public.canned_responses;
CREATE POLICY canned_responses_agent_read ON public.canned_responses
  FOR SELECT USING (
    is_active = TRUE AND (
      public.is_admin_user()
      OR EXISTS (SELECT 1 FROM public.officers WHERE user_id = auth.uid() OR auth_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS complaint_sequences_admin ON public.complaint_number_sequences;
CREATE POLICY complaint_sequences_admin ON public.complaint_number_sequences
  FOR ALL USING (public.is_admin_user());

-- Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
