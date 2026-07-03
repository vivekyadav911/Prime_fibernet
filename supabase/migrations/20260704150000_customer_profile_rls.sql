-- Customer profile: users RLS via auth_user_id + avatar storage on user-profiles bucket

DROP POLICY IF EXISTS users_select_self ON public.users;
CREATE POLICY users_select_self ON public.users
  FOR SELECT USING (
    auth.uid() = id
    OR auth.uid() = auth_user_id
    OR public.is_admin()
  );

DROP POLICY IF EXISTS users_update_self ON public.users;
CREATE POLICY users_update_self ON public.users
  FOR UPDATE USING (
    auth.uid() = id
    OR auth.uid() = auth_user_id
    OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = id
    OR auth.uid() = auth_user_id
    OR public.is_admin()
  );

DROP POLICY IF EXISTS user_profiles_public_read ON storage.objects;
CREATE POLICY user_profiles_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'user-profiles');

DROP POLICY IF EXISTS user_profiles_customer_insert ON storage.objects;
CREATE POLICY user_profiles_customer_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-profiles'
    AND (storage.foldername(name))[1] = public.current_customer_user_id()::text
  );

DROP POLICY IF EXISTS user_profiles_customer_update ON storage.objects;
CREATE POLICY user_profiles_customer_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user-profiles'
    AND (storage.foldername(name))[1] = public.current_customer_user_id()::text
  );

DROP POLICY IF EXISTS user_profiles_customer_delete ON storage.objects;
CREATE POLICY user_profiles_customer_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-profiles'
    AND (storage.foldername(name))[1] = public.current_customer_user_id()::text
  );
