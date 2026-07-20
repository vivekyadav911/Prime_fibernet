-- Officer app profile: session-scoped read for the logged-in field officer.

CREATE OR REPLACE FUNCTION public.get_officer_session_profile()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', o.id,
    'full_name', o.full_name,
    'email', COALESCE(NULLIF(TRIM(o.email), ''), u.email),
    'phone', o.phone,
    'employee_id', o.employee_id,
    'designation', orole.name,
    'role_name', orole.name,
    'department', 'Field Operations',
    'region', o.region,
    'zone', o.region,
    'profile_photo_url', o.profile_photo_url,
    'joining_date', o.joining_date,
    'join_date', o.joining_date
  )
  FROM public.officers o
  LEFT JOIN public.users u ON u.id = COALESCE(o.user_id, o.auth_user_id)
  LEFT JOIN public.officer_roles orole ON orole.id = o.role_id
  WHERE o.user_id = auth.uid() OR o.auth_user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_officer_session_profile() TO authenticated;
