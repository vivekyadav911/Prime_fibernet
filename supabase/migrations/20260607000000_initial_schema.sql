-- INFRA-005: Initial schema (Prime Fibernet v2.0)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  phone VARCHAR,
  name VARCHAR NOT NULL,
  role VARCHAR CHECK (role IN ('customer', 'officer', 'admin')) DEFAULT 'customer',
  is_blocked BOOLEAN DEFAULT false,
  notification_prefs JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS officers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  region VARCHAR,
  availability_status VARCHAR DEFAULT 'offline',
  last_active_at TIMESTAMPTZ,
  salary_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  speed_mbps INTEGER,
  price DECIMAL,
  validity_days INTEGER,
  features TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id),
  start_at DATE,
  end_at DATE,
  status VARCHAR CHECK (status IN ('active', 'expired', 'cancelled')) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  officer_id UUID REFERENCES officers(id),
  request_type VARCHAR CHECK (request_type IN ('installation', 'repair', 'upgrade', 'complaint')),
  status VARCHAR DEFAULT 'pending',
  priority VARCHAR CHECK (priority IN ('P0', 'P1', 'P2', 'P3')) DEFAULT 'P2',
  address TEXT,
  description TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  is_escalated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS request_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
  officer_id UUID REFERENCES officers(id),
  note TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL,
  payment_method VARCHAR,
  payment_status VARCHAR CHECK (payment_status IN ('success', 'failed', 'refunded')),
  transaction_id TEXT UNIQUE,
  refund_amount DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID REFERENCES officers(id) ON DELETE CASCADE,
  shift_date DATE,
  start_time TIME,
  end_time TIME,
  status VARCHAR DEFAULT 'scheduled',
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  location GEOGRAPHY(POINT, 4326)
);

CREATE TABLE IF NOT EXISTS inventory_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID,
  assigned_to_id UUID,
  assigned_to_type VARCHAR,
  status VARCHAR CHECK (status IN ('assigned', 'returned', 'damaged')) DEFAULT 'assigned',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor_id UUID REFERENCES users(id),
  actor_role VARCHAR,
  action VARCHAR NOT NULL,
  target_entity VARCHAR,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  status VARCHAR CHECK (status IN ('SUCCESS', 'FAILURE'))
);

CREATE TABLE IF NOT EXISTS user_fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform VARCHAR DEFAULT 'mobile',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, token)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID REFERENCES officers(id) ON DELETE CASCADE,
  leave_type VARCHAR,
  start_date DATE,
  end_date DATE,
  reason TEXT,
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID REFERENCES officers(id) ON DELETE CASCADE,
  month DATE,
  base DECIMAL,
  bonuses DECIMAL,
  deductions DECIMAL,
  net_pay DECIMAL,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_token_blacklist (
  token_hash TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_totp_secrets (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  secret_encrypted TEXT NOT NULL,
  backup_codes TEXT[],
  enabled BOOLEAN DEFAULT false
);
