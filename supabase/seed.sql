-- INFRA-005: Development seed data

INSERT INTO plans (id, name, speed_mbps, price, validity_days, features, is_active) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'Basic 50', 50, 499, 30, ARRAY['Unlimited data', '24/7 support'], true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02', 'Standard 100', 100, 799, 30, ARRAY['Unlimited data', 'OTT bundle'], true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa03', 'Premium 200', 200, 1299, 30, ARRAY['Unlimited data', 'Static IP', 'Priority support'], true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.general_settings (id, company_name, company_email, company_phone, payment_gateway)
SELECT '99999999-9999-9999-9999-999999999901', 'Prime Fibernet', 'support@primefibernet.local', '+91-9876543210', 'easybuzz'
WHERE NOT EXISTS (SELECT 1 FROM public.general_settings LIMIT 1);

INSERT INTO public.company_info (company_name, tagline)
SELECT 'Prime Fibernet', 'Fast. Reliable. Connected.'
WHERE NOT EXISTS (SELECT 1 FROM public.company_info LIMIT 1);

-- Auth users: run `node scripts/seed-dev-users.mjs` after migrations
