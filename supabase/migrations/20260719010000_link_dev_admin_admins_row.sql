-- Ensure the seed JWT admin (dev-admin@prime.local) has a public.admins row
-- so imports and other admin-scoped features can record performed_by.

INSERT INTO public.admins (id, name, email, role, is_active, auth_user_id)
VALUES (
  '11111111-1111-1111-1111-111111111103',
  'Dev Admin',
  'dev-admin@prime.local',
  'admin',
  true,
  '11111111-1111-1111-1111-111111111103'
)
ON CONFLICT (email) DO UPDATE
SET
  auth_user_id = EXCLUDED.auth_user_id,
  is_active = true,
  updated_at = now();
