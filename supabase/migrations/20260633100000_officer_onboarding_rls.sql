-- Officer onboarding: one row per officer, admin-managed RLS

-- Keep the latest onboarding row per officer before enforcing uniqueness.
DELETE FROM public.officer_onboarding o1
USING public.officer_onboarding o2
WHERE o1.officer_id IS NOT NULL
  AND o1.officer_id = o2.officer_id
  AND o1.id <> o2.id
  AND COALESCE(o1.updated_at, o1.created_at, 'epoch'::timestamptz)
    < COALESCE(o2.updated_at, o2.created_at, 'epoch'::timestamptz);

CREATE UNIQUE INDEX IF NOT EXISTS idx_officer_onboarding_officer_id_unique
  ON public.officer_onboarding(officer_id);

ALTER TABLE public.officer_onboarding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS officer_onboarding_admin ON public.officer_onboarding;
CREATE POLICY officer_onboarding_admin ON public.officer_onboarding
  FOR ALL
  USING (public.is_admin_user() OR public.is_admin())
  WITH CHECK (public.is_admin_user() OR public.is_admin());

-- Align officers admin policy with is_admin_user() for admins-table-only accounts
DROP POLICY IF EXISTS admin_all_officers ON public.officers;
CREATE POLICY admin_all_officers ON public.officers
  FOR ALL
  USING (public.is_admin_user() OR public.is_admin())
  WITH CHECK (public.is_admin_user() OR public.is_admin());
