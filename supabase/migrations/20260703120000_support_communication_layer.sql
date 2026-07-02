-- Officer↔Admin↔Ticket communication layer fixes

-- 1. Officer RLS: match auth_user_id (same as current_officer_id / getOfficerIdForUser)
DROP POLICY IF EXISTS officers_view_assigned_requests ON public.service_requests;
CREATE POLICY officers_view_assigned_requests ON public.service_requests
  FOR SELECT USING (
    officer_id IN (
      SELECT id FROM public.officers
      WHERE user_id = auth.uid() OR auth_user_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS officers_update_assigned_requests ON public.service_requests;
CREATE POLICY officers_update_assigned_requests ON public.service_requests
  FOR UPDATE USING (
    officer_id IN (
      SELECT id FROM public.officers
      WHERE user_id = auth.uid() OR auth_user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- 2. Sync corrupted officer user names from officers.full_name
UPDATE public.users u
SET name = o.full_name
FROM public.officers o
WHERE o.user_id = u.id
  AND o.full_name IS NOT NULL
  AND trim(o.full_name) <> ''
  AND (
    u.name IS NULL
    OR trim(u.name) = ''
    OR length(trim(u.name)) < length(trim(o.full_name))
    OR u.name ~ '^[A-Z][a-z] [a-z]{1,3}$'
  );

-- 3. Backfill denormalized ticket officer names from canonical officers row
UPDATE public.tickets t
SET
  assigned_officer_name = COALESCE(o.full_name, u.name, t.assigned_officer_name),
  updated_at = NOW()
FROM public.officers o
LEFT JOIN public.users u ON u.id = o.user_id
WHERE t.assigned_officer_id = o.id;

-- 4. Backfill service_requests.officer_name from officers
UPDATE public.service_requests r
SET officer_name = COALESCE(o.full_name, u.name, r.officer_name)
FROM public.officers o
LEFT JOIN public.users u ON u.id = o.user_id
WHERE r.officer_id = o.id;

-- 5. Link orphan New Connection ticket to matching request (same customer job)
UPDATE public.tickets t
SET
  linked_request_id = r.id,
  linked_request_number = r.request_number,
  updated_at = NOW()
FROM public.service_requests r
WHERE t.id = 'cdbf364d-3835-4b2b-999e-0ae577128b31'
  AND r.id = '44444444-4444-4444-4444-444444444402'
  AND t.linked_request_id IS NULL;

-- 6. When ticket↔request are linked, request assignee is canonical for field work
UPDATE public.tickets t
SET
  assigned_officer_id = r.officer_id,
  assigned_officer_name = r.officer_name,
  updated_at = NOW()
FROM public.service_requests r
WHERE t.linked_request_id = r.id
  AND r.officer_id IS NOT NULL
  AND (t.assigned_officer_id IS DISTINCT FROM r.officer_id);

-- 7. Enrich support_items_view with explicit officer name columns
DROP VIEW IF EXISTS public.support_items_view;
CREATE VIEW public.support_items_view
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
  COALESCE(o.full_name, ou.name, t.assigned_officer_name, r.officer_name) AS officer_name,
  o.full_name AS officer_full_name,
  ou.name AS officer_user_name,
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
  COALESCE(o.full_name, ou.name, r.officer_name) AS officer_name,
  o.full_name AS officer_full_name,
  ou.name AS officer_user_name,
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
