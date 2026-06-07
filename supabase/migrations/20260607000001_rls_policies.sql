-- INFRA-004: Row Level Security policies

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_fcm_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;

-- Helper: admin check via JWT metadata (align with Supabase auth.users app_metadata.role)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin',
    false
  );
$$ LANGUAGE sql STABLE;

-- Plans: public read for active plans
CREATE POLICY plans_public_read ON plans FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY users_select_self ON users FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY users_update_self ON users FOR UPDATE USING (auth.uid() = id OR public.is_admin());

CREATE POLICY customers_own_payments ON user_payments FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY customers_own_subscriptions ON subscriptions FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY customers_own_requests ON service_requests FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY customers_create_requests ON service_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY officers_view_assigned_requests ON service_requests FOR SELECT USING (
  officer_id IN (SELECT id FROM officers WHERE user_id = auth.uid()) OR public.is_admin()
);

CREATE POLICY officers_update_assigned_requests ON service_requests FOR UPDATE USING (
  officer_id IN (SELECT id FROM officers WHERE user_id = auth.uid()) OR public.is_admin()
);

CREATE POLICY officer_own_shifts ON shifts FOR SELECT USING (
  officer_id IN (SELECT id FROM officers WHERE user_id = auth.uid()) OR public.is_admin()
);

CREATE POLICY officer_insert_shifts ON shifts FOR INSERT WITH CHECK (
  officer_id IN (SELECT id FROM officers WHERE user_id = auth.uid()) OR public.is_admin()
);

CREATE POLICY user_fcm_tokens_own ON user_fcm_tokens FOR ALL USING (auth.uid() = user_id);

CREATE POLICY audit_logs_admin_read ON audit_logs FOR SELECT USING (public.is_admin());

CREATE POLICY payslips_officer_read ON payslips FOR SELECT USING (
  officer_id IN (SELECT id FROM officers WHERE user_id = auth.uid()) OR public.is_admin()
);

CREATE POLICY leave_requests_officer ON leave_requests FOR ALL USING (
  officer_id IN (SELECT id FROM officers WHERE user_id = auth.uid()) OR public.is_admin()
);
