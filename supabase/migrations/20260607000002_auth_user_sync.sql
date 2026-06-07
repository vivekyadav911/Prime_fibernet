-- Sync auth.users to public.users on signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, 'user'), '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY plans_anon_read ON plans FOR SELECT TO anon USING (is_active = true);

CREATE POLICY admin_all_users ON users FOR ALL USING (public.is_admin());
CREATE POLICY admin_all_officers ON officers FOR ALL USING (public.is_admin());
CREATE POLICY admin_all_requests ON service_requests FOR ALL USING (public.is_admin());
CREATE POLICY admin_manage_plans ON plans FOR ALL USING (public.is_admin());
