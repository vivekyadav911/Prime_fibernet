-- Allow import commit (SECURITY DEFINER, no admin JWT) to update officers
CREATE OR REPLACE FUNCTION public.guard_officer_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name text;
  v_photo text;
  v_phone text;
BEGIN
  IF current_setting('app.import_commit', true) = '1' THEN
    RETURN NEW;
  END IF;

  IF public.is_admin_user() OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  v_full_name := NEW.full_name;
  v_photo := NEW.profile_photo_url;
  v_phone := NEW.phone;

  NEW := OLD;
  NEW.full_name := v_full_name;
  NEW.profile_photo_url := v_photo;
  NEW.phone := v_phone;
  NEW.updated_at := now();

  RETURN NEW;
END;
$function$;
