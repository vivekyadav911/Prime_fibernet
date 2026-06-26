-- Officers must be able to write their own audit entries (e.g. cash collection)
-- but must never read other users' entries. This policy is INSERT-only and
-- restricted by actor_role so an officer cannot insert entries claiming a different role.
CREATE POLICY audit_logs_officer_insert ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (actor_role = 'officer');
