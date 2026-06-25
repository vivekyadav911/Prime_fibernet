-- Fix: users_officer_assigned_read leaked customer PII to any authenticated user.
--
-- The "open collection pool" branch (role='customer' AND assigned_officer_id IS NULL
-- AND claimed_by_officer_id IS NULL) evaluated TRUE for non-officers because
-- current_officer_id() returns NULL for them, exposing every unassigned customer's
-- name/email/phone to other customers. Gate the entire policy behind an officer check
-- so only real officers can read the open pool; customers fall back to users_select_self
-- (own row only) and admins remain covered by admin_all_users.

DROP POLICY IF EXISTS users_officer_assigned_read ON public.users;

CREATE POLICY users_officer_assigned_read ON public.users
  FOR SELECT USING (
    current_officer_id() IS NOT NULL
    AND (
      assigned_officer_id = current_officer_id()
      OR (
        COALESCE(role, 'customer')::text = 'customer'
        AND assigned_officer_id IS NULL
        AND (claimed_by_officer_id IS NULL OR claimed_by_officer_id = current_officer_id())
      )
    )
  );
