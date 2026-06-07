-- Enterprise legacy: admin helpers, merged auth trigger, storage buckets

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins a
    WHERE a.auth_user_id = auth.uid() AND COALESCE(a.is_active, TRUE)
  )
  OR public.is_admin();
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated, anon;

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
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'user'), '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role;

  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_company_settings()
RETURNS TABLE (
  company_name text,
  company_email text,
  company_phone text,
  company_address text,
  company_city text,
  company_state text,
  company_country text,
  company_website text,
  company_gstin text,
  language text,
  currency text,
  currency_symbol text,
  timezone text,
  date_format text,
  time_format text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    gs.company_name, gs.company_email, gs.company_phone, gs.company_address,
    gs.company_city, gs.company_state, gs.company_country, gs.company_website,
    gs.company_gstin, gs.language, gs.currency, gs.currency_symbol,
    gs.timezone, gs.date_format, gs.time_format
  FROM public.general_settings gs
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_company_settings() TO anon, authenticated;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('officer-documents', 'officer-documents', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('user-profiles', 'user-profiles', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('invoices', 'invoices', false, 10485760, ARRAY['application/pdf']),
  ('payslips', 'payslips', true, 10485760, ARRAY['application/pdf']),
  ('admin-backups', 'admin-backups', false, 104857600, ARRAY['application/sql', 'application/octet-stream', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on new legacy tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin_user());
CREATE POLICY company_info_public_read ON public.company_info FOR SELECT USING (true);
CREATE POLICY faqs_public_read ON public.faqs FOR SELECT USING (is_published = true OR public.is_admin_user());
CREATE POLICY general_settings_admin ON public.general_settings FOR ALL USING (public.is_admin_user());
CREATE POLICY admins_admin_only ON public.admins FOR ALL USING (public.is_admin_user());

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
