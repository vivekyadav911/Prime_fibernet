-- Fix admin detection: honour public.users.role and admins table, not only JWT metadata.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE (u.id = auth.uid() OR u.auth_user_id = auth.uid())
        AND u.role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.admins a
      WHERE a.auth_user_id = auth.uid()
        AND COALESCE(a.is_active, TRUE)
    );
$$;

-- Link legacy admin rows to auth accounts when IDs already match.
UPDATE public.users
SET auth_user_id = id
WHERE role = 'admin'
  AND auth_user_id IS NULL
  AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = public.users.id);

UPDATE public.users u
SET auth_user_id = au.id
FROM auth.users au
WHERE u.role = 'admin'
  AND u.auth_user_id IS NULL
  AND lower(u.email) = lower(au.email);
