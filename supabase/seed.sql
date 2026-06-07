-- INFRA-005: Development seed data

INSERT INTO plans (name, speed_mbps, price, validity_days, features, is_active) VALUES
  ('Basic 50', 50, 499, 30, ARRAY['Unlimited data', '24/7 support'], true),
  ('Standard 100', 100, 799, 30, ARRAY['Unlimited data', 'OTT bundle'], true),
  ('Premium 200', 200, 1299, 30, ARRAY['Unlimited data', 'Static IP', 'Priority support'], true)
ON CONFLICT DO NOTHING;
