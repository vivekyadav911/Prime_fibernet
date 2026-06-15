-- Officer dashboard stats RPC (single call for 4 stat tiles)

CREATE OR REPLACE FUNCTION public.get_officer_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  oid UUID := public.current_officer_id();
BEGIN
  IF oid IS NULL THEN
    RETURN json_build_object(
      'new_requests', 0,
      'active_requests', 0,
      'resolved_today', 0,
      'collections_today', 0
    );
  END IF;

  RETURN json_build_object(
    'new_requests', (
      SELECT COUNT(*)::INT FROM service_requests
      WHERE officer_id = oid AND status IN ('pending', 'assigned')
    ),
    'active_requests', (
      SELECT COUNT(*)::INT FROM service_requests
      WHERE officer_id = oid AND status IN ('working', 'in_transit', 'on_site', 'accepted')
    ),
    'resolved_today', (
      SELECT COUNT(*)::INT FROM service_requests
      WHERE officer_id = oid AND status = 'resolved'
        AND DATE(COALESCE(completed_at, updated_at, created_at)) = CURRENT_DATE
    ),
    'collections_today', (
      SELECT COALESCE(SUM(total_amount), 0)::NUMERIC FROM payments
      WHERE collected_by = oid
        AND DATE(COALESCE(paid_at, confirmed_at, created_at)) = CURRENT_DATE
        AND status IN ('cash_collected', 'confirmed')
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_officer_dashboard_stats() TO authenticated;
