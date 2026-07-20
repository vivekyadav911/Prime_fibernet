-- commit_import_batch is service-role only (called from import-excel edge function)
REVOKE ALL ON FUNCTION public.commit_import_batch(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.commit_import_batch(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.commit_import_batch(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.commit_import_batch(uuid) TO service_role;
